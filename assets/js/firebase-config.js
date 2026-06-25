/* ============================================================
   Sawa — Firebase configuration
   ------------------------------------------------------------
   Sawa works in two modes:

     • LOCAL  (default) — accounts, the verification code and
       messages live only in this browser. Great for a demo.

     • FIREBASE          — REAL email + phone (SMS) sign-up and
       messages saved in Cloud Firestore, synced across devices.

   To switch ON the real backend:
     1) Create a project at https://console.firebase.google.com
     2) Authentication → Sign-in method → enable
          "Email/Password"  AND  "Phone"
     3) Firestore Database → create database (production mode)
        and paste the rules from `firestore.rules` (in repo root)
     4) Project settings → Your apps → Web app → copy the config
     5) Paste the values below and set  enabled: true

   See README → "Connecting a real backend" for full steps.

   Note: the values below are NOT secrets — Firebase web config is
   meant to be public. Your data is protected by the Firestore
   security rules, not by hiding these keys.
   ============================================================ */
window.SAWA_FIREBASE = {
  // Flip to true after pasting your real config below.
  enabled: false,

  // Firebase SDK version loaded from the CDN.
  sdkVersion: "10.12.0",

  config: {
    apiKey: "PASTE_YOUR_API_KEY",
    authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
    projectId: "PASTE_YOUR_PROJECT_ID",
    storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
    messagingSenderId: "PASTE_YOUR_SENDER_ID",
    appId: "PASTE_YOUR_APP_ID",
  },
};
