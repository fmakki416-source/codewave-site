# Sawa 💬 — a WhatsApp-style messenger for the UAE

**Sawa** (Arabic for *“together”*) is a clean, WhatsApp-inspired messaging web app
branded for the United Arab Emirates. You can **sign up with your email** *or*
with a **UAE phone number (+971) and a verification code**, then chat in a
familiar messenger interface — light/dark mode, English/العربية, groups, emoji,
typing indicators and read receipts.

> ⚠️ **This is a front-end demo.** There is no server yet: accounts, the
> verification code and all messages are stored in your browser's
> `localStorage`. It’s a fully working prototype you can click through — see
> [**Connecting a real backend**](#connecting-a-real-backend) to make sign-up,
> SMS codes and messages work for real users.

---

## ✨ Features

- **Two ways to sign up** — email + password, or a UAE `+971` mobile number with a 6-digit code.
- **WhatsApp-style chat** — conversation list, message bubbles, ✓✓ read ticks, day separators, typing indicator.
- **Lively demo contacts** — a “Sawa Team” bot replies to keywords (try `help`), and contacts/groups auto-reply.
- **Start new chats**, search, and emoji picker.
- **Dark mode** 🌗 and a **bilingual EN / العربية** toggle with full right-to-left support.
- **Persists locally** — your session and chats survive a page reload.
- **Responsive** — works as a desktop “web” layout and a mobile single-pane layout.
- **Zero dependencies / no build step** — plain HTML, CSS and vanilla JavaScript.

## 🚀 Run it locally

Because the app uses `localStorage`, serve it over `http://` (don’t just
double-click the file):

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, the VS Code “Live Server” extension, etc.).

## 🌐 Deploy (GitHub Pages)

This is a static site, so you can host it for free:

1. Push to GitHub.
2. **Settings → Pages → Build and deployment → Deploy from a branch.**
3. Pick your branch and the `/ (root)` folder, then **Save**.
4. Your site goes live at `https://<user>.github.io/<repo>/`.

## 📁 Project structure

```
index.html            Landing page + sign-up / log-in modal
chat.html             The messenger app
assets/
  css/
    base.css          Theme variables, buttons, form controls, toasts
    landing.css       Landing page + auth modal styles
    chat.css          Chat application layout
  js/
    i18n.js           Tiny EN / AR translation helper (RTL aware)
    store.js          localStorage data layer (users, sessions, chats, UAE phone helpers)
    auth.js           Sign-up / log-in logic + simulated phone OTP
    chat.js           Chat UI logic (list, conversation, replies, settings)
```

## 🔐 A note on the “demo” auth

So you can click through the whole flow without a server:

- The **phone verification code is generated in the browser** and shown on screen
  (no SMS is actually sent).
- Passwords are run through a **non-cryptographic hash** only so they aren’t
  stored in plain text — this is **not real security**. Don’t use a real password.

---

## Connecting a real backend

The app talks to a small data layer in [`assets/js/store.js`](assets/js/store.js)
(`window.SawaStore`) and the auth flow in [`assets/js/auth.js`](assets/js/auth.js).
To go live, swap that local layer for a real backend. Three good options:

### Option A — Firebase (recommended for email **and** phone sign-up)

Firebase is the easiest path because **Phone (SMS OTP)** and **Email/Password**
auth are built in, it works from a static site (no server to run), and
**Cloud Firestore** gives you real-time message sync. Free tier is generous;
note SMS for phone auth requires the pay-as-you-go (Blaze) plan and is billed
per message.

1. Create a project at <https://console.firebase.google.com>.
2. **Build → Authentication → Sign-in method**: enable **Email/Password** and **Phone**.
3. **Build → Firestore Database**: create a database.
4. **Project settings → Your apps → Web**: copy the config snippet.
5. Add the SDK and config to the pages, then replace the `SawaStore`/`auth.js`
   calls. Phone sign-up maps directly to Firebase:

   ```html
   <script type="module">
     import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
     import {
       getAuth, RecaptchaVerifier, signInWithPhoneNumber,
       createUserWithEmailAndPassword, signInWithEmailAndPassword
     } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

     const app  = initializeApp({ /* paste your config here */ });
     const auth = getAuth(app);

     // Phone: send a real SMS code, then confirm it
     const verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
     const confirmation = await signInWithPhoneNumber(auth, "+971501234567", verifier);
     await confirmation.confirm(codeTheUserTyped);   // ← replaces the demo OTP

     // Email
     await createUserWithEmailAndPassword(auth, email, password);
     await signInWithEmailAndPassword(auth, email, password);
   </script>
   ```

   Store and stream messages from Firestore (a `chats/{id}/messages` collection)
   instead of `localStorage`.

### Option B — Supabase (open-source, Postgres)

<https://supabase.com> gives you Postgres + Auth + Realtime. It supports email
**and** phone OTP (`supabase.auth.signInWithOtp({ phone })`, then `verifyOtp`).
You’ll connect an SMS provider (Twilio, MessageBird, Vonage) for phone codes.
Realtime subscriptions replace the local message store.

### Option C — Your own server (most control)

Run a small **Node/Express** (or any) API with a database (Postgres/MongoDB),
issue **JWT** sessions, and send SMS codes via **Twilio Verify**. Add
**Socket.IO** (or WebSockets) for live messaging. The most flexible option, but
you have to host and secure it yourself.

### Whichever you choose

- Keep messages **server-side** and add real **end-to-end encryption** if you
  advertise it.
- Validate UAE numbers on the server too (`assets/js/store.js` has the
  `normalizePhone` / `isValidPhone` helpers you can reuse).
- Never ship secret API keys in client code — use server-side keys / rules.

---

## Disclaimer

This is an independent demo project for educational purposes. It is **not
affiliated with, endorsed by, or connected to WhatsApp or Meta**. “WhatsApp” is
a trademark of its respective owner and is referenced only to describe the style
of interface.
