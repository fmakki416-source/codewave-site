# Marhaba — Messaging for the UAE 🇦🇪

A WhatsApp-style messaging web app built for the United Arab Emirates. Sign up
with your **phone number** (with `+971` defaulted and an OTP step) or your
**email**, then chat in a familiar WhatsApp-Web-style interface.

> **Heads up — this is a front-end demo.** There is no server. "Accounts",
> conversations, and verification codes are all simulated in the browser using
> `localStorage`. No real SMS is sent (the OTP is shown on screen), messages are
> auto-replied by canned responses, and "end-to-end encryption" is described in
> the UI but not actually performed. Do not use it for real private messaging.

## Features

- **Landing page** — hero, features, security and "for the UAE" sections.
- **Sign up / log in two ways:**
  - 📱 **Phone** — country selector (defaults to 🇦🇪 +971), UAE mobile validation
    (`5x xxx xxxx`), and a 6-digit OTP step (code is shown for the demo).
  - ✉️ **Email** — name, email and password with validation.
- **WhatsApp-Web-style chat:**
  - Sidebar with searchable chat list, avatars, unread badges, timestamps.
  - Conversation view with message bubbles, read receipts (✓✓), day separators,
    a typing indicator, and the signature chat wallpaper.
  - UAE-flavoured seed contacts and groups (Family, Dubai Marina building, work).
  - Contacts auto-reply so conversations feel alive; everything persists per user.
- **Responsive** — desktop two-pane layout collapses to a single pane with a
  back button on mobile.
- **Resilient storage** — falls back to in-memory state if `localStorage` is
  unavailable (e.g. private browsing).

## Run it

It's a static site — no build step. Just open `index.html`:

```bash
# option A: open the file directly
open index.html            # macOS  (use xdg-open on Linux)

# option B: serve it (recommended so localStorage uses a real origin)
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project structure

```
index.html              # markup for all three screens (landing / auth / chat)
assets/
  css/style.css         # all styling, incl. responsive + chat wallpaper
  js/
    store.js            # localStorage persistence, users/session, seed chats
    auth.js             # phone-OTP + email sign-up / log-in logic
    chat.js             # chat list + conversation UI and auto-replies
    main.js             # screen router / bootstrap
```

## Notes & ideas for going further

To make this production-grade you'd add a real backend: an SMS/OTP provider
(e.g. for `+971` numbers), hashed credentials, a real-time transport
(WebSocket), and genuine end-to-end encryption (e.g. the Signal protocol).

---

Made with 💚 in the UAE. © 2026 Marhaba (demo).
