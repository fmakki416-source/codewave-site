(function () {
  "use strict";

  const PURCHASE_KEY = "codewave_purchased";
  const money = (n) => STORE.currency + Number(n).toFixed(2);

  /* ---------- purchased-state (saved in this browser) ---------- */
  function getPurchased() {
    try { return JSON.parse(localStorage.getItem(PURCHASE_KEY)) || []; }
    catch (e) { return []; }
  }
  function markPurchased(id) {
    const list = getPurchased();
    if (!list.includes(id)) { list.push(id); localStorage.setItem(PURCHASE_KEY, JSON.stringify(list)); }
    updateDownloadCount();
  }
  function isPurchased(id) { return getPurchased().includes(id); }
  function videoById(id) { return VIDEOS.find((v) => v.id === id); }

  /* ---------- small helpers ---------- */
  function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = el('<div class="toast"></div>'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove("show"), 2200);
  }
  function copyText(text) {
    if (navigator.clipboard) { navigator.clipboard.writeText(text).then(() => toast("Copied")); }
    else { const i = el('<input>'); i.value = text; document.body.appendChild(i); i.select(); document.execCommand("copy"); i.remove(); toast("Copied"); }
  }

  /* ---------- embeddable preview (YouTube / Vimeo / mp4) ---------- */
  function previewMarkup(url) {
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
    if (yt) return `<iframe src="https://www.youtube.com/embed/${yt[1]}" allowfullscreen></iframe>`;
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return `<iframe src="https://player.vimeo.com/video/${vm[1]}" allowfullscreen></iframe>`;
    return `<video src="${esc(url)}" controls playsinline></video>`;
  }

  /* ---------- render the store ---------- */
  function renderHeader() {
    document.title = STORE.name + " — Buy & Download Videos";
    document.getElementById("logo").innerHTML = esc(STORE.name) + '<span class="dot">.</span>';
    document.getElementById("hero-tagline").textContent = STORE.tagline;
    document.getElementById("foot-name").textContent = STORE.name;
    document.getElementById("foot-year").textContent = new Date().getFullYear();
    const mail = document.getElementById("foot-mail");
    mail.href = "mailto:" + STORE.email; mail.textContent = STORE.email;
  }

  function thumbMarkup(v) {
    if (v.thumbnail) return `<img src="${esc(v.thumbnail)}" alt="${esc(v.title)}" loading="lazy">`;
    const hue = (v.id.charCodeAt(v.id.length - 1) * 47) % 360;
    return `<div class="thumb-fallback" style="background:linear-gradient(135deg,hsl(${hue},60%,28%),hsl(${(hue + 60) % 360},55%,20%))">${esc(v.title)}</div>`;
  }

  function cardMarkup(v) {
    const owned = isPurchased(v.id);
    return `
      <article class="card" data-id="${esc(v.id)}">
        <div class="thumb" data-action="preview" data-id="${esc(v.id)}">
          ${thumbMarkup(v)}
          ${v.preview ? '<div class="play-badge">&#9658;</div>' : ""}
          <span class="price-tag">${money(v.price)}</span>
          ${owned ? '<span class="owned-tag">PURCHASED</span>' : ""}
        </div>
        <div class="card-body">
          <h3>${esc(v.title)}</h3>
          <p class="desc">${esc(v.description)}</p>
          <div class="card-actions">
            ${v.preview ? `<button class="btn btn-ghost" data-action="preview" data-id="${esc(v.id)}">Preview</button>` : ""}
            ${owned
              ? `<button class="btn btn-primary" data-action="download" data-id="${esc(v.id)}">&#8681; Download</button>`
              : `<button class="btn btn-primary" data-action="buy" data-id="${esc(v.id)}">Buy now</button>`}
          </div>
        </div>
      </article>`;
  }

  function renderGrid() {
    const grid = document.getElementById("grid");
    if (!VIDEOS.length) { grid.innerHTML = '<p class="empty">No videos yet. Add some in <b>assets/config.js</b>.</p>'; return; }
    grid.innerHTML = VIDEOS.map(cardMarkup).join("");
  }

  function updateDownloadCount() {
    const n = getPurchased().length;
    const badge = document.getElementById("dl-count");
    badge.textContent = n; badge.style.display = n ? "inline-flex" : "none";
  }

  /* ---------- modal plumbing ---------- */
  const overlay = document.getElementById("modal-overlay");
  function openModal(innerHTML, wide) {
    overlay.innerHTML = `<div class="modal${wide ? " wide" : ""}" role="dialog" aria-modal="true">${innerHTML}</div>`;
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    overlay.classList.remove("open"); overlay.innerHTML = ""; document.body.style.overflow = "";
  }
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay.classList.contains("open")) closeModal(); });

  function modalHead(title, sub) {
    return `<div class="modal-head"><div><h3>${esc(title)}</h3>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</div>
            <button class="modal-close" data-action="close" aria-label="Close">&times;</button></div>`;
  }

  /* ---------- preview ---------- */
  function showPreview(v) {
    if (!v.preview) { openCheckout(v); return; }
    openModal(modalHead(v.title, "Free preview") +
      `<div class="modal-body"><div class="player">${previewMarkup(v.preview)}</div>
        <div style="margin-top:1rem">
          ${isPurchased(v.id)
            ? `<button class="btn btn-primary btn-block" data-action="download" data-id="${esc(v.id)}">&#8681; Download full video</button>`
            : `<button class="btn btn-primary btn-block" data-action="buy" data-id="${esc(v.id)}">Buy now — ${money(v.price)}</button>`}
        </div></div>`, true);
  }

  /* ---------- checkout: choose a payment method ---------- */
  function openCheckout(v) {
    const hasStripe = !!(v.stripeLink && v.stripeLink.trim());
    openModal(modalHead("Checkout", v.title) +
      `<div class="modal-body">
        <div class="pay-amount"><span class="label">Total to pay</span><span class="val">${money(v.price)}</span></div>

        <button class="pay-method apple" data-action="pay-apple" data-id="${esc(v.id)}" ${hasStripe ? "" : "disabled"}>
          <span class="pm-icon">&#63743;</span>
          <span>Apple&nbsp;Pay / Card${hasStripe ? "" : '<span class="pm-sub">Not set up for this video yet</span>'}</span>
          <span class="pm-arrow">&rsaquo;</span>
        </button>

        <button class="pay-method whish" data-action="pay-whish" data-id="${esc(v.id)}">
          <span class="pm-icon">&#128241;</span>
          <span>Pay with Whish<span class="pm-sub">Send Whish&#8594;Whish, then get your download</span></span>
          <span class="pm-arrow">&rsaquo;</span>
        </button>

        <p class="note">Secure checkout. You'll get the download link right after payment.</p>
      </div>`);
  }

  /* ---------- Apple Pay / Card via Stripe ---------- */
  function payApple(v) {
    if (!v.stripeLink) return;
    window.open(v.stripeLink, "_blank", "noopener");
    openModal(modalHead("Finish in the new tab", v.title) +
      `<div class="modal-body">
        <p style="color:var(--muted)">A secure Stripe page opened in a new tab where you can pay with
        <b>Apple&nbsp;Pay</b> or a card. After paying you'll be sent back here and your download will appear automatically.</p>
        <p class="note">Tab didn't open? <a href="${esc(v.stripeLink)}" target="_blank" rel="noopener" style="color:var(--accent)">Click here to pay</a>.</p>
        <button class="btn btn-ghost btn-block" data-action="close" style="margin-top:1rem">Close</button>
      </div>`);
  }

  /* ---------- Whish payment ---------- */
  function payWhish(v) {
    const ref = "CW-" + v.id.toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    openModal(modalHead("Pay with Whish", v.title) +
      `<div class="modal-body">
        <ol class="whish-steps">
          <li>Open the <b>Whish</b> app and choose <b>Whish&nbsp;to&nbsp;Whish</b> (send money).</li>
          <li>Send <b>${money(v.price)}</b> to the number below (${esc(STORE.whishName)}).</li>
          <li>Come back and tap <b>“I’ve sent the payment”</b> to unlock your download.</li>
        </ol>

        <div class="copy-row">
          <div><span class="clabel">Whish number</span><span class="ctext">${esc(STORE.whishNumber)}</span></div>
          <button class="copy-btn" data-action="copy" data-copy="${esc(STORE.whishNumber)}">Copy</button>
        </div>
        <div class="copy-row">
          <div><span class="clabel">Amount</span><span class="ctext">${money(v.price)}</span></div>
          <button class="copy-btn" data-action="copy" data-copy="${esc(Number(v.price).toFixed(2))}">Copy</button>
        </div>
        <div class="copy-row">
          <div><span class="clabel">Reference (write in the note)</span><span class="ctext">${esc(ref)}</span></div>
          <button class="copy-btn" data-action="copy" data-copy="${esc(ref)}">Copy</button>
        </div>

        <button class="btn btn-primary btn-block" data-action="whish-done" data-id="${esc(v.id)}" data-ref="${esc(ref)}" style="margin-top:1rem">
          I’ve sent the payment
        </button>
        <p class="note">After you tap the button we’ll also open WhatsApp so you can send your payment screenshot to the seller for confirmation.</p>
      </div>`);
  }

  function whishDone(v, ref) {
    markPurchased(v.id);
    // open a pre-filled WhatsApp message so the buyer can send proof to the seller
    const msg = "Hi " + STORE.whishName + "! I paid " + money(v.price) +
      " via Whish for \"" + v.title + "\" (ref " + ref + "). Here is my payment screenshot:";
    const waUrl = "https://wa.me/" + encodeURIComponent(STORE.whatsappNumber) + "?text=" + encodeURIComponent(msg);
    setTimeout(() => window.open(waUrl, "_blank", "noopener"), 400);
    showSuccess(v);
  }

  /* ---------- success + download ---------- */
  function showSuccess(v) {
    openModal(
      `<div class="modal-body" style="text-align:center;padding-top:1.5rem">
        <div class="success-icon">&#10003;</div>
        <h3 style="font-size:1.3rem;margin-bottom:0.3rem">Payment received — thank you!</h3>
        <p style="color:var(--muted);margin-bottom:1.2rem">Your video is ready. Tap below to download <b>${esc(v.title)}</b>.</p>
        <a class="btn btn-primary btn-block" href="${esc(v.download)}" target="_blank" rel="noopener">&#8681; Download now</a>
        <button class="btn btn-ghost btn-block" data-action="close" style="margin-top:0.7rem">Done</button>
        <p class="note" style="text-align:left;margin-top:1rem">You can re-open this download anytime from <b>My downloads</b> at the top of the page (saved in this browser).</p>
      </div>`);
    renderGrid();
  }

  function showDownload(v) {
    openModal(modalHead("Your download", v.title) +
      `<div class="modal-body">
        <a class="btn btn-primary btn-block" href="${esc(v.download)}" target="_blank" rel="noopener">&#8681; Download ${esc(v.title)}</a>
        <button class="btn btn-ghost btn-block" data-action="close" style="margin-top:0.7rem">Close</button>
      </div>`);
  }

  /* ---------- My downloads ---------- */
  function showDownloadsList() {
    const owned = VIDEOS.filter((v) => isPurchased(v.id));
    const body = owned.length
      ? owned.map((v) => `
          <div class="copy-row" style="border-style:solid">
            <div><span class="ctext" style="font-size:0.98rem">${esc(v.title)}</span></div>
            <a class="copy-btn" href="${esc(v.download)}" target="_blank" rel="noopener">&#8681; Download</a>
          </div>`).join("")
      : '<p class="empty">No purchases yet. When you buy a video it will appear here.</p>';
    openModal(modalHead("My downloads", "Saved in this browser") + `<div class="modal-body">${body}</div>`);
  }

  /* ---------- one click handler for the whole page ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-action]");
    if (!t) return;
    const action = t.getAttribute("data-action");
    const v = t.dataset.id ? videoById(t.dataset.id) : null;
    switch (action) {
      case "close": closeModal(); break;
      case "copy": copyText(t.getAttribute("data-copy")); break;
      case "preview": if (v) showPreview(v); break;
      case "buy": if (v) openCheckout(v); break;
      case "pay-apple": if (v) payApple(v); break;
      case "pay-whish": if (v) payWhish(v); break;
      case "whish-done": if (v) whishDone(v, t.getAttribute("data-ref")); break;
      case "download": if (v) showDownload(v); break;
      case "downloads-list": showDownloadsList(); break;
    }
  });

  /* ---------- Stripe redirect: ?paid=VIDEO_ID unlocks the download ---------- */
  function handleStripeReturn() {
    const id = new URLSearchParams(location.search).get("paid");
    if (!id) return;
    const v = videoById(id);
    history.replaceState({}, "", location.pathname);
    if (v) { markPurchased(v.id); showSuccess(v); }
  }

  /* ---------- start ---------- */
  renderHeader();
  renderGrid();
  updateDownloadCount();
  handleStripeReturn();
})();
