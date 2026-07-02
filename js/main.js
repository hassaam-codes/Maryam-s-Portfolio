/* ==========================================================================
   Maryam Rafique — Portfolio Scripts
   No dependencies. Everything below is vanilla JS.
   ========================================================================== */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------------
     Sticky navbar: add blurred background once the page is scrolled
     --------------------------------------------------------------------- */
  var navbar = document.getElementById("navbar");
  function updateNavbarState() {
    if (window.scrollY > 12) {
      navbar.classList.add("is-scrolled");
    } else {
      navbar.classList.remove("is-scrolled");
    }
  }
  updateNavbarState();
  window.addEventListener("scroll", updateNavbarState, { passive: true });

  /* ---------------------------------------------------------------------
     Mobile full-screen nav
     --------------------------------------------------------------------- */
  var burgerBtn = document.getElementById("burgerBtn");
  var mobileNav = document.getElementById("mobileNav");
  var mobileNavClose = document.getElementById("mobileNavClose");

  function openMobileNav() {
    mobileNav.classList.add("is-open");
    burgerBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function closeMobileNav() {
    mobileNav.classList.remove("is-open");
    burgerBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  burgerBtn.addEventListener("click", openMobileNav);
  mobileNavClose.addEventListener("click", closeMobileNav);
  mobileNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeMobileNav);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && mobileNav.classList.contains("is-open")) closeMobileNav();
  });

  /* ---------------------------------------------------------------------
     Active nav-link highlighting as the matching section scrolls into view
     --------------------------------------------------------------------- */
  var navLinks = document.querySelectorAll("[data-nav-link]");
  var trackedSections = [];
  navLinks.forEach(function (link) {
    var id = link.getAttribute("href");
    var section = id && id.charAt(0) === "#" ? document.querySelector(id) : null;
    if (section) trackedSections.push({ link: link, section: section });
  });

  if (trackedSections.length && "IntersectionObserver" in window) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var match = trackedSections.find(function (t) { return t.section === entry.target; });
          if (!match) return;
          if (entry.isIntersecting) {
            navLinks.forEach(function (l) { l.classList.remove("is-active"); });
            match.link.classList.add("is-active");
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    trackedSections.forEach(function (t) { navObserver.observe(t.section); });
  }

  /* ---------------------------------------------------------------------
     Scroll-triggered reveal animations, staggered within each group
     --------------------------------------------------------------------- */
  var staggerGroups = document.querySelectorAll(".project-grid, .testimonial-grid, .skills__cloud, .accordion, .hero__trusted-chips");
  staggerGroups.forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.setProperty("--stagger", Math.min(i, 8));
    });
  });

  var revealEls = document.querySelectorAll(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------------------------------------------------------------------
     Credibility stat count-up, triggered once when scrolled into view
     --------------------------------------------------------------------- */
  var countEls = document.querySelectorAll(".js-count");
  function animateCount(el) {
    var target = parseFloat(el.dataset.countTo || "0");
    var decimals = parseInt(el.dataset.decimals || "0", 10);
    var suffix = el.dataset.suffix || "";

    if (prefersReducedMotion) {
      el.textContent = target.toFixed(decimals) + suffix;
      return;
    }

    var duration = 1400;
    var startTime = null;
    function tick(now) {
      if (startTime === null) startTime = now;
      var progress = Math.min((now - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (countEls.length) {
    if ("IntersectionObserver" in window) {
      var countObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              countObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.6 }
      );
      countEls.forEach(function (el) { countObserver.observe(el); });
    } else {
      countEls.forEach(animateCount);
    }
  }

  /* ---------------------------------------------------------------------
     Project filter buttons
     --------------------------------------------------------------------- */
  var filterButtons = document.querySelectorAll(".filter-btn");
  var projectCards = document.querySelectorAll(".project-card");

  function applyFilter(filter) {
    projectCards.forEach(function (card) {
      var matches = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("is-shown", matches);
    });
  }
  applyFilter("all");

  filterButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterButtons.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      applyFilter(btn.dataset.filter);
    });
  });

  /* ---------------------------------------------------------------------
     Project lightbox / case study modal
     --------------------------------------------------------------------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxBackdrop = document.getElementById("lightboxBackdrop");
  var lightboxClose = document.getElementById("lightboxClose");
  var lightboxImage = document.getElementById("lightboxImage");
  var lightboxTag = document.getElementById("lightboxTag");
  var lightboxTitle = document.getElementById("lightboxTitle");
  var lightboxProblem = document.getElementById("lightboxProblem");
  var lightboxApproach = document.getElementById("lightboxApproach");
  var lightboxResult = document.getElementById("lightboxResult");
  var lastFocusedEl = null;

  function openLightbox(card) {
    var img = card.querySelector("img");
    lightboxImage.src = img.src;
    lightboxImage.alt = img.alt;
    lightboxTag.textContent = card.dataset.tag || "";
    lightboxTitle.textContent = card.dataset.title || "";
    lightboxProblem.textContent = card.dataset.problem || "";
    lightboxApproach.textContent = card.dataset.approach || "";
    lightboxResult.textContent = card.dataset.result || "";

    lastFocusedEl = document.activeElement;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  projectCards.forEach(function (card) {
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "View case study: " + (card.dataset.title || ""));
    card.addEventListener("click", function () { openLightbox(card); });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(card);
      }
    });
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxBackdrop.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
  });

  /* ---------------------------------------------------------------------
     Animated bio: rotating keyword
     --------------------------------------------------------------------- */
  var rotatingWordEl = document.getElementById("rotatingWord");
  var rotatingWords = ["Brand Identity", "Social Media", "Visual Storytelling"];
  var rotatingIndex = 0;

  if (rotatingWordEl && !prefersReducedMotion) {
    setInterval(function () {
      rotatingWordEl.classList.add("is-swapping");
      setTimeout(function () {
        rotatingIndex = (rotatingIndex + 1) % rotatingWords.length;
        rotatingWordEl.textContent = rotatingWords[rotatingIndex];
        rotatingWordEl.classList.remove("is-swapping");
      }, 350);
    }, 2600);
  }

  /* ---------------------------------------------------------------------
     FAQ accordion — one open at a time, smooth height animation
     --------------------------------------------------------------------- */
  var accordionTriggers = document.querySelectorAll(".accordion__trigger");

  accordionTriggers.forEach(function (trigger) {
    var panel = trigger.parentElement.nextElementSibling;
    panel.style.maxHeight = "0px";

    trigger.addEventListener("click", function () {
      var isOpen = trigger.getAttribute("aria-expanded") === "true";

      accordionTriggers.forEach(function (otherTrigger) {
        var otherPanel = otherTrigger.parentElement.nextElementSibling;
        otherTrigger.setAttribute("aria-expanded", "false");
        otherPanel.style.maxHeight = "0px";
      });

      if (!isOpen) {
        trigger.setAttribute("aria-expanded", "true");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  });
})();
