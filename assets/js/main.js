/* ============================================================
   Marhaba — App bootstrap & router
   Switches between Landing → Auth → Chat screens.
   ============================================================ */
(function () {
  function $(id) { return document.getElementById(id); }

  var screens = { landing: $('landing'), auth: $('auth'), app: $('app') };
  function show(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle('hidden', k !== name);
    });
    window.scrollTo(0, 0);
  }

  function goChat(user) {
    Store.setSession(user);
    show('app');
    Chat.open(user, { onLogout: logout });
  }

  function logout() {
    Store.clearSession();
    show('landing');
  }

  // Auth wiring
  Auth.init({ onSuccess: goChat });

  // Landing buttons that open auth (login / signup)
  document.querySelectorAll('[data-auth]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      Auth.open(btn.getAttribute('data-auth'));
      show('auth');
    });
  });

  // Close auth → back to landing
  $('authClose').addEventListener('click', function () { show('landing'); });

  // Resume an existing session, otherwise show the landing page.
  var session = Store.getSession();
  if (session) goChat(session);
  else show('landing');
})();
