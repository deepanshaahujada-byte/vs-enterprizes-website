/* VS Assist: a small rule-based helper that answers from site content.
   No backend, no tracking. Anything it cannot answer is routed to email,
   WhatsApp or phone. The whole widget is built here so pages only need
   one script tag. */

(function () {
  "use strict";

  var EMAIL = "info@vsenterprizes.com";
  var WA = "https://wa.me/919919039916";
  var PHONE = "+91 99190 39916";

  /* ---------- knowledge base ------------------------------------------- */

  var INTENTS = [
    {
      keys: ["service", "offer", "what do you do", "help", "consult", "dispute", "advice", "strategy"],
      reply: "We provide strategic procurement advice, tender preparation and review, project monitoring, and dispute resolution during projects. The full picture is on our <a href='services.html'>Services page</a>."
    },
    {
      keys: ["tender", "bid", "procurement", "gem", "cppp", "gfr", "compliance", "msme", "government"],
      reply: "We work inside India's public-procurement framework daily: GeM, CPPP, GFR 2017 and EPC contracting. Our mentors bring 20+ years of experience across 1000+ tender applications. See <a href='compliance.html'>Compliance</a> and <a href='services.html'>Services</a>."
    },
    {
      keys: ["solar", "renewable", "energy", "water heater", "bis", "mnre", "green"],
      reply: "We sell and install BIS-approved FPC solar water heaters and MNRE-approved ETC systems for government agencies, and consult on commercial, technical and regulatory aspects of renewables. Details: <a href='sector-renewable.html'>Renewable Energy Consultancy</a>."
    },
    {
      keys: ["build", "construction", "road", "bridge", "highway", "infrastructure", "site", "works", "supervision", "mall"],
      reply: "Our works consultancy covers buildings, shopping complexes, roads, highways and bridges, with on-site management, quality control, HSE and claim support from veteran retired government engineers. See <a href='sector-works.html'>Works Consultancy</a>."
    },
    {
      keys: ["security", "surveillance", "bdds", "drone", "equipment", "goods"],
      reply: "Under goods &amp; services we cover security and surveillance systems, BDDS equipment from leading OEMs, and basic drone pilot training. See <a href='sector-goods.html'>Goods &amp; Service Consultancy</a>."
    },
    {
      keys: ["career", "job", "hiring", "vacanc", "apply", "recruit", "position", "salary", "cv", "resume"],
      reply: "We are hiring: Procurement &amp; Materials Manager (featured), Chief Project Engineer, Electrical Engineer, Billing Engineer, Accountant and Office Assistant. Roles and how to apply are on the <a href='careers.html'>Careers page</a>."
    },
    {
      keys: ["contact", "phone", "call", "email", "address", "office", "noida", "lucknow", "where", "location", "reach"],
      reply: "Corporate office: Tower A-1519, Spectrum Metro Mall, Sector 75, Noida. Registered office: Sainik Nagar, Telibagh, Lucknow. Call <a href='tel:+919919039916'>+91 99190 39916</a> or email <a href='mailto:" + EMAIL + "'>" + EMAIL + "</a>. More on <a href='contact.html'>Contact us</a>."
    },
    {
      keys: ["about", "who are you", "who is", "company", "vs enterprises", "team", "mission", "vision"],
      reply: "VS Enterprises is a fast-growing EPC firm delivering civil and solar infrastructure projects across India, and an advisory partner for public procurement. Our story is on the <a href='about.html'>About page</a>."
    },
    {
      keys: ["hello", "hi ", "hey", "namaste", "good morning", "good evening"],
      reply: "Hello! Ask me about our services, sectors, open jobs, compliance, or how to reach us."
    },
    {
      keys: ["thank", "great", "ok", "nice"],
      reply: "Happy to help. Anything else about our services, sectors or careers?"
    }
  ];

  var FALLBACK =
    "I could not find that on our site, but a person can help. " +
    "<span class='vsb-actions'>" +
    "<a class='vsb-chip-link' data-mailto='1' href='#'>Email this question</a>" +
    "<a class='vsb-chip-link' href='" + WA + "' target='_blank' rel='noopener'>WhatsApp us</a>" +
    "<a class='vsb-chip-link' href='tel:+919919039916'>Call " + PHONE + "</a>" +
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

  function openPanel(open) {
    panel.hidden = !open;
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    root.classList.toggle("open", open);
    if (open && !log.children.length) {
      botSay("Hi, I am VS Assist. I answer from this site's content. What would you like to know?");
      renderChips();
    }
    if (open) input.focus();
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
