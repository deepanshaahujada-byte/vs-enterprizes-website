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

  /* ---------- typewriter (reusable) ------------------------------------------
     Each target carries the real copy in a visually-hidden sibling span (so
     screen readers get it whole, instantly); the target itself is typed into
     for sighted users. */

  function typeInto(el, delay) {
    var text = el.previousElementSibling.textContent.trim();
    if (reduceMotion || forceStatic) { el.textContent = text; return; }
    window.setTimeout(function () {
      el.classList.add("typing");
      var i = 0;
      var perChar = Math.max(12, Math.min(45, 2000 / text.length));
      (function type() {
        el.textContent = text.slice(0, ++i);
        if (i < text.length) window.setTimeout(type, perChar);
        else el.classList.remove("typing");
      })();
    }, delay);
  }

  // home hero: starts once the line has finished fading into place
  // (--i:2 => 240ms delay + 800ms transition, see .hero-copy > * above)
  var heroLede = document.querySelector(".hero-copy .lede-type");
  if (heroLede) typeInto(heroLede, 1040);

  // interior page heroes: no fade choreography to wait for, just a short beat
  document.querySelectorAll(".page-hero .lede-type").forEach(function (el) {
    typeInto(el, 480);
  });

  /* ---------- scroll parallax ------------------------------------------------
     [data-parallax="24"] drifts within +/-24px as its section crosses the
     viewport. rAF-throttled, single shared listener. */

  var parallaxEls = document.querySelectorAll("[data-parallax]");
  if (parallaxEls.length && !reduceMotion && !forceStatic) {
    var pxTicking = false;
    function updateParallax() {
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var amt = parseFloat(el.getAttribute("data-parallax")) || 20;
        var rect = el.getBoundingClientRect();
        var center = rect.top + rect.height / 2;
        var progress = (center - vh / 2) / (vh / 2); // -1 (above) .. 1 (below)
        var py = Math.max(-1, Math.min(1, progress)) * amt;
        el.style.setProperty("--py", py.toFixed(1));
      });
      pxTicking = false;
    }
    window.addEventListener("scroll", function () {
      if (!pxTicking) { window.requestAnimationFrame(updateParallax); pxTicking = true; }
    }, { passive: true });
    updateParallax();
  }

  /* ---------- cta-band cursor spotlight --------------------------------------- */

  if (!reduceMotion) {
    document.querySelectorAll(".cta-band").forEach(function (band) {
      band.addEventListener("mousemove", function (e) {
        var rect = band.getBoundingClientRect();
        band.style.setProperty("--mx", ((e.clientX - rect.left) / rect.width * 100) + "%");
        band.style.setProperty("--my", ((e.clientY - rect.top) / rect.height * 100) + "%");
      });
    });
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

  /* ---------- years since incorporation (2022-01-01) -----------------------
     Ceil, not floor: "under N years" stays true indefinitely instead of
     going stale the way a hardcoded string does. Feeds both stat tiles
     (via data-count, read by the counter block below) and inline prose. */

  var INCORPORATED = new Date(2022, 0, 1);
  var yearsActive = Math.ceil((new Date() - INCORPORATED) / (365.25 * 24 * 3600 * 1000));

  document.querySelectorAll("[data-years-count]").forEach(function (el) {
    el.setAttribute("data-count", yearsActive);
  });
  document.querySelectorAll("[data-years-inline]").forEach(function (el) {
    el.textContent = yearsActive;
  });

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
