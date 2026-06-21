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
    var spinSync = null; // assigned by the spin-slider block below
    var paletteSync = null; // assigned by the palette block below
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
      if (paletteSync) paletteSync(); // re-aim the palette at the active mode
      if (persist) {
        try {
          localStorage.setItem("bg-mode", mode);
        } catch (e) {}
      }
    };

    // Immersive "play" mode: hide the resume UI so the background can be played
    // with freely. Entered by pressing the active mode's button a second time:
    // Galaxy -> spinning galaxy, Stars -> long-exposure star trails.
    var hintEl = null;
    var setImmersive = function (on) {
      bgRoot.classList.toggle("immersive", on);
      var stars = bgRoot.getAttribute("data-bg") !== "galaxy";
      // The star-trail renderer only runs in immersive Stars mode.
      if (window.__bgStars) {
        if (on && stars) window.__bgStars.start();
        else window.__bgStars.stop();
      }
      if (spinSync) spinSync(); // aim the spin slider at the active mode
      if (on) {
        if (!hintEl) {
          hintEl = document.createElement("div");
          hintEl.className = "bg-immersive-hint";
          document.body.appendChild(hintEl);
        }
        hintEl.textContent = stars
          ? "Slider spins the star trails · Esc or Stars to exit"
          : "Drag to spin · slider sets a steady spin · Esc or Galaxy to exit";
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
        // Pressing the already-active mode's button toggles immersive play mode
        if (target === bgRoot.getAttribute("data-bg")) {
          setImmersive(!bgRoot.classList.contains("immersive"));
        } else {
          setImmersive(false);
          applyBgMode(target, true);
        }
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && bgRoot.classList.contains("immersive")) {
        // If the palette popover is open, let Escape close just the popover
        // (handled by the palette's own listener) instead of also exiting
        // immersive in the same keypress.
        var openPal = document.querySelector('.palette[data-open="true"]');
        if (openPal) return;
        setImmersive(false);
      }
    });
  }

  // Color palette picker. Mode-aware: in Galaxy mode it recolors the galaxy's
  // two gradient endpoints (core -> edge); in Stars mode it recolors the
  // starfield and long-exposure trails (bright -> faint). The custom picker is
  // a small in-page HSV picker (saturation/brightness pad + hue slider + hex)
  // so choosing a color is instant and themed instead of opening the OS dialog.
  var palette = document.querySelector(".palette");
  if (palette) {
    var THEMES = {
      galaxy: {
        title: "Galaxy Palette",
        aria: "Galaxy color palette",
        labelIn: "Core",
        labelOut: "Edge",
        presets: {
          default: { in: "#e39b00", out: "#6432ff" },
          cool: { in: "#2fd6e6", out: "#2a48d8" },
          warm: { in: "#ffb42a", out: "#e6478c" },
          aurora: { in: "#3ce69b", out: "#9a5cff" },
        },
      },
      stars: {
        title: "Stars Palette",
        aria: "Stars color palette",
        labelIn: "Bright",
        labelOut: "Faint",
        presets: {
          default: { in: "#ffffff", out: "#9ab4ff" },
          cool: { in: "#cfe0ff", out: "#5e7bff" },
          warm: { in: "#fff0d4", out: "#ff9a5c" },
          aurora: { in: "#c7ffe9", out: "#9a7bff" },
        },
      },
    };
    var paletteBtn = palette.querySelector(".palette-btn");
    var swatches = palette.querySelectorAll(".palette-swatch");
    var titleEl = palette.querySelector(".palette-title");

    var modeName = function () {
      return document.documentElement.getAttribute("data-bg") === "galaxy"
        ? "galaxy"
        : "stars";
    };
    var theme = function () {
      return THEMES[modeName()];
    };
    var keyName = function () {
      return modeName() + "-palette";
    };
    var keyColors = function () {
      return modeName() + "-colors";
    };

    // Send the chosen endpoints to whichever renderer the current mode drives.
    var applyColors = function (inHex, outHex) {
      if (modeName() === "galaxy") {
        if (window.__bgGalaxy && window.__bgGalaxy.setColors) {
          window.__bgGalaxy.setColors(inHex, outHex);
        }
      } else {
        if (window.__bgStars && window.__bgStars.setColors) {
          window.__bgStars.setColors(inHex, outHex);
        }
        // Tint the calm CSS starfield too (what's visible outside immersive)
        var root = document.documentElement;
        root.style.setProperty("--star-color", inHex);
        var f = hexToRgb(outHex);
        root.style.setProperty(
          "--star-glow",
          "rgba(" + f.r + "," + f.g + "," + f.b + ",0.55)"
        );
      }
    };

    var persistPalette = function (name, inHex, outHex) {
      try {
        localStorage.setItem(keyName(), name);
        localStorage.setItem(
          keyColors(),
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

    // ----- Color math (hex <-> HSV) for the in-page picker -----
    var clamp01 = function (n) {
      return n < 0 ? 0 : n > 1 ? 1 : n;
    };
    var hexToRgb = function (hex) {
      hex = String(hex).replace("#", "");
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      var n = parseInt(hex, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    var rgbToHex = function (r, g, b) {
      var h = function (x) {
        x = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return x.length < 2 ? "0" + x : x;
      };
      return "#" + h(r) + h(g) + h(b);
    };
    var rgbToHsv = function (r, g, b) {
      r /= 255;
      g /= 255;
      b /= 255;
      var max = Math.max(r, g, b);
      var min = Math.min(r, g, b);
      var d = max - min;
      var hh = 0;
      if (d) {
        if (max === r) hh = ((g - b) / d) % 6;
        else if (max === g) hh = (b - r) / d + 2;
        else hh = (r - g) / d + 4;
        hh *= 60;
        if (hh < 0) hh += 360;
      }
      return { h: hh, s: max === 0 ? 0 : d / max, v: max };
    };
    var hsvToHex = function (h, s, v) {
      var c = v * s;
      var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      var m = v - c;
      var r = 0;
      var g = 0;
      var b = 0;
      if (h < 60) {
        r = c;
        g = x;
      } else if (h < 120) {
        r = x;
        g = c;
      } else if (h < 180) {
        g = c;
        b = x;
      } else if (h < 240) {
        g = x;
        b = c;
      } else if (h < 300) {
        r = x;
        b = c;
      } else {
        r = c;
        b = x;
      }
      return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
    };
    var hexToHsv = function (hex) {
      var c = hexToRgb(hex);
      return rgbToHsv(c.r, c.g, c.b);
    };

    // ----- Custom picker elements + state -----
    var sv = palette.querySelector(".cp-sv");
    var svThumb = palette.querySelector(".cp-sv-thumb");
    var hue = palette.querySelector(".cp-hue");
    var hexInput = palette.querySelector(".cp-hex");
    var targets = palette.querySelectorAll(".custom-target");
    var endpoints = {
      in: { h: 0, s: 1, v: 1 },
      out: { h: 0, s: 1, v: 1 },
    };
    var activeTarget = "in";

    var hexOf = function (t) {
      var c = endpoints[t];
      return hsvToHex(c.h, c.s, c.v);
    };

    // Paint the pad/slider/hex/chips from the active endpoint's HSV. Pass
    // skipHex while the user is typing so the field isn't rewritten mid-edit.
    var renderPicker = function (skipHex) {
      var c = endpoints[activeTarget];
      if (sv) sv.style.backgroundColor = "hsl(" + c.h + ", 100%, 50%)";
      if (svThumb) {
        svThumb.style.left = c.s * 100 + "%";
        svThumb.style.top = (1 - c.v) * 100 + "%";
        svThumb.style.backgroundColor = hexOf(activeTarget);
      }
      if (hue) hue.value = String(Math.round(c.h));
      if (hexInput && !skipHex) {
        hexInput.value = hexOf(activeTarget).slice(1).toUpperCase();
      }
      targets.forEach(function (b) {
        var chip = b.querySelector(".custom-target-chip");
        if (chip) {
          chip.style.backgroundColor = hexOf(b.getAttribute("data-target"));
        }
      });
    };

    var applyLive = function () {
      markSelected("custom");
      applyColors(hexOf("in"), hexOf("out"));
    };
    var persistNow = function () {
      persistPalette("custom", hexOf("in"), hexOf("out"));
    };

    // Load the active mode's saved palette into the picker and apply it. Also
    // restyles the panel for the mode: title, preset chips, and the endpoint
    // labels (Core/Edge for the galaxy, Bright/Faint for the stars).
    var loadTheme = function () {
      var t = theme();
      if (titleEl) titleEl.textContent = t.title;
      if (paletteBtn) paletteBtn.setAttribute("aria-label", t.aria);
      swatches.forEach(function (s) {
        var p = t.presets[s.getAttribute("data-palette")];
        var chip = s.querySelector(".swatch-chip");
        if (p && chip) {
          chip.style.background =
            "linear-gradient(135deg, " + p.in + ", " + p.out + ")";
        }
      });
      targets.forEach(function (b) {
        var nm = b.querySelector(".custom-target-name");
        if (nm) {
          nm.textContent =
            b.getAttribute("data-target") === "in" ? t.labelIn : t.labelOut;
        }
        b.setAttribute(
          "aria-pressed",
          String(b.getAttribute("data-target") === "in")
        );
      });
      activeTarget = "in";

      var savedName = "default";
      var savedColors = t.presets.default;
      try {
        var sn = localStorage.getItem(keyName());
        if (sn) savedName = sn;
        var scStored = JSON.parse(localStorage.getItem(keyColors()));
        if (scStored && scStored.in && scStored.out) savedColors = scStored;
      } catch (e) {}
      endpoints.in = hexToHsv(savedColors.in);
      endpoints.out = hexToHsv(savedColors.out);
      markSelected(savedName);
      renderPicker();
      applyColors(savedColors.in, savedColors.out);
    };
    paletteSync = loadTheme; // let applyBgMode re-aim the palette on mode change
    loadTheme();

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
        var p = theme().presets[name];
        if (!p) return;
        endpoints.in = hexToHsv(p.in);
        endpoints.out = hexToHsv(p.out);
        markSelected(name);
        renderPicker();
        applyColors(p.in, p.out);
        persistPalette(name, p.in, p.out);
      });
    });

    // Choose which endpoint (core / edge) the picker edits
    targets.forEach(function (b) {
      b.addEventListener("click", function () {
        activeTarget = b.getAttribute("data-target");
        targets.forEach(function (o) {
          o.setAttribute("aria-pressed", String(o === b));
        });
        renderPicker();
      });
    });

    // Saturation / brightness pad: press or drag anywhere to pick
    if (sv) {
      var svDragging = false;
      var svPick = function (e) {
        var r = sv.getBoundingClientRect();
        if (!r.width || !r.height) return;
        endpoints[activeTarget].s = clamp01((e.clientX - r.left) / r.width);
        endpoints[activeTarget].v = 1 - clamp01((e.clientY - r.top) / r.height);
        renderPicker();
        applyLive();
      };
      sv.addEventListener("pointerdown", function (e) {
        svDragging = true;
        try {
          sv.setPointerCapture(e.pointerId);
        } catch (_) {}
        svPick(e);
        e.preventDefault();
      });
      sv.addEventListener("pointermove", function (e) {
        if (svDragging) {
          svPick(e);
          e.preventDefault();
        }
      });
      var svEnd = function (e) {
        if (!svDragging) return;
        svDragging = false;
        try {
          sv.releasePointerCapture(e.pointerId);
        } catch (_) {}
        persistNow();
      };
      sv.addEventListener("pointerup", svEnd);
      sv.addEventListener("pointercancel", svEnd);
      sv.addEventListener("keydown", function (e) {
        var step = e.shiftKey ? 0.1 : 0.02;
        var c = endpoints[activeTarget];
        var done = true;
        if (e.key === "ArrowLeft") c.s = clamp01(c.s - step);
        else if (e.key === "ArrowRight") c.s = clamp01(c.s + step);
        else if (e.key === "ArrowUp") c.v = clamp01(c.v + step);
        else if (e.key === "ArrowDown") c.v = clamp01(c.v - step);
        else done = false;
        if (done) {
          e.preventDefault();
          renderPicker();
          applyLive();
          persistNow();
        }
      });
    }

    // Hue slider (live while sliding, persist on release)
    if (hue) {
      hue.addEventListener("input", function () {
        endpoints[activeTarget].h = parseFloat(hue.value) || 0;
        renderPicker();
        applyLive();
      });
      hue.addEventListener("change", persistNow);
    }

    // Hex entry (typed)
    if (hexInput) {
      hexInput.addEventListener("input", function () {
        var v = hexInput.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
        if (v !== hexInput.value) hexInput.value = v;
        if (v.length === 6) {
          endpoints[activeTarget] = hexToHsv("#" + v);
          renderPicker(true);
          applyLive();
          persistNow();
        }
      });
      hexInput.addEventListener("blur", function () {
        renderPicker();
      });
    }

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

  // Immersive spin slider. It drives whichever play mode is active: the galaxy
  // in Galaxy mode, the star trails in Stars mode. Each mode keeps its own saved
  // speed, and the slider re-syncs to the active mode when immersive is entered
  // (see setImmersive). The reset button recenters the slider to a stop.
  var spin = document.querySelector(".spin-control");
  if (spin) {
    var spinSlider = spin.querySelector(".spin-slider");
    var spinReset = spin.querySelector(".spin-reset");

    var spinIsGalaxy = function () {
      return document.documentElement.getAttribute("data-bg") === "galaxy";
    };
    var spinKey = function () {
      return spinIsGalaxy() ? "galaxy-spin" : "stars-spin";
    };
    var spinTarget = function () {
      return spinIsGalaxy() ? window.__bgGalaxy : window.__bgStars;
    };
    // Default speed when a mode has no saved value: the galaxy rests, the star
    // trails drift gently so they read the moment you enter.
    var spinDefault = function () {
      return spinIsGalaxy() ? 0 : 40;
    };

    var readSaved = function () {
      var v = spinDefault();
      try {
        var ss = parseInt(localStorage.getItem(spinKey()), 10);
        if (!isNaN(ss)) v = Math.max(-100, Math.min(100, ss));
      } catch (e) {}
      return v;
    };

    var applySpin = function (v, persist) {
      var t = spinTarget();
      if (t && t.setSpin) t.setSpin(v);
      if (persist) {
        try {
          localStorage.setItem(spinKey(), String(v));
        } catch (e) {}
      }
    };

    // Point the slider at the active mode's saved speed and apply it.
    var syncSpin = function () {
      var v = readSaved();
      if (spinSlider) spinSlider.value = String(v);
      applySpin(v, false);
    };
    spinSync = syncSpin; // let setImmersive re-sync when the mode changes
    syncSpin();

    if (spinSlider) {
      spinSlider.addEventListener("input", function () {
        applySpin(parseInt(spinSlider.value, 10) || 0, true);
      });
    }
    if (spinReset) {
      spinReset.addEventListener("click", function () {
        if (spinSlider) spinSlider.value = "0";
        applySpin(0, true);
      });
    }
  }

  // Sky Slam easter egg: clicking the card four times reveals a "spy disguise"
  // (the IM A SPY cap + sunglasses pop out onto its corners). Clicking it again
  // hides them; the counter resets if you pause too long between clicks.
  var spyCard = document.querySelector(".project-card.has-spy");
  if (spyCard) {
    var spyClicks = 0;
    var spyTimer = null;
    spyCard.addEventListener("click", function (e) {
      if (e.target.closest("a")) return; // let the Roblox link work normally
      if (spyCard.classList.contains("spy-on")) {
        spyCard.classList.remove("spy-on");
        spyClicks = 0;
        return;
      }
      spyClicks++;
      clearTimeout(spyTimer);
      spyTimer = setTimeout(function () {
        spyClicks = 0;
      }, 1600);
      if (spyClicks >= 4) {
        spyCard.classList.add("spy-on");
        spyClicks = 0;
      }
    });
  }
})();
