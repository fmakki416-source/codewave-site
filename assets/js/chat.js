/* ============================================================
   Marhaba — Chat
   WhatsApp-Web style conversation UI.
   Messages are simulated: contacts auto-reply from a small set
   of canned responses. Everything persists per-user in
   localStorage via Store.
   ============================================================ */
window.Chat = (function () {
  var user = null;
  var chats = [];
  var activeId = null;
  var onLogout = function () {};
  var pending = {};     // chatId -> auto-reply timeout id (one chain per chat)
  var readTimers = [];  // pending read-receipt timeouts

  function $(id) { return document.getElementById(id); }

  function open(currentUser, opts) {
    clearTimers();            // drop any timers left over from a previous session
    user = currentUser;
    onLogout = (opts && opts.onLogout) || onLogout;
    chats = Store.getChats(user.id);
    activeId = null;
    renderMe();
    renderList();
    showEmpty();
    wireOnce();
    // On desktop, open the most recent conversation for a lively first impression.
    if (window.innerWidth > 768 && chats.length) openChat(topChatId());
  }

  // id of the chat shown at the top of the time-sorted list
  function topChatId() {
    return chats.slice().sort(function (a, b) { return lastT(b) - lastT(a); })[0].id;
  }

  // cancel every outstanding auto-reply / read-receipt timer
  function clearTimers() {
    Object.keys(pending).forEach(function (k) { clearTimeout(pending[k]); });
    pending = {};
    readTimers.forEach(clearTimeout);
    readTimers = [];
  }

  // ---- header / me ----
  function renderMe() {
    var av = $('meAvatar');
    av.textContent = Store.initials(user.name);
    av.style.background = Store.colorFor(user.id);
    $('meName').textContent = user.name;
    $('meId').textContent = user.method === 'phone' ? user.phone : user.email;
  }

  var wired = false;
  function wireOnce() {
    if (wired) return;
    wired = true;

    $('searchInput').addEventListener('input', function (e) { renderList(e.target.value); });
    $('composer').addEventListener('submit', function (e) { e.preventDefault(); sendMessage(); });
    $('backBtn').addEventListener('click', showEmpty);
    $('newChatBtn').addEventListener('click', function () {
      toast('Start chatting from your existing conversations 💬');
    });
    $('emojiBtn').addEventListener('click', function () {
      var inp = $('msgInput');
      inp.value += '😊';
      inp.focus();
    });

    var menu = $('sideMenu');
    $('menuBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.toggle('hidden');
    });
    document.addEventListener('click', function () { menu.classList.add('hidden'); });
    $('profileBtn').addEventListener('click', function () {
      toast(user.name + ' · ' + (user.phone || user.email));
    });
    $('logoutBtn').addEventListener('click', function () {
      clearTimers();
      onLogout();
    });
  }

  // ---- chat list ----
  function renderList(filter) {
    var list = $('chatList');
    list.innerHTML = '';
    var q = (filter || '').trim().toLowerCase();

    var sorted = chats.slice().sort(function (a, b) { return lastT(b) - lastT(a); });
    var shown = 0;

    sorted.forEach(function (c) {
      if (q && c.name.toLowerCase().indexOf(q) === -1) return;
      shown++;
      var last = c.messages[c.messages.length - 1];
      var unread = c.messages.filter(function (m) { return m.from === 'them' && !m.seen; }).length;

      var item = document.createElement('div');
      item.className = 'chat-item' + (c.id === activeId ? ' active' : '');
      item.innerHTML =
        '<span class="avatar" style="background:' + Store.colorFor(c.id) + '">' +
          (c.kind === 'group' ? '👥' : esc(Store.initials(c.name))) + '</span>' +
        '<div class="ci-body">' +
          '<div class="ci-top">' +
            '<span class="ci-name">' + esc(c.name) + '</span>' +
            '<span class="ci-time">' + (last ? shortTime(last.t) : '') + '</span>' +
          '</div>' +
          '<div class="ci-bottom">' +
            '<span class="ci-preview">' + previewText(c, last) + '</span>' +
            (unread ? '<span class="ci-badge">' + unread + '</span>' : '') +
          '</div>' +
        '</div>';
      item.addEventListener('click', function () { openChat(c.id); });
      list.appendChild(item);
    });

    if (!shown) {
      list.innerHTML = '<p class="muted" style="padding:1.5rem;text-align:center">No chats found.</p>';
    }
  }

  function previewText(c, last) {
    if (!last) return '<em>No messages yet</em>';
    var prefix = '';
    if (last.from === 'me') prefix = '✓✓ ';
    else if (c.kind === 'group' && last.sender) prefix = esc(last.sender) + ': ';
    return prefix + esc(last.text);
  }

  function lastT(c) { return c.messages.length ? c.messages[c.messages.length - 1].t : 0; }

  // ---- conversation ----
  function findChat(id) {
    for (var i = 0; i < chats.length; i++) if (chats[i].id === id) return chats[i];
    return null;
  }

  function openChat(id) {
    activeId = id;
    var c = findChat(id);
    if (!c) return;

    // mark incoming as seen
    c.messages.forEach(function (m) { if (m.from === 'them') m.seen = true; });
    persist();

    $('emptyState').classList.add('hidden');
    $('conversation').classList.remove('hidden');
    document.querySelector('.wa').classList.add('show-conv');

    var av = $('convAvatar');
    av.textContent = c.kind === 'group' ? '👥' : Store.initials(c.name);
    av.style.background = Store.colorFor(c.id);
    $('convName').textContent = c.name;
    $('convStatus').textContent = c.status || '';

    renderMessages(c);
    renderList($('searchInput').value);
    $('msgInput').focus();
  }

  function showEmpty() {
    activeId = null;
    document.querySelector('.wa').classList.remove('show-conv');
    $('conversation').classList.add('hidden');
    $('emptyState').classList.remove('hidden');
    renderList($('searchInput') ? $('searchInput').value : '');
  }

  function renderMessages(c) {
    var box = $('messages');
    box.innerHTML = '';
    var lastDay = null;

    c.messages.forEach(function (m) {
      var day = dayLabel(m.t);
      if (day !== lastDay) {
        lastDay = day;
        var sep = document.createElement('div');
        sep.className = 'day-sep';
        sep.textContent = day;
        box.appendChild(sep);
      }
      box.appendChild(bubble(c, m));
    });
    scrollDown();
  }

  function bubble(c, m) {
    var el = document.createElement('div');
    el.className = 'msg ' + (m.from === 'me' ? 'out' : 'in');
    var senderTag = (m.from === 'them' && c.kind === 'group' && m.sender)
      ? '<div style="font-size:.78rem;font-weight:700;color:' + Store.colorFor(m.sender) + '">' + esc(m.sender) + '</div>'
      : '';
    var tick = '';
    if (m.from === 'me') {
      tick = '<span class="tick' + (m.read ? ' read' : '') + '">✓✓</span>';
    }
    el.innerHTML = senderTag +
      '<span class="text">' + esc(m.text) + '</span>' +
      '<span class="meta">' + shortTime(m.t) + ' ' + tick + '</span>';
    return el;
  }

  // ---- sending ----
  function sendMessage() {
    var input = $('msgInput');
    var text = input.value.trim();
    if (!text || !activeId) return;
    var c = findChat(activeId);
    if (!c) return;

    c.messages.push({ from: 'me', text: text, t: Date.now(), read: false });
    input.value = '';
    persist();
    renderMessages(c);
    renderList($('searchInput').value);

    // mark delivered->read shortly after
    var readT = setTimeout(function () {
      readTimers = readTimers.filter(function (x) { return x !== readT; });
      var last = c.messages[c.messages.length - 1];
      if (last && last.from === 'me') { last.read = true; persist(); if (activeId === c.id) renderMessages(c); }
    }, 1500);
    readTimers.push(readT);

    scheduleReply(c);
  }

  function scheduleReply(c) {
    var replyChatId = c.id;
    // one in-flight reply chain per chat, so sending elsewhere never cancels it
    if (pending[replyChatId]) clearTimeout(pending[replyChatId]);
    var delay = 1200 + Math.random() * 1600;

    pending[replyChatId] = setTimeout(function () {
      if (activeId === replyChatId) showTyping();
      pending[replyChatId] = setTimeout(function () {
        delete pending[replyChatId];
        if (activeId === replyChatId) removeTyping();
        var chat = findChat(replyChatId);
        if (!chat) return;
        var pool = chat.replies && chat.replies.length ? chat.replies : ['👍', 'Okay!', 'Got it 🙏'];
        var text = pool[Math.floor(Math.random() * pool.length)];
        var msg = { from: 'them', text: text, t: Date.now(), seen: activeId === replyChatId };
        if (chat.kind === 'group') msg.sender = groupSender(chat);
        chat.messages.push(msg);
        persist();
        if (activeId === replyChatId) renderMessages(chat);
        renderList($('searchInput').value);
        if (activeId !== replyChatId) toast('💬 New message from ' + chat.name);
      }, 1400);
    }, delay);
  }

  function groupSender(chat) {
    var names = (chat.senders && chat.senders.length)
      ? chat.senders : ['Sara', 'Khalid', 'Omar', 'Layla'];
    return names[Math.floor(Math.random() * names.length)];
  }

  function showTyping() {
    removeTyping();
    var box = $('messages');
    var t = document.createElement('div');
    t.className = 'typing';
    t.id = 'typingIndicator';
    t.innerHTML = '<span></span><span></span><span></span>';
    box.appendChild(t);
    scrollDown();
  }
  function removeTyping() {
    var t = $('typingIndicator');
    if (t) t.remove();
  }

  // ---- utils ----
  function persist() { Store.saveChats(user.id, chats); }
  function scrollDown() { var b = $('messages'); b.scrollTop = b.scrollHeight; }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function shortTime(t) {
    var d = new Date(t);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function dayLabel(t) {
    var d = new Date(t), now = new Date();
    var startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var diff = startToday - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (diff <= 0) return 'Today';
    if (diff <= 86400000) return 'Yesterday';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add('hidden'); }, 2600);
  }

  return { open: open };
})();
