/* ============================================================
   CODEWAVE — STORE SETTINGS  (the only file you need to edit)
   ------------------------------------------------------------
   HOW TO USE:
   • Change the text between the "quotes". Keep the quotes and commas.
   • To add a video, copy one { ... } block in the VIDEOS list below.
   • Save the file. That's it — your store updates automatically.

   GETTING YOUR VIDEO ONLINE (from your phone):
   1. Upload the video from your phone to Google Drive or Dropbox.
   2. Tap "Share" and choose "Anyone with the link".
   3. Copy that link and paste it into the "download" field of a video.

   TURNING ON APPLE PAY (optional, recommended):
   1. Make a free account at https://stripe.com
   2. Dashboard → Payment Links → create a link for the video, set its price.
   3. In the link settings, set "After payment" → "Redirect to a page" and
      paste your site address with ?paid=THE_VIDEO_ID at the end, e.g.
         https://yoursite.com/?paid=vid1
      (this makes the download appear automatically after they pay)
   4. Copy the payment link and paste it into the "stripeLink" field below.
   ============================================================ */

const STORE = {
  // Store name (top-left logo + browser tab)
  name: "CodeWave",

  // Short sentence shown on the homepage banner
  tagline: "Premium videos, straight from the creator.",

  // Currency symbol shown next to prices
  currency: "$",

  // ---- WHISH PAYMENT (Whish to Whish) ----
  // The number buyers send money to in the Whish app:
  whishNumber: "+961 76 135 019",
  // (Optional) Your name as it shows in Whish, so buyers know they have the right person.
  // Leave "" to just use the store name above.
  whishName: "",

  // ---- HOW BUYERS SEND YOU PROOF / REACH YOU ----
  // WhatsApp number, country code first, NUMBERS ONLY (no +, no spaces).
  // Example for Lebanon: "96171123456"
  whatsappNumber: "96176135019",
  // Backup contact email:
  email: "you@example.com",
};

/* ------------------------------------------------------------
   YOUR VIDEOS
   Copy a block to add more. Separate blocks with a comma.

   id          short unique code, no spaces (e.g. "vid1"). Never reuse one.
   title       the name buyers see
   description one or two short lines
   price       number only, no symbol (e.g. 9.99)
   thumbnail   link to a poster image (jpg/png), or "" for an auto cover
   preview     link to a free preview (mp4 / YouTube / Vimeo), or "" to hide
   download    the link buyers get AFTER paying (your Drive/Dropbox share link)
   stripeLink  your Stripe Payment Link (enables Apple Pay/card), or "" for Whish only
   ------------------------------------------------------------ */

const VIDEOS = [
  {
    id: "vid1",
    title: "Sample Video One",
    description: "Replace this with your own video and details.",
    price: 9.99,
    thumbnail: "",
    preview: "",
    download: "https://paste-your-google-drive-or-dropbox-link",
    stripeLink: "",
  },
  {
    id: "vid2",
    title: "Sample Video Two",
    description: "Another example — change the title, price and links.",
    price: 14.99,
    thumbnail: "",
    preview: "",
    download: "https://paste-your-google-drive-or-dropbox-link",
    stripeLink: "",
  },
  {
    id: "vid3",
    title: "Sample Video Three",
    description: "Delete the samples you don't need.",
    price: 19.99,
    thumbnail: "",
    preview: "",
    download: "https://paste-your-google-drive-or-dropbox-link",
    stripeLink: "",
  },
];
