/* ============================================================
   Sawa — backend adapter
   ------------------------------------------------------------
   Exposes one async API (window.SawaBackend) used by auth.js and
   chat.js. It runs in one of two modes:

     • "firebase" — real Firebase Auth (email + phone SMS) and
       Cloud Firestore message storage. Active when
       assets/js/firebase-config.js has enabled:true + real keys.

     • "local"    — the localStorage demo (default).

   Both expose identical method signatures that return Promises,
   so the rest of the app never needs to know which is active.
   ============================================================ */
(function () {
  "use strict";

  var S = window.SawaStore;
  var cfg = window.SAWA_FIREBASE || { enabled: false, config: {} };
  var useFirebase = !!(
    cfg.enabled &&
    cfg.config &&
    typeof cfg.config.apiKey === "string" &&
    cfg.config.apiKey.indexOf("PASTE") !== 0 &&
    cfg.config.apiKey.length > 10
  );

  var pending = null; // holds in-progress phone verification

  function reject(code, message) {
    var e = new Error(message); e.code = code; return Promise.reject(e);
  }

  /* ============================================================
     LOCAL backend (localStorage demo)
     ============================================================ */
  function toUser(u) {
    if (!u) return null;
    return { id: u.id, name: u.name, email: u.email || null, phone: u.phone || null, color: u.color || S.colorFor(u.name) };
  }

  var Local = {
    mode: "local",
    isFirebase: false,

    ready: function () { return Promise.resolve(); },

    currentUser: function () { return Promise.resolve(toUser(S.currentUser())); },

    requireUser: function () {
      var u = S.currentUser();
      if (!u) { window.location.replace("index.html"); return new Promise(function () {}); }
      return Promise.resolve(toUser(u));
    },

    signUpEmail: function (d) {
      if (S.findByEmail(d.email)) return reject("email-already-in-use", "An account with this email already exists. Try logging in.");
      var u = S.createUser({ name: d.name, email: d.email, password: d.password });
      S.setSession(u.id);
      return Promise.resolve(toUser(u));
    },

    loginEmail: function (d) {
      var u = S.findByEmail(d.email);
      if (!u) return reject("user-not-found", "No account found for this email.");
      if (!S.checkPassword(u, d.password)) return reject("wrong-password", "Incorrect password.");
      S.setSession(u.id);
      return Promise.resolve(toUser(u));
    },

    sendPhoneCode: function (d) {
      var exists = !!S.findByPhone(d.phoneE164);
      if (d.mode === "signup" && exists) return reject("phone-already-in-use", "An account with this number already exists. Try logging in.");
      if (d.mode === "login" && !exists) return reject("user-not-found", "No account found for this number.");
      var code = String(Math.floor(100000 + Math.random() * 900000));
      pending = { code: code, data: d };
      return Promise.resolve({ demoCode: code });
    },

    confirmPhoneCode: function (code) {
      if (!pending || code !== pending.code) return reject("invalid-code", "That code isn't right. Try again.");
      var d = pending.data; pending = null;
      var u = d.mode === "signup" ? S.createUser({ name: d.name, phone: d.phoneE164 }) : S.findByPhone(d.phoneE164);
      S.setSession(u.id);
      return Promise.resolve(toUser(u));
    },

    logout: function () { S.clearSession(); return Promise.resolve(); },

    loadChats: function (u) { return Promise.resolve(S.getChats(u.id)); },
    saveChats: function (u, chats) { S.saveChats(u.id, chats); return Promise.resolve(); },
  };

  /* ============================================================
     FIREBASE backend
     ============================================================ */
  var fb = null, initP = null, verifier = null;

  function loadFirebase() {
    var base = "https://www.gstatic.com/firebasejs/" + (cfg.sdkVersion || "10.12.0") + "/";
    return Promise.all([
      import(base + "firebase-app.js"),
      import(base + "firebase-auth.js"),
      import(base + "firebase-firestore.js"),
    ]).then(function (mods) {
      var appMod = mods[0], authMod = mods[1], fsMod = mods[2];
      var app = appMod.initializeApp(cfg.config);
      var auth = authMod.getAuth(app);
      var db = fsMod.getFirestore(app);
      fb = { app: app, auth: auth, db: db, a: authMod, f: fsMod };
      return authMod.setPersistence(auth, authMod.browserLocalPersistence).catch(function () {}).then(function () { return fb; });
    });
  }
  function ensureFb() { if (!initP) initP = loadFirebase(); return initP; }

  function toFbUser(u, nameOverride) {
    if (!u) return null;
    var name = nameOverride || u.displayName || (u.email ? u.email.split("@")[0] : "You");
    return { id: u.uid, name: name, email: u.email || null, phone: u.phoneNumber || null, color: S.colorFor(name || u.uid) };
  }

  function mapFbError(e) {
    var code = (e && e.code) || "";
    var map = {
      "auth/email-already-in-use": "An account with this email already exists. Try logging in.",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/user-not-found": "No account found for this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/invalid-verification-code": "That code isn't right. Try again.",
      "auth/code-expired": "That code has expired. Please resend it.",
      "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
      "auth/invalid-phone-number": "Enter a valid UAE mobile number.",
      "auth/billing-not-enabled": "Phone sign-in needs the Firebase Blaze (pay-as-you-go) plan.",
      "auth/operation-not-allowed": "This sign-in method isn't enabled in your Firebase project.",
    };
    var err = new Error(map[code] || (e && e.message) || "Something went wrong. Please try again.");
    err.code = code;
    throw err;
  }

  function ensureUserDoc(u, name) {
    var ref = fb.f.doc(fb.db, "users", u.uid);
    return fb.f.setDoc(ref, {
      name: name || u.displayName || "",
      email: u.email || null,
      phone: u.phoneNumber || null,
    }, { merge: true });
  }

  var Firebase = {
    mode: "firebase",
    isFirebase: true,

    ready: function () { return ensureFb().then(function () {}); },

    currentUser: function () {
      return ensureFb().then(function () {
        return new Promise(function (res) {
          var unsub = fb.a.onAuthStateChanged(fb.auth, function (u) { unsub(); res(toFbUser(u)); });
        });
      });
    },

    requireUser: function () {
      return this.currentUser().then(function (u) {
        if (!u) { window.location.replace("index.html"); return new Promise(function () {}); }
        return u;
      });
    },

    signUpEmail: function (d) {
      return ensureFb().then(function () {
        return fb.a.createUserWithEmailAndPassword(fb.auth, d.email, d.password);
      }).then(function (cred) {
        return fb.a.updateProfile(cred.user, { displayName: d.name })
          .then(function () { return ensureUserDoc(cred.user, d.name); })
          .then(function () { return toFbUser(cred.user, d.name); });
      }).catch(mapFbError);
    },

    loginEmail: function (d) {
      return ensureFb().then(function () {
        return fb.a.signInWithEmailAndPassword(fb.auth, d.email, d.password);
      }).then(function (cred) { return toFbUser(cred.user); }).catch(mapFbError);
    },

    sendPhoneCode: function (d) {
      return ensureFb().then(function () {
        if (!verifier) {
          verifier = new fb.a.RecaptchaVerifier(fb.auth, d.recaptchaContainerId || "recaptcha-container", { size: "invisible" });
        }
        return fb.a.signInWithPhoneNumber(fb.auth, d.phoneE164, verifier);
      }).then(function (confirmation) {
        pending = { confirmation: confirmation, data: d };
        return {}; // no demo code: a real SMS was sent
      }).catch(function (e) {
        // a failed verifier often must be recreated before retrying
        if (verifier && verifier.clear) { try { verifier.clear(); } catch (x) {} verifier = null; }
        return mapFbError(e);
      });
    },

    confirmPhoneCode: function (code) {
      if (!pending || !pending.confirmation) return reject("invalid-code", "Please request a code first.");
      var d = pending.data;
      return pending.confirmation.confirm(code).then(function (cred) {
        pending = null;
        var u = cred.user;
        var isNew = !!(cred._tokenResponse && cred._tokenResponse.isNewUser);
        var step = Promise.resolve();
        if (d.name && (isNew || !u.displayName)) step = fb.a.updateProfile(u, { displayName: d.name });
        return step
          .then(function () { return ensureUserDoc(u, d.name || u.displayName); })
          .then(function () { return toFbUser(u, d.name || u.displayName); });
      }).catch(mapFbError);
    },

    logout: function () { return ensureFb().then(function () { return fb.a.signOut(fb.auth); }); },

    loadChats: function (user) {
      return ensureFb().then(function () {
        var ref = fb.f.doc(fb.db, "chats", user.id);
        return fb.f.getDoc(ref).then(function (snap) {
          var data = snap.exists() ? snap.data() : null;
          if (data && Array.isArray(data.items)) return data.items;
          var seeded = S.defaultChats(user);
          return fb.f.setDoc(ref, { items: seeded, updatedAt: Date.now() }).then(function () { return seeded; });
        });
      });
    },

    saveChats: function (user, chats) {
      return ensureFb().then(function () {
        var ref = fb.f.doc(fb.db, "chats", user.id);
        return fb.f.setDoc(ref, { items: chats, updatedAt: Date.now() });
      }).catch(function (e) { console.error("Sawa: failed to save chats", e); });
    },
  };

  var Backend = useFirebase ? Firebase : Local;
  Backend.useFirebase = useFirebase;
  window.SawaBackend = Backend;

  if (useFirebase) {
    // warm up the SDK so the first sign-in is snappy
    Backend.ready().catch(function (e) { console.error("Sawa: Firebase init failed", e); });
    console.info("Sawa: using Firebase backend (project: " + cfg.config.projectId + ")");
  }
})();
