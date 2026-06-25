/* ============================================================
   Sawa — tiny bilingual (EN / AR) i18n helper
   Applies translations to [data-i18n] / [data-i18n-placeholder]
   and flips text direction for Arabic.
   ============================================================ */
(function () {
  "use strict";

  var DICT = {
    en: {
      /* nav + landing */
      nav_features: "Features",
      nav_security: "Security",
      nav_download: "Get the app",
      btn_login: "Log in",
      btn_signup: "Sign up",
      hero_badge: "🇦🇪 Built for the UAE",
      hero_title: "Simple, private messaging for the Emirates",
      hero_sub: "Chat, call and share with friends and family across the UAE. Sign up in seconds with your email or your +971 number.",
      hero_cta: "Get started — it's free",
      hero_secondary: "See how it works",
      hero_note: "Free · End-to-end encrypted · No ads",
      features_title: "Everything you need to stay close",
      f1_title: "Lightning-fast chats",
      f1_desc: "Send text, photos, voice notes and documents instantly — even on patchy networks.",
      f2_title: "Private by default",
      f2_desc: "Every message is end-to-end encrypted, so only you and the people you message can read them.",
      f3_title: "Voice & video calls",
      f3_desc: "Crisp HD calls to anyone in the Emirates and around the world, included for free.",
      f4_title: "Groups for everyone",
      f4_desc: "Bring family, friends and your majlis together in groups of up to 1,024 people.",
      f5_title: "Email or phone sign-up",
      f5_desc: "Join with a +971 mobile number and a verification code, or simply use your email.",
      f6_title: "العربية & English",
      f6_desc: "A bilingual experience with full right-to-left support, made for the region.",
      security_kicker: "Privacy you can trust",
      security_title: "Your conversations stay yours",
      security_desc: "Sawa secures every chat with end-to-end encryption by default. Not even we can read your messages.",
      security_point1: "End-to-end encrypted messages & calls",
      security_point2: "No ads, no data resold to third parties",
      security_point3: "You control who can reach you",
      cta_title: "Ready to start chatting?",
      cta_sub: "Create your free Sawa account and say marhaba.",
      cta_button: "Create free account",
      footer_tagline: "Messaging, made for the UAE.",
      footer_rights: "This is a demo project and is not affiliated with WhatsApp or Meta.",

      /* auth modal */
      tab_signup: "Sign up",
      tab_login: "Log in",
      method_email: "Email",
      method_phone: "Phone",
      label_name: "Full name",
      label_email: "Email address",
      label_password: "Password",
      label_confirm: "Confirm password",
      label_phone: "Mobile number",
      ph_name: "e.g. Mariam Al Marri",
      ph_email: "you@example.com",
      ph_password: "At least 6 characters",
      ph_confirm: "Re-type your password",
      ph_phone: "50 123 4567",
      btn_create: "Create account",
      btn_continue: "Continue",
      btn_send_code: "Send verification code",
      btn_verify: "Verify & continue",
      btn_login_action: "Log in",
      otp_title: "Enter your code",
      otp_resend: "Resend code",
      otp_back: "← Use a different number",
      switch_to_login: "Already on Sawa? Log in",
      switch_to_signup: "New here? Create an account",
      login_email_hint: "Log in with the email and password you signed up with.",

      /* chat app */
      search_placeholder: "Search or start a new chat",
      msg_placeholder: "Type a message",
      menu_newchat: "New chat",
      menu_theme: "Switch theme",
      menu_language: "العربية",
      menu_logout: "Log out",
      chats_heading: "Chats",
      empty_title: "Sawa Web",
      empty_sub: "Select a chat to start messaging. Your messages are end-to-end encrypted.",
      encryption_note: "🔒 End-to-end encrypted",
      online: "online",
      typing: "typing…",
      newchat_title: "Start a new chat",
      newchat_sub: "Pick a contact below or enter a name.",
      newchat_name_ph: "Contact name",
      newchat_create: "Start chat",
      today: "Today",
      yesterday: "Yesterday",
    },
    ar: {
      nav_features: "المزايا",
      nav_security: "الأمان",
      nav_download: "حمّل التطبيق",
      btn_login: "تسجيل الدخول",
      btn_signup: "إنشاء حساب",
      hero_badge: "🇦🇪 صُمّم لدولة الإمارات",
      hero_title: "مراسلة بسيطة وخاصة لأهل الإمارات",
      hero_sub: "دردش واتصل وشارك مع العائلة والأصدقاء في كل أنحاء الإمارات. سجّل خلال ثوانٍ ببريدك الإلكتروني أو رقمك +971.",
      hero_cta: "ابدأ الآن — مجاناً",
      hero_secondary: "كيف يعمل التطبيق",
      hero_note: "مجاني · مشفّر بالكامل · بدون إعلانات",
      features_title: "كل ما تحتاجه لتبقى قريباً",
      f1_title: "محادثات فائقة السرعة",
      f1_desc: "أرسل النصوص والصور والرسائل الصوتية والمستندات فوراً، حتى مع ضعف الشبكة.",
      f2_title: "خصوصية تلقائية",
      f2_desc: "كل رسالة مشفّرة من طرف إلى طرف، فلا يقرؤها سواك ومن تراسله.",
      f3_title: "مكالمات صوت وفيديو",
      f3_desc: "مكالمات عالية الجودة لأي شخص في الإمارات والعالم، مجاناً.",
      f4_title: "مجموعات تتسع للجميع",
      f4_desc: "اجمع العائلة والأصدقاء ومجلسك في مجموعات تصل إلى 1024 شخصاً.",
      f5_title: "تسجيل بالبريد أو الهاتف",
      f5_desc: "انضم برقم +971 ورمز تحقق، أو ببساطة استخدم بريدك الإلكتروني.",
      f6_title: "العربية والإنجليزية",
      f6_desc: "تجربة بلغتين مع دعم كامل للكتابة من اليمين إلى اليسار، مصمّمة للمنطقة.",
      security_kicker: "خصوصية تثق بها",
      security_title: "محادثاتك تبقى ملكك",
      security_desc: "يؤمّن صوا كل محادثة بالتشفير الكامل تلقائياً. حتى نحن لا نستطيع قراءة رسائلك.",
      security_point1: "رسائل ومكالمات مشفّرة بالكامل",
      security_point2: "بدون إعلانات وبدون بيع بياناتك",
      security_point3: "أنت تتحكّم بمن يصل إليك",
      cta_title: "جاهز لتبدأ الدردشة؟",
      cta_sub: "أنشئ حساب صوا المجاني وقل مرحبا.",
      cta_button: "أنشئ حساباً مجانياً",
      footer_tagline: "مراسلة، صُمّمت لدولة الإمارات.",
      footer_rights: "هذا مشروع تجريبي وغير مرتبط بواتساب أو ميتا.",

      tab_signup: "إنشاء حساب",
      tab_login: "تسجيل الدخول",
      method_email: "البريد",
      method_phone: "الهاتف",
      label_name: "الاسم الكامل",
      label_email: "البريد الإلكتروني",
      label_password: "كلمة المرور",
      label_confirm: "تأكيد كلمة المرور",
      label_phone: "رقم الجوال",
      ph_name: "مثال: مريم المرّي",
      ph_email: "you@example.com",
      ph_password: "6 أحرف على الأقل",
      ph_confirm: "أعد كتابة كلمة المرور",
      ph_phone: "50 123 4567",
      btn_create: "إنشاء الحساب",
      btn_continue: "متابعة",
      btn_send_code: "إرسال رمز التحقق",
      btn_verify: "تحقّق وتابع",
      btn_login_action: "تسجيل الدخول",
      otp_title: "أدخل الرمز",
      otp_resend: "إعادة إرسال الرمز",
      otp_back: "← استخدم رقماً آخر",
      switch_to_login: "لديك حساب؟ سجّل الدخول",
      switch_to_signup: "جديد هنا؟ أنشئ حساباً",
      login_email_hint: "سجّل الدخول بالبريد وكلمة المرور اللذين سجّلت بهما.",

      search_placeholder: "ابحث أو ابدأ محادثة جديدة",
      msg_placeholder: "اكتب رسالة",
      menu_newchat: "محادثة جديدة",
      menu_theme: "تبديل المظهر",
      menu_language: "English",
      menu_logout: "تسجيل الخروج",
      chats_heading: "المحادثات",
      empty_title: "صوا ويب",
      empty_sub: "اختر محادثة لتبدأ المراسلة. رسائلك مشفّرة بالكامل.",
      encryption_note: "🔒 مشفّر من طرف إلى طرف",
      online: "متصل",
      typing: "يكتب…",
      newchat_title: "ابدأ محادثة جديدة",
      newchat_sub: "اختر جهة اتصال أو أدخل اسماً.",
      newchat_name_ph: "اسم جهة الاتصال",
      newchat_create: "ابدأ المحادثة",
      today: "اليوم",
      yesterday: "أمس",
    },
  };

  var LANG_KEY = "sawa:lang";

  function current() {
    try { return localStorage.getItem(LANG_KEY) === "ar" ? "ar" : "en"; }
    catch (e) { return "en"; }
  }

  function t(key, lang) {
    var l = lang || current();
    var table = DICT[l] || DICT.en;
    return table[key] != null ? table[key] : (DICT.en[key] != null ? DICT.en[key] : key);
  }

  function apply(root) {
    var lang = current();
    var scope = root || document;
    if (!root) {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
    scope.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"), lang);
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder"), lang));
    });
    scope.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"), lang));
    });
  }

  function set(lang) {
    var l = lang === "ar" ? "ar" : "en";
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
    apply();
    return l;
  }

  function toggle() {
    return set(current() === "ar" ? "en" : "ar");
  }

  window.SawaI18n = { t: t, apply: apply, set: set, toggle: toggle, current: current };
})();
