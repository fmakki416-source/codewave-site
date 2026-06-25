# Sawa 💬 — a WhatsApp-style messenger for the UAE

**Sawa** (Arabic for *“together”*) is a clean, WhatsApp-inspired messaging web app
branded for the United Arab Emirates. You can **sign up with your email** *or*
with a **UAE phone number (+971) and a verification code**, then chat in a
familiar messenger interface — light/dark mode, English/العربية, groups, emoji,
typing indicators and read receipts.

> ⚙️ **Two modes, one codebase.** Out of the box Sawa runs in **local demo
> mode** — accounts, the verification code and messages are stored in your
> browser's `localStorage`, so you can click through everything with no setup.
> A **Firebase backend is already wired in**: add your keys and flip one flag to
> get *real* email + phone-SMS sign-up and messages saved in the cloud. See
> [**Connecting a real backend**](#connecting-a-real-backend).

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
firestore.rules       Firestore security rules (for the Firebase backend)
assets/
  css/
    base.css          Theme variables, buttons, form controls, toasts
    landing.css       Landing page + auth modal styles
    chat.css          Chat application layout
  js/
    i18n.js           Tiny EN / AR translation helper (RTL aware)
    store.js          localStorage data layer (users, chats, UAE phone helpers)
    firebase-config.js  Your Firebase keys + the on/off switch
    backend.js        Adapter: routes auth + data to Firebase OR local demo
    auth.js           Sign-up / log-in UI logic (email + phone code)
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

Sawa already ships with a **Firebase backend built in** (see
[`assets/js/backend.js`](assets/js/backend.js)). The app routes every account
and data action through `window.SawaBackend`, which automatically uses Firebase
when it's configured and the local demo otherwise — so you don't have to rewrite
any UI code.

### ✅ Option A — Firebase (recommended, already integrated)

Firebase is the easiest path: **Phone (SMS code)** and **Email/Password** auth
are built in, it runs from a static site (no server), and **Cloud Firestore**
stores messages. The free *Spark* plan covers email auth; **phone/SMS auth
requires the pay-as-you-go *Blaze* plan** and is billed a small amount per SMS.

**Turn it on — 5 steps, ~10 minutes:**

1. **Create a project** at <https://console.firebase.google.com>.
2. **Authentication → Sign-in method:** enable **Email/Password** *and* **Phone**.
   (For Phone, upgrade the project to the **Blaze** plan when prompted.)
3. **Firestore Database → Create database** (Production mode). Open the **Rules**
   tab and paste the contents of [`firestore.rules`](firestore.rules), then **Publish**.
4. **Project settings ⚙️ → Your apps → Web (`</>`)**: register an app and copy the
   `firebaseConfig` values.
5. Open [`assets/js/firebase-config.js`](assets/js/firebase-config.js), paste your
   values, and set **`enabled: true`**.

That's it — sign-up now creates real Firebase accounts (real SMS codes for phone
sign-up) and conversations are saved per-user in Firestore. If `enabled` is
`false` or the keys are still placeholders, Sawa transparently falls back to the
local demo.

> **Add your domain:** for SMS to work on your live site, add your domain under
> **Authentication → Settings → Authorized domains** (`localhost` is allowed by
> default for testing).

> **Heads-up on cost & limits:** phone auth needs the Blaze plan and a payment
> method; SMS is charged per message and is rate-limited per number/day. For
> local testing you can add **test phone numbers** with fixed codes under
> **Authentication → Sign-in method → Phone → Phone numbers for testing**.

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
