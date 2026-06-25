/* ============================================================
   Sawa — chat application logic
   ============================================================ */
(function () {
  "use strict";

  var S = window.SawaStore;
  var I = window.SawaI18n;

  /* ---------- session guard ---------- */
  var user = S.currentUser();
  if (!user) { window.location.replace("index.html"); return; }

  /* ---------- state ---------- */
  var chats = S.getChats(user.id);
  var state = { activeId: null, search: "" };
  var typing = {};        // chatId -> true while a reply is being "typed"
  var replyTimers = {};   // chatId -> timeout handles

  var GROUP_MEMBERS = ["Khalid", "Sara", "Omar", "Layla", "Hamad"];
  var SUGGESTED = [
    { name: "Mohammed Al Hashimi", about: "Available" },
    { name: "Aisha", about: "Busy 🤫" },
    { name: "Yousef Khan", about: "At work" },
    { name: "Noora Al Ali", about: "🌸" },
    { name: "Hamdan", about: "Available" },
    { name: "Reem", about: "Sleeping 😴" },
  ];
  var EMOJIS = "😀 😂 🤣 😊 😍 😘 😎 🤩 🥳 😇 🙂 😉 😋 🤔 😴 😭 😅 😢 👍 👎 👌 🙏 👏 🙌 💪 🤝 👋 ✌️ ❤️ 🧡 💚 💙 💜 🔥 ✨ 🎉 🎊 💯 ⭐ 🌙 ☀️ 🌹 🌸 🍽️ ☕ 🏜️ 🐪 🕌 🇦🇪 ⚽ 🚗 ✈️ 📱 💬 ✅ ❌".split(" ");

  /* ---------- DOM ---------- */
  var $ = function (s) { return document.querySelector(s); };
  var app = $("#app");
  var listEl = $("#chat-list");
  var emptyEl = $("#panel-empty");
  var convEl = $("#conversation");
  var msgsEl = $("#messages");
  var composer = $("#composer-input");
  var searchEl = $("#search-input");

  /* ---------- toast ---------- */
  var toastHost;
  function toast(msg, kind) {
    if (!toastHost) { toastHost = document.createElement("div"); toastHost.className = "toast-host"; document.body.appendChild(toastHost); }
    var el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    toastHost.appendChild(el);
    setTimeout(function () { el.style.transition = "opacity .3s"; el.style.opacity = "0"; setTimeout(function () { el.remove(); }, 300); }, 2400);
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function two(n) { return n < 10 ? "0" + n : "" + n; }
  function startOfDay(ts) { var d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function locale() { return I.current() === "ar" ? "ar-AE" : "en-GB"; }

  function clockTime(ts) { var d = new Date(ts); return two(d.getHours()) + ":" + two(d.getMinutes()); }
  function listTime(ts) {
    var sod = startOfDay(Date.now()), day = 86400000;
    if (ts >= sod) return clockTime(ts);
    if (ts >= sod - day) return I.t("yesterday");
    if (ts >= sod - 6 * day) return new Date(ts).toLocaleDateString(locale(), { weekday: "short" });
    var d = new Date(ts); return two(d.getDate()) + "/" + two(d.getMonth() + 1) + "/" + d.getFullYear();
  }
  function dayLabel(ts) {
    var sod = startOfDay(Date.now()), day = 86400000;
    if (ts >= sod) return I.t("today");
    if (ts >= sod - day) return I.t("yesterday");
    return new Date(ts).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });
  }
  function avatarHtml(name, color, emoji, cls) {
    var inner = emoji ? esc(emoji) : esc(S.initials(name));
    return '<span class="avatar ' + (cls || "") + '" style="background:' + esc(color) + '">' + inner + "</span>";
  }
  function lastMessage(c) { return c.messages.length ? c.messages[c.messages.length - 1] : null; }
  function unreadCount(c) {
    return c.messages.filter(function (m) { return m.from === "them" && m.ts > (c.lastReadTs || 0); }).length;
  }
  function sortedChats() {
    return chats.slice().sort(function (a, b) {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      var ta = lastMessage(a) ? lastMessage(a).ts : 0;
      var tb = lastMessage(b) ? lastMessage(b).ts : 0;
      return tb - ta;
    });
  }
  function findChat(id) { return chats.filter(function (c) { return c.id === id; })[0]; }
  function save() { S.saveChats(user.id, chats); }

  /* ---------- profile ---------- */
  function renderProfile() {
    $("#me-avatar").outerHTML = avatarHtml(user.name, user.color, "", "") .replace('class="avatar "', 'class="avatar" id="me-avatar"');
    $("#me-name").textContent = user.name;
    $("#me-handle").textContent = user.phone ? S.phonePretty(user.phone) : (user.email || "");
  }

  /* ---------- chat list ---------- */
  function previewText(c) {
    var m = lastMessage(c);
    if (!m) return "";
    var prefix = "";
    if (m.from === "me") prefix = "✓ ";
    else if (c.type === "group" && m.sender) prefix = m.sender + ": ";
    return prefix + m.text.replace(/\n/g, " ");
  }
  function renderList() {
    var q = state.search.trim().toLowerCase();
    var items = sortedChats().filter(function (c) { return !q || c.name.toLowerCase().indexOf(q) !== -1; });
    if (!items.length) {
      listEl.innerHTML = '<div class="chat-list-empty">' + (q ? "No chats found." : "No chats yet.") + "</div>";
      return;
    }
    listEl.innerHTML = items.map(function (c) {
      var m = lastMessage(c);
      var unread = unreadCount(c);
      var emoji = c.type === "bot" ? "💬" : (c.type === "group" ? "👥" : "");
      return (
        '<div class="chat-item' + (c.id === state.activeId ? " active" : "") + (unread ? " unread" : "") + '" data-id="' + c.id + '">' +
          avatarHtml(c.name, c.color, emoji) +
          '<div class="ci-main">' +
            '<div class="ci-top">' +
              '<span class="ci-name">' + esc(c.name) + (c.pinned ? ' <span class="pin">📌</span>' : "") + "</span>" +
              '<span class="ci-time">' + (m ? listTime(m.ts) : "") + "</span>" +
            "</div>" +
            '<div class="ci-bottom">' +
              '<span class="ci-preview">' + esc(previewText(c)) + "</span>" +
              (unread ? '<span class="ci-badge">' + unread + "</span>" : "") +
            "</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  /* ---------- conversation ---------- */
  function statusText(c) {
    if (typing[c.id]) return I.t("typing");
    if (c.type === "bot") return "Official account";
    if (c.type === "group") return c.about || "Group";
    return c.about || I.t("online");
  }
  function setHeader(c) {
    var emoji = c.type === "bot" ? "💬" : (c.type === "group" ? "👥" : "");
    $("#ch-avatar").outerHTML = avatarHtml(c.name, c.color, emoji).replace('class="avatar "', 'class="avatar" id="ch-avatar"');
    $("#ch-name").textContent = c.name;
    var st = $("#ch-status");
    st.textContent = statusText(c);
    st.classList.toggle("is-typing", !!typing[c.id]);
  }
  function renderMessages(c) {
    var html = "", lastDay = null;
    c.messages.forEach(function (m) {
      var d = startOfDay(m.ts);
      if (d !== lastDay) { html += '<div class="day-sep"><span>' + esc(dayLabel(m.ts)) + "</span></div>"; lastDay = d; }
      var senderLine = (c.type === "group" && m.from === "them" && m.sender) ? '<span class="sender">' + esc(m.sender) + "</span>" : "";
      var ticks = "";
      if (m.from === "me") { ticks = '<span class="ticks ' + (m.status === "read" ? "read" : "") + '">✓✓</span>'; }
      html +=
        '<div class="bubble ' + (m.from === "me" ? "out" : "in") + '">' +
          senderLine +
          esc(m.text) +
          '<span class="meta">' + clockTime(m.ts) + ticks + "</span>" +
        "</div>";
    });
    if (typing[c.id]) {
      html += '<div class="bubble in typing-bubble"><i></i><i></i><i></i></div>';
    }
    msgsEl.innerHTML = html;
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
  function openChat(id) {
    var c = findChat(id);
    if (!c) return;
    state.activeId = id;
    c.lastReadTs = Date.now();
    save();
    emptyEl.hidden = true;
    convEl.hidden = false;
    setHeader(c);
    renderMessages(c);
    renderList();
    if (window.matchMedia("(max-width: 768px)").matches) app.classList.add("show-conversation");
    setTimeout(function () { composer.focus(); }, 30);
  }

  /* ---------- sending + replies ---------- */
  function groupSender() { return GROUP_MEMBERS[Math.floor(Math.random() * GROUP_MEMBERS.length)]; }

  function genReply(c, userText) {
    var t = (userText || "").toLowerCase();
    if (c.type === "bot") {
      if (/help|menu|what can/.test(t))
        return "Here's what I can do 🤖\n• Send & receive messages — try it!\n• Every chat is end-to-end encrypted 🔒\n• Switch to dark mode or العربية from the ⋮ menu\n• Tap ✚ to start a new chat";
      if (/salam|hi\b|hello|marhaba|hey|ahlan/.test(t)) return "Wa alaikum salam! 👋 Welcome to Sawa. Type \"help\" to see what I can do.";
      if (/encrypt|secure|privacy|safe/.test(t)) return "Every Sawa chat is end-to-end encrypted by default 🔒 Only you and the people you message can read them.";
      if (/thank|shukran/.test(t)) return "Afwan! 😊 Anytime.";
      if (/who|about|sawa/.test(t)) return "Sawa is a private messenger built for the UAE 🇦🇪 — sign up with email or your +971 number and start chatting freely.";
      return "Got it ✅ This is a friendly demo bot and your message was saved on this device. Type \"help\" for ideas!";
    }
    var pool = ["Haha yes 😄", "Inshallah! 🤲", "Yalla 🙌", "Sounds good 👍", "Let me check and get back to you",
      "🇦🇪 ❤️", "Wallah that's great!", "See you soon!", "Mashallah 👏", "Ok habibi, talk later 👋", "Perfect 👌"];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function scheduleReply(c) {
    if (replyTimers[c.id]) clearTimeout(replyTimers[c.id]);
    replyTimers[c.id] = setTimeout(function () {
      typing[c.id] = true;
      if (c.id === state.activeId) { setHeader(c); renderMessages(c); }
      var delay = 800 + Math.floor(Math.random() * 1000);
      replyTimers[c.id] = setTimeout(function () {
        typing[c.id] = false;
        var mine = c.messages.filter(function (m) { return m.from === "me"; });
        var reply = genReply(c, mine.length ? mine[mine.length - 1].text : "");
        var extra = c.type === "group" ? { sender: groupSender() } : null;
        c.messages.push(S.newMessage("them", reply, extra));
        if (c.id === state.activeId) { c.lastReadTs = Date.now(); }
        save();
        if (c.id === state.activeId) { setHeader(c); renderMessages(c); }
        renderList();
      }, delay);
    }, 500);
  }

  function sendMessage() {
    var text = composer.value.trim();
    if (!text || !state.activeId) return;
    var c = findChat(state.activeId);
    c.messages.push(S.newMessage("me", text));
    c.lastReadTs = Date.now();
    save();
    composer.value = "";
    composer.style.height = "auto";
    renderMessages(c);
    renderList();
    scheduleReply(c);
  }

  /* ---------- new chat ---------- */
  function startChatWith(name, about) {
    name = (name || "").trim();
    if (!name) return;
    var existing = chats.filter(function (c) { return c.name.toLowerCase() === name.toLowerCase() && c.type === "contact"; })[0];
    if (!existing) {
      existing = S.makeChat({ type: "contact", name: name, about: about || "Available" });
      chats.push(existing);
      save();
    }
    closeModal();
    renderList();
    openChat(existing.id);
  }
  function renderSuggested() {
    var box = $("#suggested");
    box.innerHTML = SUGGESTED.map(function (s) {
      return '<button type="button" data-name="' + esc(s.name) + '" data-about="' + esc(s.about) + '">' +
        avatarHtml(s.name, S.colorFor(s.name)) +
        "<span><b>" + esc(s.name) + "</b><span>" + esc(s.about) + "</span></span></button>";
    }).join("");
  }
  function openModal() { renderSuggested(); $("#newchat-name").value = ""; $("#newchat-overlay").classList.add("open"); setTimeout(function () { $("#newchat-name").focus(); }, 40); }
  function closeModal() { $("#newchat-overlay").classList.remove("open"); }

  /* ---------- menu / settings ---------- */
  function applyTheme() { document.documentElement.setAttribute("data-theme", S.getTheme()); }
  function toggleTheme() { S.setTheme(S.getTheme() === "dark" ? "light" : "dark"); applyTheme(); }
  function toggleLang() {
    I.toggle();
    I.apply();
    renderList();
    var c = state.activeId && findChat(state.activeId);
    if (c) { setHeader(c); renderMessages(c); }
  }
  function logout() { S.clearSession(); window.location.replace("index.html"); }

  /* ---------- emoji ---------- */
  function renderEmojis() {
    $("#emoji-grid").innerHTML = EMOJIS.map(function (e) { return '<button type="button">' + e + "</button>"; }).join("");
  }
  function insertEmoji(emo) {
    var el = composer, start = el.selectionStart || el.value.length, end = el.selectionEnd || el.value.length;
    el.value = el.value.slice(0, start) + emo + el.value.slice(end);
    el.focus();
    el.selectionStart = el.selectionEnd = start + emo.length;
  }

  /* ---------- wiring ---------- */
  function init() {
    applyTheme();
    I.apply();
    renderProfile();
    renderList();
    renderEmojis();

    // open first (pinned) chat on desktop for a friendly start
    if (!window.matchMedia("(max-width: 768px)").matches) {
      var first = sortedChats()[0];
      if (first) openChat(first.id);
    }

    listEl.addEventListener("click", function (e) {
      var item = e.target.closest(".chat-item");
      if (item) openChat(item.getAttribute("data-id"));
    });

    // composer
    composer.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    composer.addEventListener("input", function () {
      composer.style.height = "auto";
      composer.style.height = Math.min(composer.scrollHeight, 120) + "px";
    });
    $("#send-btn").addEventListener("click", sendMessage);

    // search
    searchEl.addEventListener("input", function () { state.search = searchEl.value; renderList(); });

    // header menu
    var menu = $("#side-menu");
    $("#menu-btn").addEventListener("click", function (e) { e.stopPropagation(); menu.classList.toggle("open"); });
    document.addEventListener("click", function () { menu.classList.remove("open"); $("#emoji-pop").classList.remove("open"); });
    menu.addEventListener("click", function (e) { e.stopPropagation(); });
    $("#m-newchat").addEventListener("click", function () { menu.classList.remove("open"); openModal(); });
    $("#m-theme").addEventListener("click", function () { menu.classList.remove("open"); toggleTheme(); });
    $("#m-lang").addEventListener("click", function () { menu.classList.remove("open"); toggleLang(); });
    $("#m-logout").addEventListener("click", logout);

    // new chat button + modal
    $("#new-chat-btn").addEventListener("click", openModal);
    $("#newchat-overlay").addEventListener("mousedown", function (e) { if (e.target === e.currentTarget) closeModal(); });
    $("#newchat-cancel").addEventListener("click", closeModal);
    $("#newchat-start").addEventListener("click", function () { startChatWith($("#newchat-name").value, "Available"); });
    $("#newchat-name").addEventListener("keydown", function (e) { if (e.key === "Enter") startChatWith($("#newchat-name").value, "Available"); });
    $("#suggested").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-name]");
      if (b) startChatWith(b.getAttribute("data-name"), b.getAttribute("data-about"));
    });

    // emoji picker
    $("#emoji-btn").addEventListener("click", function (e) { e.stopPropagation(); $("#emoji-pop").classList.toggle("open"); });
    $("#emoji-pop").addEventListener("click", function (e) {
      e.stopPropagation();
      var b = e.target.closest("button");
      if (b) insertEmoji(b.textContent);
    });

    // mobile back
    $("#conv-back").addEventListener("click", function () { app.classList.remove("show-conversation"); state.activeId = null; renderList(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
