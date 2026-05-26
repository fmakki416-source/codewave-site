(function () {
  "use strict";

  // ---------- Storage helpers ----------
  const DB = {
    get users() { return JSON.parse(localStorage.getItem("wasl_users") || "{}"); },
    set users(v) { localStorage.setItem("wasl_users", JSON.stringify(v)); },
    get session() { return localStorage.getItem("wasl_session"); },
    set session(v) { v ? localStorage.setItem("wasl_session", v) : localStorage.removeItem("wasl_session"); },
    chats(key) { return JSON.parse(localStorage.getItem("wasl_chats_" + key) || "null"); },
    saveChats(key, v) { localStorage.setItem("wasl_chats_" + key, JSON.stringify(v)); },
  };

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  // ---------- Screen routing ----------
  const screens = ["landing", "auth", "otp", "app"];
  function show(name) {
    screens.forEach((s) => $("#" + s).classList.toggle("hidden", s !== name));
    window.scrollTo(0, 0);
  }

  // ---------- Demo seed contacts ----------
  function seedChats() {
    const now = Date.now();
    return [
      {
        id: "ahmed", name: "Ahmed", status: "online", unread: 0,
        messages: [
          { from: "in", text: "Salam! How are you?", t: now - 3600000 },
          { from: "out", text: "Al hamdulillah, good! You?", t: now - 3500000 },
          { from: "in", text: "Great. Lunch at Al Safadi later? 🍽️", t: now - 3400000 },
        ],
      },
      {
        id: "fatima", name: "Fatima", status: "last seen recently", unread: 2,
        messages: [
          { from: "in", text: "Did you see the fireworks at the Corniche? 🎆", t: now - 7200000 },
          { from: "in", text: "It was amazing!", t: now - 7100000 },
        ],
      },
      {
        id: "family", name: "Family Group", status: "5 members", unread: 0,
        messages: [
          { from: "in", text: "Mama: Dinner at 8, don't be late 😄", t: now - 86400000 },
          { from: "out", text: "On my way from Sharjah now 🚗", t: now - 86000000 },
        ],
      },
      {
        id: "khalid", name: "Khalid", status: "online", unread: 0,
        messages: [
          { from: "out", text: "Bro, are you coming to the match at Hazza bin Zayed? ⚽", t: now - 10000000 },
          { from: "in", text: "Inshallah! Get the tickets 🎟️", t: now - 9900000 },
        ],
      },
    ];
  }

  // ---------- Validation ----------
  function validUaePhone(local) {
    // Accept 9 digits (e.g. 501234567) optionally with leading 0 -> 10 digits
    const d = local.replace(/\D/g, "").replace(/^0/, "");
    return /^5\d{8}$/.test(d) ? d : null;
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  // ---------- Auth screen state ----------
  let tab = "login";   // login | signup
  let method = "phone"; // phone | email
  let pendingSignup = null; // { key, name, password, displayHandle }
  let demoOtp = "";

  function refreshAuthUI() {
    $$(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    $$(".method").forEach((b) => b.classList.toggle("active", b.dataset.method === method));
    $$(".signup-only").forEach((el) => el.classList.toggle("hidden", tab !== "signup"));
    $(".method-phone").classList.toggle("hidden", method !== "phone");
    $(".method-email").classList.toggle("hidden", method !== "email");
    $("#auth-submit").textContent = tab === "signup" ? "Create account" : "Log in";
    $("#form-error").textContent = "";
  }

  $$(".tab").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; refreshAuthUI(); }));
  $$(".method").forEach((b) => b.addEventListener("click", () => { method = b.dataset.method; refreshAuthUI(); }));

  // goto buttons
  $$("[data-goto]").forEach((b) => b.addEventListener("click", () => {
    const dest = b.dataset.goto;
    if (dest === "auth" && b.dataset.mode === "signup") { tab = "signup"; refreshAuthUI(); }
    if (dest === "auth" && !b.dataset.mode) { tab = "login"; refreshAuthUI(); }
    show(dest);
  }));

  // ---------- Submit auth ----------
  $("#auth-form").addEventListener("submit", function (e) {
    e.preventDefault();
    const err = $("#form-error");
    err.textContent = "";
    const password = $("#password").value;
    const name = $("#name").value.trim();

    let key, handle;
    if (method === "phone") {
      const d = validUaePhone($("#phone").value);
      if (!d) { err.textContent = "Enter a valid UAE mobile number (e.g. 50 123 4567)."; return; }
      key = "+971" + d;
      handle = "+971 " + d;
    } else {
      const email = $("#email").value.trim().toLowerCase();
      if (!validEmail(email)) { err.textContent = "Enter a valid email address."; return; }
      key = email;
      handle = email;
    }

    if (password.length < 6) { err.textContent = "Password must be at least 6 characters."; return; }

    const users = DB.users;

    if (tab === "signup") {
      if (!name) { err.textContent = "Please enter your name."; return; }
      if (users[key]) { err.textContent = "An account with this " + method + " already exists. Try logging in."; return; }

      if (method === "phone") {
        // Require OTP verification before creating account
        pendingSignup = { key, name, password, handle };
        startOtp(handle);
        return;
      }
      // Email signup: create immediately
      createUser(key, name, password, handle);
      enterApp(key);
    } else {
      // Login
      const u = users[key];
      if (!u || u.password !== password) { err.textContent = "Incorrect " + method + " or password."; return; }
      enterApp(key);
    }
  });

  function createUser(key, name, password, handle) {
    const users = DB.users;
    users[key] = { name, password, handle };
    DB.users = users;
    if (!DB.chats(key)) DB.saveChats(key, seedChats());
  }

  // ---------- OTP ----------
  function startOtp(handle) {
    demoOtp = String(Math.floor(100000 + Math.random() * 900000));
    $("#otp-target").textContent = handle;
    $("#demo-code").textContent = demoOtp;
    $("#otp-error").textContent = "";
    $$("#otp-inputs input").forEach((i) => (i.value = ""));
    show("otp");
    $$("#otp-inputs input")[0].focus();
  }

  // OTP input auto-advance
  const otpInputs = $$("#otp-inputs input");
  otpInputs.forEach((input, idx) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "");
      if (input.value && idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && idx > 0) otpInputs[idx - 1].focus();
    });
  });

  $("#otp-submit").addEventListener("click", function () {
    const entered = otpInputs.map((i) => i.value).join("");
    if (entered !== demoOtp) { $("#otp-error").textContent = "Incorrect code. Please try again."; return; }
    if (!pendingSignup) { show("auth"); return; }
    const { key, name, password, handle } = pendingSignup;
    createUser(key, name, password, handle);
    pendingSignup = null;
    enterApp(key);
  });

  // ---------- Chat app ----------
  let currentUserKey = null;
  let chats = [];
  let activeChatId = null;

  function enterApp(key) {
    currentUserKey = key;
    DB.session = key;
    const u = DB.users[key];
    chats = DB.chats(key) || seedChats();
    DB.saveChats(key, chats);

    $("#me-name").textContent = u.name;
    $("#me-handle").textContent = u.handle;
    $("#me-avatar").textContent = (u.name[0] || "?").toUpperCase();

    activeChatId = null;
    renderChatList();
    showEmptyConversation();
    // reset forms
    $("#auth-form").reset();
    refreshAuthUI();
    show("app");
  }

  function fmtTime(t) {
    const d = new Date(t);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function renderChatList(filter) {
    const list = $("#chat-list");
    list.innerHTML = "";
    const q = (filter || "").toLowerCase();
    chats
      .filter((c) => c.name.toLowerCase().includes(q))
      .forEach((c) => {
        const last = c.messages[c.messages.length - 1];
        const item = document.createElement("div");
        item.className = "chat-item" + (c.id === activeChatId ? " active" : "");
        item.innerHTML =
          '<span class="avatar">' + esc(c.name[0]) + "</span>" +
          '<div class="ci-body">' +
            '<div class="ci-top"><span class="ci-name">' + esc(c.name) + "</span>" +
            '<span class="ci-time">' + (last ? fmtTime(last.t) : "") + "</span></div>" +
            '<div class="ci-top"><span class="ci-preview">' + (last ? esc(last.text) : "") + "</span>" +
            (c.unread ? '<span class="unread">' + c.unread + "</span>" : "") + "</div>" +
          "</div>";
        item.addEventListener("click", () => openChat(c.id));
        list.appendChild(item);
      });
  }

  function openChat(id) {
    activeChatId = id;
    const chat = chats.find((c) => c.id === id);
    chat.unread = 0;
    persist();
    $("#conv-name").textContent = chat.name;
    $("#conv-status").textContent = chat.status;
    $("#conv-avatar").textContent = chat.name[0];
    renderMessages(chat);
    renderChatList($("#chat-search").value);
    $("#empty-chat").classList.add("hidden");
    $("#conversation").classList.remove("hidden");
    $("#chat-pane").classList.remove("mobile-hidden");
    $("#msg-input").focus();
  }

  function showEmptyConversation() {
    $("#empty-chat").classList.remove("hidden");
    $("#conversation").classList.add("hidden");
    $("#chat-pane").classList.add("mobile-hidden");
  }

  function renderMessages(chat) {
    const box = $("#messages");
    box.innerHTML = "";
    chat.messages.forEach((m) => {
      const el = document.createElement("div");
      el.className = "msg " + m.from;
      el.innerHTML = esc(m.text) + '<span class="meta">' + fmtTime(m.t) + "</span>";
      box.appendChild(el);
    });
    box.scrollTop = box.scrollHeight;
  }

  // composer
  $("#composer").addEventListener("submit", function (e) {
    e.preventDefault();
    const input = $("#msg-input");
    const text = input.value.trim();
    if (!text || !activeChatId) return;
    const chat = chats.find((c) => c.id === activeChatId);
    chat.messages.push({ from: "out", text, t: Date.now() });
    input.value = "";
    persist();
    renderMessages(chat);
    renderChatList($("#chat-search").value);
    scheduleReply(chat);
  });

  const replies = [
    "Got it 👍", "Inshallah!", "Haha, true 😄", "See you soon!",
    "Let me check and get back to you.", "Yalla! 🚗", "Mashallah 🙌",
    "Sounds good to me.", "I'll be there 📍", "Thank you! 🌹",
  ];
  function scheduleReply(chat) {
    setTimeout(() => {
      const text = replies[Math.floor(Math.random() * replies.length)];
      chat.messages.push({ from: "in", text, t: Date.now() });
      if (chat.id !== activeChatId) chat.unread = (chat.unread || 0) + 1;
      persist();
      if (chat.id === activeChatId) renderMessages(chat);
      renderChatList($("#chat-search").value);
    }, 1200 + Math.random() * 1500);
  }

  function persist() { if (currentUserKey) DB.saveChats(currentUserKey, chats); }

  $("#chat-search").addEventListener("input", (e) => renderChatList(e.target.value));
  $("#back-btn").addEventListener("click", () => { activeChatId = null; showEmptyConversation(); renderChatList($("#chat-search").value); });
  $("#logout-btn").addEventListener("click", () => {
    DB.session = null;
    currentUserKey = null;
    show("landing");
  });

  // ---------- util ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- boot ----------
  refreshAuthUI();
  if (DB.session && DB.users[DB.session]) {
    enterApp(DB.session);
  } else {
    DB.session = null;
    show("landing");
  }
})();
