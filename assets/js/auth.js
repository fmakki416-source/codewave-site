/* ============================================================
   Marhaba — Auth
   Sign up / log in with phone (OTP) or email.
   Front-end only: OTP is generated client-side and shown on
   screen; no SMS is sent. Passwords are kept in localStorage
   for the demo and are NOT secure storage.
   ============================================================ */
window.Auth = (function () {
  var onSuccess = function () {};
  var mode = 'signup';      // 'signup' | 'login'
  var method = 'phone';     // 'phone' | 'email'
  var pendingOtp = null;    // { code, target, name, id, phone }

  // ---- element helpers ----
  function $(id) { return document.getElementById(id); }
  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }
  function setError(msg) { $('authError').textContent = msg || ''; }

  function init(opts) {
    onSuccess = (opts && opts.onSuccess) || onSuccess;
    wireTabs();
    wirePhone();
    wireOtp();
    wireEmail();
    $('switchMode').addEventListener('click', toggleMode);
  }

  function open(startMode) {
    mode = startMode === 'login' ? 'login' : 'signup';
    method = 'phone';
    pendingOtp = null;
    setError('');
    selectTab('phone');
    resetForms();
    applyMode();
  }

  function resetForms() {
    $('phoneForm').reset();
    $('emailForm').reset();
    clearOtpBoxes();
    show($('phoneForm'));
    hide($('otpForm'));
    hide($('emailForm'));
  }

  function applyMode() {
    var signup = mode === 'signup';
    $('authTitle').textContent = signup ? 'Create your account' : 'Welcome back';
    $('authSubtitle').textContent = signup
      ? 'Chat with anyone in the UAE — sign up in seconds.'
      : 'Log in to continue your conversations.';
    $('switchPrompt').textContent = signup ? 'Already have an account?' : "Don't have an account?";
    $('switchMode').textContent = signup ? 'Log in' : 'Sign up';
    $('emailSubmit').textContent = signup ? 'Create account' : 'Log in';
    // Name fields only matter for sign-up
    $('nameFieldPhone').style.display = signup ? '' : 'none';
    $('nameFieldEmail').style.display = signup ? '' : 'none';
    $('emailPass').setAttribute('autocomplete', signup ? 'new-password' : 'current-password');
  }

  function toggleMode() {
    mode = mode === 'signup' ? 'login' : 'signup';
    setError('');
    applyMode();
  }

  // ---- tabs ----
  function wireTabs() {
    var tabs = $('methodTabs').querySelectorAll('.tab');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () { selectTab(t.dataset.method); });
    });
  }
  function selectTab(m) {
    method = m;
    setError('');
    $('methodTabs').querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.method === m);
    });
    hide($('otpForm'));
    if (m === 'phone') { show($('phoneForm')); hide($('emailForm')); }
    else { hide($('phoneForm')); show($('emailForm')); }
  }

  // ---- phone ----
  function wirePhone() {
    $('countryCode').addEventListener('change', updatePhoneHint);
    $('phoneForm').addEventListener('submit', function (e) {
      e.preventDefault();
      startPhoneAuth();
    });
  }

  function updatePhoneHint() {
    var cc = $('countryCode').value;
    $('phoneHint').textContent = cc === '+971'
      ? 'UAE mobile numbers look like 50 123 4567.'
      : 'Enter your mobile number without the country code.';
  }

  function startPhoneAuth() {
    setError('');
    var cc = $('countryCode').value;
    var raw = $('phoneNumber').value.replace(/[^\d]/g, '');
    var name = $('phoneName').value.trim();

    if (mode === 'signup' && !name) return setError('Please enter your name.');
    if (!raw) return setError('Please enter your phone number.');

    // UAE-specific validation: mobile = 9 digits starting with 5 (or 05x with leading 0)
    if (cc === '+971') {
      if (raw[0] === '0') raw = raw.slice(1);
      if (!/^5\d{8}$/.test(raw)) {
        return setError('Enter a valid UAE mobile, e.g. 50 123 4567.');
      }
    } else if (raw.length < 6) {
      return setError('That phone number looks too short.');
    }

    var full = cc + ' ' + raw;
    var id = 'phone:' + cc + raw;
    var existing = Store.findUser(id);

    if (mode === 'login' && !existing) {
      return setError('No account found for that number. Try signing up.');
    }
    if (mode === 'signup' && existing) {
      return setError('That number is already registered. Try logging in.');
    }

    // Generate a 6-digit demo OTP
    var code = String(Math.floor(100000 + Math.random() * 900000));
    pendingOtp = {
      code: code, target: full, id: id, phone: full,
      name: existing ? existing.name : name
    };

    $('otpTarget').textContent = full;
    $('otpDemoNote').innerHTML = '🔐 Demo mode — your code is <strong>' + code + '</strong>. No SMS is sent.';
    hide($('phoneForm'));
    show($('otpForm'));
    clearOtpBoxes();
    var boxes = $('otpInputs').querySelectorAll('.otp-box');
    boxes[0].focus();
  }

  // ---- OTP ----
  function wireOtp() {
    var boxes = $('otpInputs').querySelectorAll('.otp-box');
    boxes.forEach(function (box, i) {
      box.addEventListener('input', function () {
        box.value = box.value.replace(/[^\d]/g, '');
        if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
      });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
      });
      box.addEventListener('paste', function (e) {
        e.preventDefault();
        var digits = (e.clipboardData.getData('text') || '').replace(/[^\d]/g, '').slice(0, 6);
        for (var j = 0; j < digits.length && j < boxes.length; j++) boxes[j].value = digits[j];
        if (digits.length) boxes[Math.min(digits.length, boxes.length) - 1].focus();
      });
    });
    $('otpForm').addEventListener('submit', function (e) {
      e.preventDefault();
      verifyOtp();
    });
    $('otpBack').addEventListener('click', function () {
      pendingOtp = null;
      setError('');
      hide($('otpForm'));
      show($('phoneForm'));
    });
  }

  function clearOtpBoxes() {
    $('otpInputs').querySelectorAll('.otp-box').forEach(function (b) { b.value = ''; });
  }

  function verifyOtp() {
    setError('');
    var boxes = $('otpInputs').querySelectorAll('.otp-box');
    var entered = Array.prototype.map.call(boxes, function (b) { return b.value; }).join('');
    if (entered.length < 6) return setError('Enter the full 6-digit code.');
    if (!pendingOtp || entered !== pendingOtp.code) return setError('Incorrect code. Please try again.');

    var user = Store.findUser(pendingOtp.id) || {
      id: pendingOtp.id, name: pendingOtp.name, method: 'phone',
      phone: pendingOtp.phone, createdAt: Date.now()
    };
    user.name = user.name || pendingOtp.name;
    Store.saveUser(user);
    finish(user);
  }

  // ---- email ----
  function wireEmail() {
    $('emailForm').addEventListener('submit', function (e) {
      e.preventDefault();
      submitEmail();
    });
  }

  function submitEmail() {
    setError('');
    var name = $('emailName').value.trim();
    var email = $('emailAddr').value.trim().toLowerCase();
    var pass = $('emailPass').value;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please enter a valid email address.');
    if (pass.length < 6) return setError('Password must be at least 6 characters.');

    var id = 'email:' + email;
    var existing = Store.findUser(id);

    if (mode === 'login') {
      if (!existing) return setError('No account found for that email. Try signing up.');
      if (existing.password !== pass) return setError('Incorrect password.');
      return finish(existing);
    }

    // sign up
    if (!name) return setError('Please enter your name.');
    if (existing) return setError('That email is already registered. Try logging in.');

    var user = {
      id: id, name: name, method: 'email', email: email,
      password: pass, createdAt: Date.now()
    };
    Store.saveUser(user);
    finish(user);
  }

  function finish(user) {
    setError('');
    pendingOtp = null;
    onSuccess(user);
  }

  return { init: init, open: open };
})();
