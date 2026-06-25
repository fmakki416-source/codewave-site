/* ============================================================
   Sawa — client-side data layer (localStorage)
   ------------------------------------------------------------
   ⚠️  DEMO ONLY. There is no server. Accounts, the (fake) OTP
   verification and all messages live in the browser's
   localStorage. Passwords are hashed with a NON-cryptographic
   function purely so they are not stored as plain text — this
   is not real security and must not be used for production.
   ============================================================ */
(function () {
  "use strict";

  var NS = "sawa:";
  var K_USERS = NS + "users";
  var K_SESSION = NS + "session";
  var K_THEME = NS + "theme";
  function kChats(uid) { return NS + "chats:" + uid; }

  /* ---------- low-level storage ---------- */
  function read(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }

  /* ---------- ids / hashing ---------- */
  function rid(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  // Non-cryptographic hash (djb2-xor) — demo only.
  function hash(str) {
    var h = 5381, s = "sawa$" + String(str);
    for (var i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(16);
  }

  /* ---------- avatars ---------- */
  var AVATAR_COLORS = ["#0a8d6b", "#1f8fd0", "#b8742d", "#8e5bd0", "#c0427a", "#3f9b3f", "#cb8a00", "#d65745", "#5a6acb"];
  function colorFor(seed) {
    var s = String(seed || ""), n = 0;
    for (var i = 0; i < s.length; i++) n = (n + s.charCodeAt(i)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[n];
  }
  function initials(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
    var out = parts.map(function (p) { return (p[0] || "").toUpperCase(); }).join("");
    return out || "?";
  }

  /* ---------- UAE phone helpers ---------- */
  // Returns the 9-digit national number (e.g. "501234567") or "".
  function normalizePhone(input) {
    var d = String(input || "").replace(/\D/g, "");
    if (d.indexOf("00971") === 0) d = d.slice(5);
    else if (d.indexOf("971") === 0) d = d.slice(3);
    d = d.replace(/^0+/, "");
    return d;
  }
  function isValidPhone(input) {
    // UAE mobile: 5 followed by 8 digits (50/52/54/55/56/58…).
    return /^5\d{8}$/.test(normalizePhone(input));
  }
  // Full international form, e.g. "+971501234567".
  function phoneE164(input) {
    var d = normalizePhone(input);
    return d ? "+971" + d : "";
  }
  // Pretty form, e.g. "+971 50 123 4567".
  function phonePretty(input) {
    var d = normalizePhone(input);
    if (!/^5\d{8}$/.test(d)) return "+971 " + d;
    return "+971 " + d.replace(/^(\d{2})(\d{3})(\d{4})$/, "$1 $2 $3");
  }

  /* ---------- users ---------- */
  function getUsers() { return read(K_USERS, []); }
  function saveUsers(list) { write(K_USERS, list); }

  function findByEmail(email) {
    var e = String(email || "").trim().toLowerCase();
    return getUsers().filter(function (u) { return u.email === e; })[0] || null;
  }
  function findByPhone(phone) {
    var p = phoneE164(phone);
    return getUsers().filter(function (u) { return u.phone === p; })[0] || null;
  }
  function findById(id) {
    return getUsers().filter(function (u) { return u.id === id; })[0] || null;
  }

  function createUser(data) {
    var users = getUsers();
    var user = {
      id: rid("u"),
      name: String(data.name || "").trim(),
      email: data.email ? String(data.email).trim().toLowerCase() : null,
      phone: data.phone ? phoneE164(data.phone) : null,
      passHash: data.password ? hash(data.password) : null,
      color: colorFor(data.name || data.email || data.phone),
      createdAt: Date.now(),
    };
    users.push(user);
    saveUsers(users);
    seedChats(user);
    return user;
  }

  function checkPassword(user, password) {
    return !!user && user.passHash === hash(password);
  }

  /* ---------- session ---------- */
  function setSession(userId) { write(K_SESSION, { userId: userId, at: Date.now() }); }
  function clearSession() { try { localStorage.removeItem(K_SESSION); } catch (e) {} }
  function currentUser() {
    var s = read(K_SESSION, null);
    return s ? findById(s.userId) : null;
  }

  /* ---------- theme ---------- */
  function getTheme() { try { return localStorage.getItem(K_THEME) === "dark" ? "dark" : "light"; } catch (e) { return "light"; } }
  function setTheme(t) { try { localStorage.setItem(K_THEME, t === "dark" ? "dark" : "light"); } catch (e) {} return getTheme(); }

  /* ---------- chats ---------- */
  function getChats(uid) { return read(kChats(uid), []); }
  function saveChats(uid, chats) { write(kChats(uid), chats); }

  function newMessage(from, text, extra) {
    var m = { id: rid("m"), from: from, text: text, ts: Date.now(), status: from === "me" ? "read" : "received" };
    if (extra) for (var k in extra) m[k] = extra[k];
    return m;
  }

  function makeChat(opts) {
    return {
      id: rid("c"),
      type: opts.type || "contact",
      name: opts.name,
      about: opts.about || "",
      color: opts.color || colorFor(opts.name),
      avatar: opts.avatar || "",
      messages: opts.messages || [],
      lastReadTs: opts.lastReadTs || 0,
      pinned: !!opts.pinned,
    };
  }

  // Friendly demo conversations so a brand-new account is not empty.
  function seedChats(user) {
    var now = Date.now();
    var min = 60 * 1000, hr = 60 * min, day = 24 * hr;
    var first = (user.name || "there").trim().split(/\s+/)[0] || "there";

    var chats = [
      makeChat({
        type: "bot", name: "Sawa Team", about: "Official account", pinned: true,
        color: "#00a884", avatar: "💬",
        messages: [
          { id: rid("m"), from: "them", text: "Ahlan wa sahlan, " + first + "! 🇦🇪 Welcome to Sawa.", ts: now - 3 * min, status: "received" },
          { id: rid("m"), from: "them", text: "Your messages are end-to-end encrypted. Try sending me a message — type \"help\" to see what I can do.", ts: now - 2 * min, status: "received" },
        ],
        lastReadTs: 0,
      }),
      makeChat({
        type: "contact", name: "Ahmed Al Mansoori", about: "Hey there! I am using Sawa.",
        messages: [
          { id: rid("m"), from: "them", text: "Salam! Saw you joined Sawa 👋 yalla let's catch up", ts: now - 40 * min, status: "received" },
        ],
        lastReadTs: 0,
      }),
      makeChat({
        type: "contact", name: "Fatima", about: "🌿",
        messages: [
          { id: rid("m"), from: "them", text: "Don't forget brunch on Friday at JBR ☕️", ts: now - 5 * hr, status: "received" },
          { id: rid("m"), from: "me", text: "Inshallah, I'll be there!", ts: now - 4 * hr, status: "read" },
        ],
        lastReadTs: now,
      }),
      makeChat({
        type: "group", name: "Dubai Friends", about: "You, Khalid, Sara, +3",
        avatar: "👥",
        messages: [
          { id: rid("m"), from: "them", sender: "Khalid", text: "Desert trip this weekend? 🏜️", ts: now - 1 * day, status: "received" },
          { id: rid("m"), from: "them", sender: "Sara", text: "I'm in! 🙌", ts: now - 1 * day + 5 * min, status: "received" },
        ],
        lastReadTs: 0,
      }),
    ];
    saveChats(user.id, chats);
    return chats;
  }

  window.SawaStore = {
    // users / auth
    getUsers: getUsers, findByEmail: findByEmail, findByPhone: findByPhone,
    findById: findById, createUser: createUser, checkPassword: checkPassword,
    // session
    setSession: setSession, clearSession: clearSession, currentUser: currentUser,
    // theme
    getTheme: getTheme, setTheme: setTheme,
    // chats
    getChats: getChats, saveChats: saveChats, makeChat: makeChat,
    newMessage: newMessage, seedChats: seedChats,
    // helpers
    hash: hash, colorFor: colorFor, initials: initials,
    normalizePhone: normalizePhone, isValidPhone: isValidPhone,
    phoneE164: phoneE164, phonePretty: phonePretty,
  };
})();
