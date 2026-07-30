/* VS Assist: a small rule-based helper that answers from site content.
   No backend, no tracking. Anything it cannot answer is routed to email,
   WhatsApp or phone. The whole widget is built here so pages only need
   one script tag. */

(function () {
  "use strict";

  var EMAIL = "info@vsenterprizes.com";
  var TEL = "+919217305535";
  var WA = "https://wa.me/919217305535";
  var PHONE = "+91 92173 05535";

  /* ---------- knowledge base ------------------------------------------- */

  var INTENTS = [
    {
      keys: ["service", "offer", "what do you do", "subcontractor", "partner", "supplier", "vendor"],
      reply: "We're a principal EPC contractor: we bid for and execute our own institutional work orders, tender to handover, with no advisory layer. We also partner with construction and solar subcontractors on active sites. See <a href='services.html'>Work with us</a>."
    },
    {
      keys: ["tender", "bid", "procurement", "gem", "cppp", "gfr", "compliance", "msme", "registration", "udyam", "pwd", "ireps"],
      reply: "We operate under GeM, CPPP and GFR 2017, and hold Udyam/MSME (women-owned), PWD contractor and IREPS vendor registrations. See <a href='compliance.html'>Compliance</a>."
    },
    {
      keys: ["solar", "renewable", "energy", "water heater", "bis", "mnre", "green", "swhs"],
      reply: "144 solar water heating sites executed for the Border Security Force: BIS-approved and MNRE-approved systems, multi-brand, multi-location deployment. See <a href='sector-renewable.html'>Renewable Energy Infrastructure</a>."
    },
    {
      keys: ["build", "construction", "infrastructure", "site", "works", "supervision", "barrack", "housing", "government"],
      reply: "Institutional and civil infrastructure for defense and paramilitary campuses: barracks, housing, mess and administrative buildings, built end to end by our own on-site team. See <a href='sector-works.html'>Institutional &amp; Civil Infrastructure</a>."
    },
    {
      keys: ["road", "bridge", "highway", "campus development", "utilities"],
      reply: "RCC approach roads, internal campus development and utilities coordination, sequenced alongside the buildings they serve. See <a href='sector-campus-road.html'>Campus &amp; Road Infrastructure</a>."
    },
    {
      keys: ["career", "job", "hiring", "vacanc", "apply", "recruit", "position", "salary", "cv", "resume"],
      reply: "We are hiring: Procurement &amp; Materials Manager (featured), Chief Project Engineer, Electrical Engineer, Billing Engineer and Office Assistant. Roles and how to apply are on the <a href='careers.html'>Careers page</a>."
    },
    {
      keys: ["contact", "phone", "call", "email", "address", "office", "noida", "lucknow", "where", "location", "reach"],
      reply: "Corporate office: 1519, Tower A, Spectrum Metro Mall, Sector 75, Noida. Registered office: Sainik Nagar, Telibagh, Lucknow. Call <a href='tel:" + TEL + "'>" + PHONE + "</a> or email <a href='mailto:" + EMAIL + "'>" + EMAIL + "</a>. More on <a href='contact.html'>Contact us</a>."
    },
    {
      keys: ["about", "who are you", "who is", "company", "vs enterprises", "team", "mission", "vision"],
      reply: "VS Enterprises is a women-owned, MSME-registered EPC contractor delivering institutional, civil and renewable energy infrastructure across India, trusted by ITBP and BSF. Our story is on the <a href='about.html'>About page</a>."
    },
    {
      keys: ["hello", "hi ", "hey", "namaste", "good morning", "good evening"],
      reply: "Hello! Ask me about our sectors, open jobs, compliance, or how to reach us."
    },
    {
      keys: ["thank", "great", "ok", "nice"],
      reply: "Happy to help. Anything else about our sectors or careers?"
    }
  ];

  var FALLBACK =
    "I could not find that on our site, but a person can help. " +
    "<span class='vsb-actions'>" +
    "<a class='vsb-chip-link' data-mailto='1' href='#'>Email this question</a>" +
    "<a class='vsb-chip-link' href='" + WA + "' target='_blank' rel='noopener'>WhatsApp us</a>" +
    "<a class='vsb-chip-link' href='tel:" + TEL + "'>Call " + PHONE + "</a>" +
    "</span>";

  var SUGGESTIONS = ["What do you do?", "Are you hiring?", "Solar products", "How do I contact you?"];

  function answer(q) {
    var t = " " + q.toLowerCase() + " ";
    var best = null, score = 0;
    INTENTS.forEach(function (intent) {
      var s = 0;
      intent.keys.forEach(function (k) { if (t.indexOf(k) !== -1) s += k.length; });
      if (s > score) { score = s; best = intent; }
    });
    return best ? best.reply : null;
  }

  /* ---------- widget DOM ------------------------------------------------- */

  var root = document.createElement("div");
  root.className = "vsb";
  root.innerHTML =
    '<button class="vsb-fab" aria-expanded="false" aria-label="Chat with VS Assist">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
    "</button>" +
    '<section class="vsb-panel" aria-label="VS Assist chat" hidden>' +
    '<header class="vsb-head"><b>VS Assist</b><span>Automated helper</span><button class="vsb-close" aria-label="Close chat">&times;</button></header>' +
    '<div class="vsb-log" role="log" aria-live="polite"></div>' +
    '<div class="vsb-chips"></div>' +
    '<form class="vsb-input"><label class="sr-only" for="vsb-q">Your question</label>' +
    '<input id="vsb-q" type="text" placeholder="Ask about services, jobs, contact..." autocomplete="off" maxlength="200">' +
    '<button type="submit" aria-label="Send">&rarr;</button></form>' +
    "</section>";
  document.body.appendChild(root);

  var fab = root.querySelector(".vsb-fab");
  var panel = root.querySelector(".vsb-panel");
  var log = root.querySelector(".vsb-log");
  var chips = root.querySelector(".vsb-chips");
  var form = root.querySelector(".vsb-input");
  var input = root.querySelector("#vsb-q");
  var lastQuestion = "";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function bubble(html, who) {
    var el = document.createElement("div");
    el.className = "vsb-msg " + who;
    el.innerHTML = html;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function botSay(html) {
    if (reduceMotion) { bubble(html, "bot"); return; }
    var dots = bubble('<span class="vsb-dots"><i></i><i></i><i></i></span>', "bot");
    window.setTimeout(function () {
      dots.innerHTML = html;
      log.scrollTop = log.scrollHeight;
    }, 500);
  }

  function renderChips() {
    chips.innerHTML = "";
    SUGGESTIONS.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = s;
      b.addEventListener("click", function () { ask(s); });
      chips.appendChild(b);
    });
  }

  function ask(q) {
    lastQuestion = q;
    bubble(q.replace(/&/g, "&amp;").replace(/</g, "&lt;"), "user");
    var a = answer(q);
    botSay(a || FALLBACK);
    chips.innerHTML = "";
  }

  // auto-focus pops the on-screen keyboard on touch devices, shrinking the
  // already-tight panel further, so only do it where a precise pointer
  // (mouse/trackpad) suggests there is no virtual keyboard to worry about
  var canAutoFocus = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function openPanel(open) {
    panel.hidden = !open;
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    root.classList.toggle("open", open);
    if (open && !log.children.length) {
      botSay("Hi, I am VS Assist. I answer from this site's content. What would you like to know?");
      renderChips();
    }
    if (open && canAutoFocus) input.focus();
  }

  fab.addEventListener("click", function () { openPanel(panel.hidden); });
  root.querySelector(".vsb-close").addEventListener("click", function () { openPanel(false); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    input.value = "";
    ask(q);
  });

  // fallback "email this question" carries the user's question into the draft
  log.addEventListener("click", function (e) {
    var a = e.target.closest("[data-mailto]");
    if (!a) return;
    e.preventDefault();
    location.href = "mailto:" + EMAIL +
      "?subject=" + encodeURIComponent("Website enquiry") +
      "&body=" + encodeURIComponent(lastQuestion || "");
  });
})();
