/* ==========================================================================
   Maryam Rafique — Portfolio Scripts
   No dependencies. Everything below is vanilla JS.
   ========================================================================== */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var prefersReducedTransparency = window.matchMedia("(prefers-reduced-transparency: reduce)").matches;

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
  var navbarTicking = false;
  window.addEventListener("scroll", function () {
    if (navbarTicking) return;
    navbarTicking = true;
    requestAnimationFrame(function () {
      updateNavbarState();
      navbarTicking = false;
    });
  }, { passive: true });

  /* ---------------------------------------------------------------------
     Expose the navbar's real height as a CSS var so the Work section's
     sticky stack cards can pin themselves just below it
     --------------------------------------------------------------------- */
  function updateNavbarHeightVar() {
    document.documentElement.style.setProperty("--navbar-h", navbar.offsetHeight + "px");
  }
  updateNavbarHeightVar();
  window.addEventListener("resize", updateNavbarHeightVar);

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
     Active nav-link highlighting — this is now a multi-page site, so the
     active link is simply whichever nav item points at the current page
     (compared by filename, so it works the same from file:// or a server).
     --------------------------------------------------------------------- */
  var currentPage = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".navbar__links a, .mobile-nav nav a").forEach(function (link) {
    var href = link.getAttribute("href");
    if (!href) return;
    var hrefPage = href.split("#")[0].split("/").pop();
    if (hrefPage === currentPage) link.classList.add("is-active");
  });

  /* ---------------------------------------------------------------------
     Scroll-triggered reveal animations, staggered within each group
     --------------------------------------------------------------------- */
  var staggerGroups = document.querySelectorAll(".skills__cloud, .accordion, .hero__trusted-chips, .timeline, .work-preview__grid");
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
            var el = entry.target;
            // will-change only while the transition actually runs, then released —
            // leaving it on permanently on every .reveal element wastes GPU memory.
            el.style.willChange = "transform, opacity";
            el.classList.add("is-visible");
            el.addEventListener("transitionend", function clearWillChange(e) {
              if (e.target !== el) return;
              el.style.willChange = "auto";
              el.removeEventListener("transitionend", clearWillChange);
            });
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
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
     Work section: scroll-driven stacking cards. Each card is its own
     position:sticky element with an increasing top offset, so the pile
     peeks like a deck of cards. The slide-up-from-bottom entrance is a
     native CSS scroll-driven animation (animation-timeline: view()) tied
     straight to each card's own scroll position — continuous, never a
     class-toggle pop. Browsers without support fall back to the JS
     updateEntryFallback() below, which sets the same opacity/transform
     continuously from a scroll listener instead. Separately, once a card
     is covered by the next one, updateBury() dims/shrinks its inner panel —
     that part is always JS since no CSS timeline tracks "am I covered by
     a later sibling."
     --------------------------------------------------------------------- */
  var stackWrappers = document.querySelectorAll(".stack-card-wrapper");
  var supportsViewTimeline = window.CSS && CSS.supports && CSS.supports("animation-timeline: view()");

  if (stackWrappers.length > 1 && !prefersReducedMotion) {
    var DWELL = 500; // px of extra scroll each card holds still before the next covers it
    var BURY_DISTANCE = 650; // px the next card travels (toward its own resting spot) over which the shrink/dim ramps in
    var pinTops = []; // each card's resting `top` value in px, cached so the scroll handler doesn't call getComputedStyle

    function layoutStack() {
      for (var i = 0; i < stackWrappers.length; i++) {
        var sticky = stackWrappers[i].querySelector(".stack-card");
        if (!sticky) continue;
        pinTops[i] = parseFloat(getComputedStyle(sticky).top) || 0;
        if (i < stackWrappers.length - 1) {
          stackWrappers[i].style.height = sticky.offsetHeight + DWELL + "px";
        }
      }
    }

    // Continuous per-card entrance progress based purely on the card's own position in the
    // viewport — mirrors the CSS `animation-range: entry 0% cover 40%` timing so the JS
    // fallback matches native behavior: 0 when the card's top is at the viewport bottom,
    // 1 once it has scrolled up by 40% of the viewport height.
    function entryProgress(card) {
      var top = card.getBoundingClientRect().top;
      var vh = window.innerHeight;
      var start = vh;
      var end = vh * 0.6;
      return Math.min(Math.max((start - top) / (start - end), 0), 1);
    }

    function updateEntryFallback() {
      stackWrappers.forEach(function (wrapper) {
        var card = wrapper.querySelector(".stack-card");
        if (!card) return;
        var p = entryProgress(card);
        card.style.opacity = p.toFixed(3);
        card.style.transform = "translateY(" + (120 * (1 - p)).toFixed(1) + "px) scale(" + (0.96 + 0.04 * p).toFixed(3) + ")";
      });
    }

    function updateBury() {
      for (var i = 0; i < stackWrappers.length - 1; i++) {
        var panel = stackWrappers[i].querySelector(".stack-card__panel");
        var nextSticky = stackWrappers[i + 1].querySelector(".stack-card");
        if (!panel || !nextSticky) continue;

        // Progress is driven purely by how close the NEXT card is to its own resting
        // position — not by comparing it to the current card's position, which keeps
        // sliding indefinitely once released and would make the math non-monotonic.
        var nextTop = nextSticky.getBoundingClientRect().top;
        var nextPinTop = pinTops[i + 1];
        var progress = 1 - (nextTop - nextPinTop) / BURY_DISTANCE;
        progress = Math.min(Math.max(progress, 0), 1);

        panel.style.setProperty("--bury-scale", (1 - 0.05 * progress).toFixed(4));
        panel.style.setProperty("--bury-opacity", (1 - 0.15 * progress).toFixed(4));
      }
    }

    function updateStack() {
      updateBury();
      if (!supportsViewTimeline) updateEntryFallback();
    }

    var stackTicking = false;
    function onStackScroll() {
      if (!stackTicking) {
        requestAnimationFrame(function () {
          updateStack();
          stackTicking = false;
        });
        stackTicking = true;
      }
    }

    layoutStack();
    updateStack();
    window.addEventListener("scroll", onStackScroll, { passive: true });

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        layoutStack();
        updateStack();
      }, 150);
    });
  }

  /* ---------------------------------------------------------------------
     Testimonials auto-carousel (testimonials.html): continuous auto-scroll,
     pause on hover, drag/swipe (pointer events cover mouse + touch), and
     arrow buttons. Under reduced motion it becomes a plain native-scroll
     strip instead — no cloning, no autoplay, no drag JS needed.
     --------------------------------------------------------------------- */
  var tCarousel = document.querySelector(".t-carousel");
  var tTrack = document.getElementById("testimonialTrack");

  if (tCarousel && tTrack) {
    if (prefersReducedMotion) {
      var prevBtnRM = document.getElementById("testimonialPrev");
      var nextBtnRM = document.getElementById("testimonialNext");
      if (nextBtnRM) {
        nextBtnRM.addEventListener("click", function () {
          tTrack.scrollBy({ left: tTrack.clientWidth * 0.85, behavior: "smooth" });
        });
      }
      if (prevBtnRM) {
        prevBtnRM.addEventListener("click", function () {
          tTrack.scrollBy({ left: -tTrack.clientWidth * 0.85, behavior: "smooth" });
        });
      }
    } else {
      // Duplicate the card set once so translateX can loop seamlessly forever.
      var originalCards = Array.prototype.slice.call(tTrack.children);
      originalCards.forEach(function (card) {
        var clone = card.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        tTrack.appendChild(clone);
      });

      var pos = 0;
      var speed = 0.45; // px per frame
      var singleSetWidth = 0;
      var isDragging = false;
      var dragStartX = 0;
      var dragStartPos = 0;
      var paused = false;
      var resumeTimer = null;

      function measure() {
        singleSetWidth = tTrack.scrollWidth / 2;
      }
      measure();
      window.addEventListener("resize", measure);

      function wrap() {
        if (singleSetWidth <= 0) return;
        while (pos <= -singleSetWidth) pos += singleSetWidth;
        while (pos > 0) pos -= singleSetWidth;
      }

      function render() {
        tTrack.style.transform = "translateX(" + pos.toFixed(1) + "px)";
      }

      function tick() {
        if (!paused && !isDragging) {
          pos -= speed;
          wrap();
          render();
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);

      function pauseTemporarily() {
        paused = true;
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(function () { paused = false; }, 2500);
      }

      tCarousel.addEventListener("mouseenter", function () { paused = true; });
      tCarousel.addEventListener("mouseleave", function () { if (!isDragging) paused = false; });

      tTrack.addEventListener("pointerdown", function (e) {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartPos = pos;
        tTrack.classList.add("is-dragging");
        tTrack.setPointerCapture(e.pointerId);
      });
      tTrack.addEventListener("pointermove", function (e) {
        if (!isDragging) return;
        pos = dragStartPos + (e.clientX - dragStartX);
        render();
      });
      function endDrag() {
        if (!isDragging) return;
        isDragging = false;
        tTrack.classList.remove("is-dragging");
        wrap();
        pauseTemporarily();
      }
      tTrack.addEventListener("pointerup", endDrag);
      tTrack.addEventListener("pointercancel", endDrag);

      var cardStep = 0;
      function measureStep() {
        var firstCard = tTrack.querySelector(".testimonial-card");
        if (!firstCard) return;
        var style = getComputedStyle(tTrack);
        cardStep = firstCard.getBoundingClientRect().width + parseFloat(style.gap || 24);
      }
      measureStep();
      window.addEventListener("resize", measureStep);

      var nextBtn = document.getElementById("testimonialNext");
      var prevBtn = document.getElementById("testimonialPrev");
      if (nextBtn) {
        nextBtn.addEventListener("click", function () {
          pos -= cardStep;
          wrap();
          render();
          pauseTemporarily();
        });
      }
      if (prevBtn) {
        prevBtn.addEventListener("click", function () {
          pos += cardStep;
          wrap();
          render();
          pauseTemporarily();
        });
      }
    }
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

  /* ---------------------------------------------------------------------
     About page: auto-calculate age from data-dob, falling back to the
     static value already in the markup if anything goes wrong
     --------------------------------------------------------------------- */
  var ageEl = document.getElementById("ageValue");
  if (ageEl && ageEl.dataset.dob) {
    var dob = new Date(ageEl.dataset.dob);
    if (!isNaN(dob.getTime())) {
      var today = new Date();
      var age = today.getFullYear() - dob.getFullYear();
      var hasHadBirthdayThisYear =
        today.getMonth() > dob.getMonth() ||
        (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
      if (!hasHadBirthdayThisYear) age--;
      ageEl.textContent = age;
    }
  }

  /* ---------------------------------------------------------------------
     Liquid Glass specular sheen: tracks the cursor over glass cards so the
     highlight moves like light catching curved glass. Desktop-only (touch
     devices have no hovering pointer to track), rAF-throttled so a burst of
     native pointermove events collapses into at most one layout-forcing
     getBoundingClientRect() + style write per animation frame, and gated by
     IntersectionObserver so it does nothing for cards off-screen. Skipped
     entirely under reduced motion / reduced transparency — the CSS already
     hides the sheen in that case, so this would just be dead work.
     --------------------------------------------------------------------- */
  var isDesktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!prefersReducedMotion && !prefersReducedTransparency && isDesktopPointer) {
    document.querySelectorAll(".specular").forEach(function (el) {
      var inView = !("IntersectionObserver" in window);
      var ticking = false;
      var pendingX = 0;
      var pendingY = 0;

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          inView = entries[0].isIntersecting;
        }).observe(el);
      }

      el.addEventListener("pointermove", function (e) {
        if (!inView) return;
        pendingX = e.clientX;
        pendingY = e.clientY;
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var rect = el.getBoundingClientRect();
          el.style.setProperty("--mx", ((pendingX - rect.left) / rect.width) * 100 + "%");
          el.style.setProperty("--my", ((pendingY - rect.top) / rect.height) * 100 + "%");
          ticking = false;
        });
      });
    });
  }

  /* ---------------------------------------------------------------------
     Custom cursor: a Photoshop-style pen-tool nib that follows the mouse,
     with a trailing "anchor point" dot, a connecting line, and a soft baked
     shadow that lags/stretches with velocity. Desktop/fine-pointer only —
     on touch devices the native cursor is left alone entirely (elements are
     never created).

     Perf history: an earlier version used filter: drop-shadow() on the pen
     icon, mix-blend-mode on a shadow + glow layer, and document.elementFromPoint
     sampled every 6th frame to detect light/dark backgrounds. That combination
     was the actual cause of the jank — mix-blend-mode on a constantly-moving,
     high-z-index element forces the browser to recomposite everything painted
     underneath it every frame, drop-shadow forces its own repaint pass on a
     moving element, and elementFromPoint forces a synchronous layout on every
     call. None of that is here anymore:
       - the shadow's soft edge is a radial-gradient (a plain paint), not a
         filter — nothing to recompute as it moves, the compositor just
         translates the layer.
       - no mix-blend-mode anywhere; dark-background awareness is a CSS class
         (.is-dark-zone) toggled by native pointerover/pointerout on specific
         [data-cursor-dark] elements (the project thumbnails) — event-driven,
         zero per-frame cost, and CSS handles the color crossfade itself.
       - no elementFromPoint / getComputedStyle in the loop at all.
     Everything below writes ONLY transform per frame, in this ONE rAF loop.
     Hover/click feedback lives on a nested inner element (.cursor-pen__icon)
     so its CSS-transitioned transform never collides with the outer
     element's per-frame position transform.
     --------------------------------------------------------------------- */
  if (isDesktopPointer) {
    document.documentElement.classList.add("has-custom-cursor");

    var shadowEl = document.createElement("div");
    shadowEl.className = "cursor-shadow";

    var penEl = document.createElement("div");
    penEl.className = "cursor-pen";
    penEl.innerHTML =
      '<svg class="cursor-pen__icon" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">' +
      '<path d="M4 26 L17.5 19.5 L24 6 L10.5 12.5 Z" fill="#E5681C" stroke="#111114" stroke-width="1" stroke-linejoin="round"/>' +
      '<line x1="4" y1="26" x2="24" y2="6" stroke="#111114" stroke-width="0.75" stroke-opacity="0.5"/>' +
      '<circle cx="18" cy="12" r="1.4" fill="#FAFAF8" stroke="#111114" stroke-width="0.5"/>' +
      "</svg>";

    var dotEl = document.createElement("div");
    dotEl.className = "cursor-dot";

    var lineEl = document.createElement("div");
    lineEl.className = "cursor-line";

    document.body.appendChild(shadowEl);
    document.body.appendChild(lineEl);
    document.body.appendChild(dotEl);
    document.body.appendChild(penEl);

    // Tip of the nib sits at SVG-local (4, 26) — offset the translate by that
    // amount so the mouse coordinate lands exactly on the tip, not the icon's
    // top-left corner.
    var PEN_TIP_X = 4;
    var PEN_TIP_Y = 26;

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var penX = mouseX;
    var penY = mouseY;
    var dotX = mouseX;
    var dotY = mouseY;
    var prevPenX = penX;
    var prevPenY = penY;
    var shadowX = penX;
    var shadowY = penY;
    var hasMoved = false;

    window.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      hasMoved = true;
    }, { passive: true });

    var HOVER_SELECTOR = "a, button, input, textarea, select, label, summary, [role='button']";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest(HOVER_SELECTOR)) {
        penEl.classList.add("is-hover");
        dotEl.classList.add("is-hover");
      }
    }, { passive: true });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest(HOVER_SELECTOR)) {
        penEl.classList.remove("is-hover");
        dotEl.classList.remove("is-hover");
      }
    }, { passive: true });
    window.addEventListener("mousedown", function () {
      penEl.classList.add("is-active");
      dotEl.classList.add("is-active");
    }, { passive: true });
    window.addEventListener("mouseup", function () {
      penEl.classList.remove("is-active");
      dotEl.classList.remove("is-active");
    }, { passive: true });

    // Dark-background awareness without ever touching elementFromPoint: HTML
    // marks the few actually-dark surfaces (project thumbnails) with
    // [data-cursor-dark], and native pointerover/pointerout on those specific
    // elements flips a class on the shadow. No scroll listener, no per-frame
    // check — this only runs when the pointer actually enters/exits one of
    // those elements.
    document.addEventListener("pointerover", function (e) {
      if (e.target.closest && e.target.closest("[data-cursor-dark]")) {
        shadowEl.classList.add("is-dark-zone");
      }
    }, { passive: true });
    document.addEventListener("pointerout", function (e) {
      if (e.target.closest && e.target.closest("[data-cursor-dark]")) {
        shadowEl.classList.remove("is-dark-zone");
      }
    }, { passive: true });

    function tickCursor() {
      if (hasMoved) {
        if (prefersReducedMotion) {
          // No trailing lag, no parallax/stretch: snap the nib straight to the
          // pointer and hold the anchor dot + shadow at fixed offsets so it
          // still reads as a pen tool, just without any eased motion.
          penX = mouseX;
          penY = mouseY;
          dotX = penX - 18;
          dotY = penY + 18;
          shadowX = penX + 8;
          shadowY = penY + 10;
        } else {
          penX += (mouseX - penX) * 0.2;
          penY += (mouseY - penY) * 0.2;
          dotX += (penX - dotX) * 0.12;
          dotY += (penY - dotY) * 0.12;
        }

        penEl.style.transform = "translate3d(" + (penX - PEN_TIP_X) + "px, " + (penY - PEN_TIP_Y) + "px, 0)";
        dotEl.style.transform = "translate3d(" + dotX + "px, " + dotY + "px, 0)";

        var dx = penX - dotX;
        var dy = penY - dotY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var angle = Math.atan2(dy, dx);
        lineEl.style.transform =
          "translate3d(" + dotX + "px, " + dotY + "px, 0) rotate(" + angle + "rad) scaleX(" + dist + ")";

        if (!prefersReducedMotion) {
          // Velocity-driven parallax: the shadow lags opposite the direction of
          // travel and stretches along it, like it's being dragged — reinforces
          // the "floating above the page" feel instead of a shadow glued flat
          // underneath.
          var vx = penX - prevPenX;
          var vy = penY - prevPenY;
          var speed = Math.sqrt(vx * vx + vy * vy);
          var targetShadowX = penX + 8 - vx * 1.4;
          var targetShadowY = penY + 10 - vy * 1.4;
          shadowX += (targetShadowX - shadowX) * 0.25;
          shadowY += (targetShadowY - shadowY) * 0.25;

          var stretch = 1 + Math.min(speed * 0.05, 1.4);
          var shadowAngle = speed > 1.5 ? Math.atan2(vy, vx) : 0;
          shadowEl.style.transform =
            "translate3d(" + shadowX + "px, " + shadowY + "px, 0) rotate(" + shadowAngle + "rad) scaleX(" + stretch + ")";
        } else {
          shadowEl.style.transform = "translate3d(" + shadowX + "px, " + shadowY + "px, 0)";
        }

        prevPenX = penX;
        prevPenY = penY;
      }
      requestAnimationFrame(tickCursor);
    }
    requestAnimationFrame(tickCursor);
  }
})();
