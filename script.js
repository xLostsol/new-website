(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Mobile navigation toggle
  var navToggle = document.querySelector(".nav-toggle");
  var navMenu = document.getElementById("nav-menu");

  if (navToggle && navMenu) {
    var closeMenu = function () {
      navToggle.setAttribute("aria-expanded", "false");
      navMenu.classList.remove("open");
    };

    navToggle.addEventListener("click", function () {
      var isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      navMenu.classList.toggle("open", !isOpen);
    });

    navMenu.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) closeMenu();
    });
  }

  // Navbar scroll state
  var navbar = document.getElementById("navbar");
  if (navbar) {
    var onScroll = function () {
      navbar.classList.toggle("scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Reveal cards as they scroll into view
  var revealTargets = document.querySelectorAll(".reveal");
  if (revealTargets.length) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealTargets.forEach(function (el) {
        el.classList.add("visible");
      });
    } else {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
      );
      revealTargets.forEach(function (el) {
        observer.observe(el);
      });
    }
  }

  // Starfield background
  var sky = document.getElementById("space-background");
  if (sky) {
    // Stars live in an oversized rotating layer; count is higher than the
    // visible amount because only the layer's center is on screen
    var starLayer = sky.querySelector(".stars") || sky;
    var fragment = document.createDocumentFragment();
    var STAR_COUNT = 300;

    for (var i = 0; i < STAR_COUNT; i++) {
      var star = document.createElement("span");
      star.className = Math.random() < 0.08 ? "star star-bright" : "star";

      var size = Math.random() * 2 + 0.5;
      star.style.width = size + "px";
      star.style.height = size + "px";
      star.style.top = Math.random() * 100 + "%";
      star.style.left = Math.random() * 100 + "%";
      star.style.setProperty(
        "--twinkle-duration",
        (Math.random() * 4 + 3).toFixed(2) + "s"
      );
      star.style.setProperty(
        "--twinkle-delay",
        (Math.random() * 6).toFixed(2) + "s"
      );
      star.style.setProperty(
        "--star-opacity",
        (Math.random() * 0.5 + 0.3).toFixed(2)
      );

      fragment.appendChild(star);
    }

    starLayer.appendChild(fragment);
  }

  // Page swipe transitions: exit animation on click, entry animation is
  // applied by the inline head script via sessionStorage + [data-enter]
  var PAGE_ORDER = [
    "index.html",
    "experience.html",
    "projects.html",
    "education.html",
    "contact.html",
  ];

  var pageFile = function (path) {
    var file = path.split("/").pop();
    return file === "" ? "index.html" : file;
  };

  var pageIndex = function (path) {
    var i = PAGE_ORDER.indexOf(pageFile(path));
    return i === -1 ? 0 : i;
  };

  // Celestial bodies glide to this page's position. The head script set
  // data-page to the previous page, so switching it here animates the
  // CSS left/top transition from where they were last seen.
  var currentPage = String(pageIndex(location.pathname));
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.documentElement.setAttribute("data-page", currentPage);
    });
  });
  try {
    sessionStorage.setItem("prev-page", currentPage);
  } catch (e) {}

  document.addEventListener("click", function (event) {
    if (prefersReducedMotion) return;
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    // The page-swipe transition belongs to the galaxy; Stars mode navigates
    // plainly with no swipe (and no transition delay)
    if (document.documentElement.getAttribute("data-bg") !== "galaxy") return;

    var link = event.target.closest("a");
    if (!link || link.target === "_blank" || link.origin !== location.origin)
      return;

    var file = pageFile(link.pathname);
    if (PAGE_ORDER.indexOf(file) === -1) return;
    if (file === pageFile(location.pathname)) return;

    event.preventDefault();
    var dir =
      pageIndex(link.pathname) > pageIndex(location.pathname)
        ? "forward"
        : "back";
    try {
      sessionStorage.setItem("nav-dir", dir);
    } catch (e) {}
    document.documentElement.classList.add("page-exit-" + dir);
    setTimeout(function () {
      location.href = link.href;
    }, 380);
  });

  // Reset transition state when restored from the back/forward cache
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      var root = document.documentElement;
      root.classList.remove("page-exit-forward", "page-exit-back");
      root.removeAttribute("data-enter");
    }
  });

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Background style toggle: calm starfield vs animated galaxy. The choice
  // persists in localStorage, and the galaxy's WebGL loop is started/stopped
  // so "Stars" mode costs no GPU.
  var bgButtons = document.querySelectorAll(".bg-toggle-btn");
  if (bgButtons.length) {
    var bgRoot = document.documentElement;
    var applyBgMode = function (mode, persist) {
      mode = mode === "galaxy" ? "galaxy" : "stars";
      bgRoot.setAttribute("data-bg", mode);
      bgButtons.forEach(function (b) {
        b.setAttribute(
          "aria-pressed",
          String(b.getAttribute("data-bg-mode") === mode)
        );
      });
      if (window.__bgGalaxy) {
        if (mode === "galaxy") window.__bgGalaxy.start();
        else window.__bgGalaxy.stop();
      }
      if (persist) {
        try {
          localStorage.setItem("bg-mode", mode);
        } catch (e) {}
      }
    };

    // Immersive "play" mode: hide the resume UI so the galaxy can be played
    // with freely. Entered by pressing Galaxy again while already in galaxy.
    var hintEl = null;
    var setImmersive = function (on) {
      bgRoot.classList.toggle("immersive", on);
      if (on) {
        if (!hintEl) {
          hintEl = document.createElement("div");
          hintEl.className = "bg-immersive-hint";
          hintEl.textContent =
            "Drag to spin · move your mouse · Esc or Galaxy to exit";
          document.body.appendChild(hintEl);
        }
        hintEl.classList.remove("show");
        void hintEl.offsetWidth; // restart the fade animation
        hintEl.classList.add("show");
      }
    };

    // Sync the buttons to the mode the inline head script already applied
    applyBgMode(bgRoot.getAttribute("data-bg") || "stars", false);

    bgButtons.forEach(function (b) {
      b.addEventListener("click", function () {
        var target = b.getAttribute("data-bg-mode");
        // Pressing Galaxy while already in galaxy toggles immersive play mode
        if (target === "galaxy" && bgRoot.getAttribute("data-bg") === "galaxy") {
          setImmersive(!bgRoot.classList.contains("immersive"));
        } else {
          setImmersive(false);
          applyBgMode(target, true);
        }
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && bgRoot.classList.contains("immersive")) {
        setImmersive(false);
      }
    });
  }

  // Galaxy color palette picker (galaxy mode only). Each preset feeds the
  // galaxy's two gradient endpoints (core -> edge); the choice persists and is
  // re-applied by galaxy3d.js on build.
  var palette = document.querySelector(".palette");
  if (palette) {
    var PALETTES = {
      default: { in: "#e39b00", out: "#6432ff" },
      cool: { in: "#2fd6e6", out: "#2a48d8" },
      warm: { in: "#ffb42a", out: "#e6478c" },
      aurora: { in: "#3ce69b", out: "#9a5cff" },
    };
    var paletteBtn = palette.querySelector(".palette-btn");
    var swatches = palette.querySelectorAll(".palette-swatch");
    var customIn = palette.querySelector('input[data-custom="in"]');
    var customOut = palette.querySelector('input[data-custom="out"]');

    var applyColors = function (inHex, outHex) {
      if (window.__bgGalaxy && window.__bgGalaxy.setColors) {
        window.__bgGalaxy.setColors(inHex, outHex);
      }
    };

    var persistPalette = function (name, inHex, outHex) {
      try {
        localStorage.setItem("galaxy-palette", name);
        localStorage.setItem(
          "galaxy-colors",
          JSON.stringify({ in: inHex, out: outHex })
        );
      } catch (e) {}
    };

    // Highlight the active preset; "custom" matches nothing, clearing them all
    var markSelected = function (name) {
      swatches.forEach(function (s) {
        s.setAttribute(
          "aria-pressed",
          String(s.getAttribute("data-palette") === name)
        );
      });
    };

    var syncCustomInputs = function (inHex, outHex) {
      if (customIn) customIn.value = inHex;
      if (customOut) customOut.value = outHex;
    };

    // Restore the saved palette (default if none saved)
    var savedName = "default";
    var savedColors = PALETTES.default;
    try {
      var sn = localStorage.getItem("galaxy-palette");
      if (sn) savedName = sn;
      var sc = JSON.parse(localStorage.getItem("galaxy-colors"));
      if (sc && sc.in && sc.out) savedColors = sc;
    } catch (e) {}
    markSelected(savedName);
    syncCustomInputs(savedColors.in, savedColors.out);
    applyColors(savedColors.in, savedColors.out);

    var setOpen = function (open) {
      palette.setAttribute("data-open", String(open));
      if (paletteBtn) paletteBtn.setAttribute("aria-expanded", String(open));
    };

    if (paletteBtn) {
      paletteBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        setOpen(palette.getAttribute("data-open") !== "true");
      });
    }

    swatches.forEach(function (s) {
      s.addEventListener("click", function () {
        var name = s.getAttribute("data-palette");
        var p = PALETTES[name];
        if (!p) return;
        markSelected(name);
        syncCustomInputs(p.in, p.out);
        applyColors(p.in, p.out);
        persistPalette(name, p.in, p.out);
      });
    });

    var onCustom = function () {
      var inHex = customIn ? customIn.value : savedColors.in;
      var outHex = customOut ? customOut.value : savedColors.out;
      markSelected("custom");
      applyColors(inHex, outHex);
      persistPalette("custom", inHex, outHex);
    };
    if (customIn) customIn.addEventListener("input", onCustom);
    if (customOut) customOut.addEventListener("input", onCustom);

    // Close the panel on an outside click or Escape
    document.addEventListener("click", function (e) {
      if (
        palette.getAttribute("data-open") === "true" &&
        !palette.contains(e.target)
      ) {
        setOpen(false);
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && palette.getAttribute("data-open") === "true") {
        setOpen(false);
      }
    });
  }
})();
