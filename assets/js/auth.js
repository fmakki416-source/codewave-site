/* ============================================================
   Sawa — auth modal logic (sign up / log in)
   Methods: email + password, or UAE phone (+971) + code.
   All account actions go through window.SawaBackend, so this
   works the same whether the real Firebase backend or the
   local demo is active.
   ============================================================ */
(function () {
  "use strict";

  var S = window.SawaStore;
  var I = window.SawaI18n;
  var B = window.SawaBackend;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  /* ---------- toast ---------- */
  var toastHost;
  function toast(msg, kind) {
    if (!toastHost) { toastHost = document.createElement("div"); toastHost.className = "toast-host"; document.body.appendChild(toastHost); }
    var el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    toastHost.appendChild(el);
    setTimeout(function () { el.style.transition = "opacity .3s"; el.style.opacity = "0"; setTimeout(function () { el.remove(); }, 300); }, 2800);
  }

  /* ---------- state ---------- */
  var state = { mode: "signup", method: "email", phase: "form", target: "" };
  var overlay, els = {};

  function cacheEls() {
    overlay = $("#auth-overlay");
    if (!overlay) return false;
    els = {
      title: $("#auth-title"),
      tabs: overlay.querySelectorAll("[data-auth-tab]"),
      methods: overlay.querySelectorAll("[data-method]"),
      grpName: $("#grp-name"), grpEmail: $("#grp-email"),
      grpPass: $("#grp-password"), grpConfirm: $("#grp-confirm"), grpPhone: $("#grp-phone"),
      name: $("#f-name"), email: $("#f-email"), pass: $("#f-password"),
      confirm: $("#f-confirm"), phone: $("#f-phone"),
      formScreen: $("#auth-form-screen"),
      otpScreen: $("#auth-otp-screen"),
      otpInputs: overlay.querySelectorAll(".otp-box"),
      otpTarget: $("#otp-target"),
      otpHint: $("#otp-hint"),
      submit: $("#auth-submit"),
      switch: $("#auth-switch"),
      form: $("#auth-form"),
      verify: $("#otp-verify"),
    };
    return true;
  }

  /* ---------- busy state on buttons ---------- */
  function busy(btn, on) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.textContent; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; }
    else { btn.disabled = false; if (btn.dataset.label != null) btn.textContent = btn.dataset.label; }
  }

  /* ---------- error helpers ---------- */
  function setError(input, msg) {
    if (!input) return;
    var wrap = input.closest(".phone-input") || input;
    wrap.classList.add("invalid");
    var err = (input.closest(".field") || document).querySelector(".field-error");
    if (err) { err.textContent = msg; err.classList.add("show"); }
    input.focus();
  }
  function clearErrors() {
    overlay.querySelectorAll(".invalid").forEach(function (e) { e.classList.remove("invalid"); });
    overlay.querySelectorAll(".field-error.show").forEach(function (e) { e.classList.remove("show"); });
  }

  /* ---------- render ---------- */
  function show(el, on) { if (el) el.style.display = on ? "" : "none"; }

  function render() {
    clearErrors();
    var signup = state.mode === "signup";
    var email = state.method === "email";

    if (els.title) els.title.textContent = I.t(signup ? "tab_signup" : "tab_login");
    els.tabs.forEach(function (t) { t.classList.toggle("active", t.getAttribute("data-auth-tab") === state.mode); });
    els.methods.forEach(function (m) { m.classList.toggle("active", m.getAttribute("data-method") === state.method); });

    show(els.formScreen, state.phase === "form");
    show(els.otpScreen, state.phase === "otp");

    show(els.grpName, signup);
    show(els.grpEmail, email);
    show(els.grpPass, email);
    show(els.grpConfirm, email && signup);
    show(els.grpPhone, !email);

    if (els.submit) els.submit.textContent = email ? I.t(signup ? "btn_create" : "btn_login_action") : I.t("btn_send_code");
    if (els.switch) els.switch.textContent = I.t(signup ? "switch_to_login" : "switch_to_signup");

    I.apply(overlay);
  }

  /* ---------- open / close ---------- */
  function open(mode, method) {
    if (!overlay && !cacheEls()) return;
    state.mode = mode === "login" ? "login" : "signup";
    state.method = method === "phone" ? "phone" : "email";
    state.phase = "form";
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    render();
    setTimeout(function () { (state.mode === "signup" ? els.name : (els.email || els.phone)).focus(); }, 50);
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  /* ---------- validation ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function validateName() {
    var v = els.name.value.trim();
    if (v.length < 2) { setError(els.name, "Please enter your name."); return null; }
    return v;
  }

  /* ---------- OTP screen ---------- */
  function startOtp(target, demoCode) {
    state.target = target;
    state.phase = "otp";
    render();
    if (els.otpTarget) els.otpTarget.textContent = target;
    if (els.otpHint) {
      if (demoCode) els.otpHint.innerHTML = 'Demo mode — no SMS is sent. Your verification code is <strong class="otp-code">' + demoCode + "</strong>.";
      else els.otpHint.textContent = "Enter the 6-digit code we just sent you by SMS.";
    }
    els.otpInputs.forEach(function (b) { b.value = ""; });
    setTimeout(function () { if (els.otpInputs[0]) els.otpInputs[0].focus(); }, 50);
  }
  function readOtp() {
    var v = "";
    els.otpInputs.forEach(function (b) { v += (b.value || "").replace(/\D/g, "").slice(0, 1); });
    return v;
  }

  /* ---------- success ---------- */
  function finalize(user) {
    toast("Welcome to Sawa, " + ((user.name || "").split(/\s+/)[0] || "") + "! 🎉", "success");
    setTimeout(function () { window.location.href = "chat.html"; }, 550);
  }

  /* ---------- submit (form phase) ---------- */
  function submitForm() {
    clearErrors();
    var signup = state.mode === "signup";

    if (state.method === "email") {
      var name = signup ? validateName() : "x";
      if (signup && !name) return;
      var email = els.email.value.trim().toLowerCase();
      if (!EMAIL_RE.test(email)) { setError(els.email, "Enter a valid email address."); return; }
      var pass = els.pass.value;
      if (pass.length < 6) { setError(els.pass, "Password must be at least 6 characters."); return; }
      if (signup && els.confirm.value !== pass) { setError(els.confirm, "Passwords don't match."); return; }

      busy(els.submit, true);
      var p = signup ? B.signUpEmail({ name: name, email: email, password: pass })
                     : B.loginEmail({ email: email, password: pass });
      p.then(finalize).catch(function (e) {
        busy(els.submit, false);
        if (/password/i.test(e.message)) setError(els.pass, e.message);
        else setError(els.email, e.message);
      });
      return;
    }

    /* phone method → request a code */
    var nm = signup ? validateName() : "x";
    if (signup && !nm) return;
    if (!S.isValidPhone(els.phone.value)) { setError(els.phone, "Enter a valid UAE mobile number (e.g. 50 123 4567)."); return; }
    var e164 = S.phoneE164(els.phone.value);

    busy(els.submit, true);
    B.sendPhoneCode({ phoneE164: e164, name: nm, mode: state.mode, recaptchaContainerId: "recaptcha-container" })
      .then(function (res) { busy(els.submit, false); startOtp(S.phonePretty(e164), res && res.demoCode); })
      .catch(function (e) { busy(els.submit, false); setError(els.phone, e.message); });
  }

  /* ---------- verify (otp phase) ---------- */
  function verifyOtp() {
    var code = readOtp();
    if (code.length < 6) { toast("Enter the full 6-digit code.", "error"); return; }
    busy(els.verify, true);
    B.confirmPhoneCode(code).then(finalize).catch(function (e) {
      busy(els.verify, false);
      toast(e.message || "That code isn't right.", "error");
      els.otpInputs.forEach(function (b) { b.value = ""; });
      if (els.otpInputs[0]) els.otpInputs[0].focus();
    });
  }

  /* ---------- wiring ---------- */
  function wireOtpInputs() {
    els.otpInputs.forEach(function (box, idx) {
      box.addEventListener("input", function () {
        box.value = box.value.replace(/\D/g, "").slice(0, 1);
        if (box.value && els.otpInputs[idx + 1]) els.otpInputs[idx + 1].focus();
        if (readOtp().length === 6) verifyOtp();
      });
      box.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !box.value && els.otpInputs[idx - 1]) els.otpInputs[idx - 1].focus();
      });
      box.addEventListener("paste", function (e) {
        e.preventDefault();
        var txt = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
        for (var i = 0; i < 6; i++) if (els.otpInputs[i]) els.otpInputs[i].value = txt[i] || "";
        if (txt.length === 6) verifyOtp(); else if (els.otpInputs[txt.length]) els.otpInputs[txt.length].focus();
      });
    });
  }

  function init() {
    if (!cacheEls()) return;

    els.form.addEventListener("submit", function (e) { e.preventDefault(); submitForm(); });

    els.tabs.forEach(function (t) {
      t.addEventListener("click", function () { state.mode = t.getAttribute("data-auth-tab"); state.phase = "form"; render(); });
    });
    els.methods.forEach(function (m) {
      m.addEventListener("click", function () { state.method = m.getAttribute("data-method"); state.phase = "form"; render(); });
    });
    els.switch.addEventListener("click", function () {
      state.mode = state.mode === "signup" ? "login" : "signup"; state.phase = "form"; render();
    });

    // live-clear errors while typing
    [els.name, els.email, els.pass, els.confirm, els.phone].forEach(function (i) {
      if (!i) return;
      i.addEventListener("input", function () {
        var wrap = i.closest(".phone-input") || i;
        wrap.classList.remove("invalid");
        var err = (i.closest(".field") || document).querySelector(".field-error");
        if (err) err.classList.remove("show");
      });
    });

    // phone: keep digits and group lightly as the user types
    els.phone.addEventListener("input", function () {
      var d = els.phone.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9);
      els.phone.value = d.replace(/^(\d{2})(\d{0,3})(\d{0,4}).*$/, function (_, a, b, c) {
        return [a, b, c].filter(Boolean).join(" ");
      });
    });

    els.verify.addEventListener("click", verifyOtp);
    $("#otp-resend").addEventListener("click", function () {
      var btn = this;
      busy(btn, true);
      B.sendPhoneCode({ phoneE164: S.phoneE164(els.phone.value), name: els.name.value.trim(), mode: state.mode, recaptchaContainerId: "recaptcha-container" })
        .then(function (res) {
          busy(btn, false);
          if (res && res.demoCode && els.otpHint) els.otpHint.innerHTML = 'Demo mode — no SMS is sent. Your verification code is <strong class="otp-code">' + res.demoCode + "</strong>.";
          toast("A new code was sent.", "success");
        })
        .catch(function (e) { busy(btn, false); toast(e.message, "error"); });
    });
    $("#otp-back").addEventListener("click", function () { state.phase = "form"; render(); els.phone.focus(); });
    wireOtpInputs();

    // open / close triggers
    document.querySelectorAll("[data-open-auth]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); open(b.getAttribute("data-open-auth"), b.getAttribute("data-auth-method")); });
    });
    overlay.querySelectorAll("[data-auth-close]").forEach(function (b) { b.addEventListener("click", close); });
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && overlay.classList.contains("open")) close(); });
  }

  window.SawaAuth = { open: open, close: close };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
