/* Site behaviour: loader, nav, scroll reveals, counters, contact form. */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var forceStatic = location.search.indexOf("static") !== -1; // testing hook: skip intro, reveal everything
  if (forceStatic) document.documentElement.classList.add("static");

  /* ---------- loader -------------------------------------------------------
     Full intro on the first page of the session; a quick 350ms wipe on every
     navigation after that (frequency gate: repeated waits are friction). */

  var loader = document.getElementById("loader");
  var seen = false;
  try { seen = sessionStorage.getItem("vs-seen") === "1"; sessionStorage.setItem("vs-seen", "1"); } catch (e) {}

  function ready() {
    document.body.classList.add("ready");
  }

  if (loader) {
    var delay = (reduceMotion || forceStatic) ? 0 : (seen ? 300 : 1500);
    if (seen || reduceMotion || forceStatic) loader.classList.add("quick");

    // brand name types itself out during the full intro
    var word = loader.querySelector(".loader-word");
    if (word && !seen && !reduceMotion) {
      var full = word.textContent;
      word.textContent = "";
      word.classList.add("typing");
      var ci = 0;
      (function type() {
        if (!document.body.contains(word)) return;
        word.textContent = full.slice(0, ++ci);
        if (ci < full.length) window.setTimeout(type, 60);
        else word.classList.remove("typing");
      })();
    }
    window.setTimeout(function () {
      loader.classList.add("done");
      ready();
      // drop it from the tree once the wipe finishes so it can't trap clicks
      window.setTimeout(function () { loader.remove(); }, 800);
    }, delay);
  } else {
    ready();
  }

  /* ---------- nav ----------------------------------------------------------
     Background appears once the page scrolls past a top sentinel
     (IntersectionObserver, not a scroll listener). */

  var nav = document.querySelector(".nav");
  if (nav) {
    var sentinel = document.createElement("div");
    sentinel.style.cssText = "position:absolute;top:0;height:24px;width:1px;pointer-events:none;";
    document.body.prepend(sentinel);
    new IntersectionObserver(function (entries) {
      nav.classList.toggle("scrolled", !entries[0].isIntersecting);
    }).observe(sentinel);

    // current page marker
    var here = location.pathname.split("/").pop() || "index.html";
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      var target = a.getAttribute("href");
      if (target === here) a.setAttribute("aria-current", "page");
      if (here.indexOf("sector-") === 0 && target === "sectors.html") a.setAttribute("aria-current", "page");
    });
  }

  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      }
    });
    // if the viewport grows past the mobile breakpoint while the menu is open,
    // the toggle disappears — release the scroll lock so the page never sticks
    window.matchMedia("(max-width: 860px)").addEventListener("change", function (e) {
      if (!e.matches) {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      }
    });
  }

  /* ---------- scroll reveals ---------------------------------------------- */

  var revealables = document.querySelectorAll("[data-reveal]");
  if (revealables.length && !reduceMotion && !forceStatic) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---------- counters ----------------------------------------------------- */

  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        cio.unobserve(entry.target);
        var el = entry.target;
        var target = parseInt(el.getAttribute("data-count"), 10);
        var suffix = el.getAttribute("data-suffix") || "";
        if (reduceMotion) { el.textContent = target + suffix; return; }
        var t0 = performance.now(), dur = 1400;
        (function tick(now) {
          var k = Math.min((now - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - k, 4);
          el.textContent = Math.round(target * eased) + suffix;
          if (k < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- footer year --------------------------------------------------- */

  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- announcement popup (dismiss persists across visits) ----------- */

  var notice = document.getElementById("notice");
  if (notice) {
    var NOTICE_KEY = "vs-notice-hiring-v1";
    var dismissed = false;
    try { dismissed = localStorage.getItem(NOTICE_KEY) === "1"; } catch (e) {}
    if (!dismissed) {
      window.setTimeout(function () {
        notice.hidden = false;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { notice.classList.add("show"); });
        });
      }, 2200);
      notice.querySelector(".notice-close").addEventListener("click", function () {
        notice.classList.remove("show");
        try { localStorage.setItem(NOTICE_KEY, "1"); } catch (e) {}
        window.setTimeout(function () { notice.hidden = true; }, 500);
      });
    }
  }

  /* ---------- contact form (mailto compose) --------------------------------- */

  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var msg = form.elements.message.value.trim();
      var company = form.elements.company ? form.elements.company.value.trim() : "";
      var phone = form.elements.phone ? form.elements.phone.value.trim() : "";
      var body = msg + "\n\n" + name +
        (company ? "\n" + company : "") +
        (phone ? "\n" + phone : "") +
        "\n" + email;
      location.href = "mailto:info@vsenterprizes.com" +
        "?subject=" + encodeURIComponent("Enquiry from " + name + " (vsenterprizes.com)") +
        "&body=" + encodeURIComponent(body);
    });
  }
})();
