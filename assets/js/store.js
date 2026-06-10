/* ============================================================
   Marhaba — Store
   Persistence (localStorage) + seed data.
   NOTE: This is a front-end demo. "Accounts" and messages live
   only in the browser. Do not use this for anything real.
   ============================================================ */
window.Store = (function () {
  var KEY_USERS = 'marhaba_users';
  var KEY_SESSION = 'marhaba_session';
  var mem = {}; // fallback when localStorage is unavailable (e.g. private mode)

  function get(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return key in mem ? mem[key] : fallback;
    }
  }
  function set(key, val) {
    try {
      window.localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      mem[key] = val;
    }
  }

  // ---- Avatars ----
  var COLORS = ['#00a884', '#6a5acd', '#e67e22', '#2980b9', '#c0392b',
                '#16a085', '#8e44ad', '#d35400', '#2c3e50', '#27ae60'];
  function colorFor(seed) {
    var n = 0;
    for (var i = 0; i < seed.length; i++) n = (n + seed.charCodeAt(i)) % COLORS.length;
    return COLORS[n];
  }
  function initials(name) {
    var parts = (name || '?').trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // ---- Users ----
  function getUsers() { return get(KEY_USERS, {}); }
  function findUser(id) { return getUsers()[id] || null; }
  function saveUser(user) {
    var users = getUsers();
    users[user.id] = user;
    set(KEY_USERS, users);
    return user;
  }

  // ---- Session ----
  function getSession() {
    var id = get(KEY_SESSION, null);
    return id ? findUser(id) : null;
  }
  function setSession(user) { set(KEY_SESSION, user.id); }
  function clearSession() { set(KEY_SESSION, null); }

  // ---- Per-user conversations ----
  function chatsKey(userId) { return 'marhaba_chats_' + userId; }
  function getChats(userId) {
    var chats = get(chatsKey(userId), null);
    if (!chats) { chats = seedChats(); set(chatsKey(userId), chats); }
    return chats;
  }
  function saveChats(userId, chats) { set(chatsKey(userId), chats); }

  // ---- Seed conversations (UAE flavoured) ----
  function mins(m) { return Date.now() - m * 60000; }
  function days(d) { return Date.now() - d * 86400000; }

  function seedChats() {
    return [
      {
        id: 'c1', name: 'Fatima Al Zaabi', kind: 'contact', status: 'online',
        replies: ['Marhaba! 👋', 'Yalla, see you there 💚', 'Inshallah 🙏', 'Shukran habibi 😄'],
        messages: [
          { from: 'them', text: 'Marhaba! 👋 You coming to Dubai Mall later?', t: mins(48), seen: true },
          { from: 'me', text: 'Yalla, inshallah around 6 🛍️', t: mins(45), read: true },
          { from: 'them', text: 'Perfect, see you at the fountain 💚', t: mins(12) }
        ]
      },
      {
        id: 'c2', name: 'Ahmed Al Mansoori', kind: 'contact', status: 'last seen today at 13:20',
        replies: ['Wallah good idea', 'Haha 😂', 'On my way 🚗', 'Let me check'],
        messages: [
          { from: 'them', text: 'Akhi, did you finish the report?', t: mins(180), seen: true },
          { from: 'me', text: 'Almost, sending it tonight inshallah', t: mins(170), read: true },
          { from: 'them', text: 'Shukran 🙏', t: mins(165) }
        ]
      },
      {
        id: 'g1', name: 'Family — العائلة', kind: 'group', status: 'Mama, Baba, Sara, +4',
        senders: ['Mama', 'Baba', 'Sara', 'Yousef'],
        replies: ['❤️❤️', 'See you Friday for lunch', 'Mashallah!', 'Drive safe everyone'],
        messages: [
          { from: 'them', sender: 'Mama', text: 'Don\'t forget Friday lunch at 1pm 🍽️', t: days(1), seen: true },
          { from: 'me', text: 'Will be there! 😋', t: days(1) + 120000, read: true },
          { from: 'them', sender: 'Sara', text: 'Bringing dessert 🍰', t: mins(300) }
        ]
      },
      {
        id: 'g2', name: 'Dubai Marina B12 🏢', kind: 'group', status: 'Building residents',
        senders: ['Building Mgmt', 'Khalid', 'Reem'],
        replies: ['Noted, thanks', 'The lift is fixed now ✅', 'Pool reopens tomorrow'],
        messages: [
          { from: 'them', sender: 'Building Mgmt', text: 'Water maintenance tomorrow 9–11am.', t: days(2) },
          { from: 'them', sender: 'Khalid', text: 'Thanks for the heads up 👍', t: days(2) + 300000 }
        ]
      },
      {
        id: 'c3', name: 'Aisha Khalifa', kind: 'contact', status: 'last seen yesterday',
        replies: ['Sounds great!', 'Yes please ☕', 'Talk soon'],
        messages: [
          { from: 'me', text: 'Coffee this weekend? ☕', t: days(1), read: false },
          { from: 'them', text: 'Yes! Saturday morning works 😊', t: days(1) + 200000 }
        ]
      },
      {
        id: 'c4', name: 'Omar — Work', kind: 'contact', status: 'online',
        replies: ['Approved ✅', 'Let\'s sync at 3', 'Good work team'],
        messages: [
          { from: 'them', text: 'Client meeting moved to 3pm', t: mins(90) }
        ]
      },
      {
        id: 'c5', name: 'Mariam Al Hashimi', kind: 'contact', status: 'last seen recently',
        replies: ['😂😂', 'No wayy', 'Send me the link'],
        messages: [
          { from: 'them', text: 'Did you see the fireworks last night?! 🎆', t: days(3) }
        ]
      }
    ];
  }

  return {
    getUsers: getUsers, findUser: findUser, saveUser: saveUser,
    getSession: getSession, setSession: setSession, clearSession: clearSession,
    getChats: getChats, saveChats: saveChats,
    colorFor: colorFor, initials: initials
  };
})();
