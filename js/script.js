(function () {
  "use strict";

  var navToggle = document.querySelector(".nav-toggle");
  var navMenu = document.getElementById("nav-menu");

  if (navToggle && navMenu) {
    var syncMenuInert = function () {
      var hidden =
        window.innerWidth <= 768 && !navMenu.classList.contains("open");
      if (hidden) navMenu.setAttribute("inert", "");
      else navMenu.removeAttribute("inert");
    };

    var closeMenu = function (returnFocus) {
      navToggle.setAttribute("aria-expanded", "false");
      navMenu.classList.remove("open");
      syncMenuInert();
      if (returnFocus) navToggle.focus();
    };

    navToggle.addEventListener("click", function () {
      var isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      navMenu.classList.toggle("open", !isOpen);
      syncMenuInert();
    });

    navMenu.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navMenu.classList.contains("open")) {
        closeMenu(true);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) closeMenu();
      else syncMenuInert();
    });

    syncMenuInert();
  }

  var navbar = document.getElementById("navbar");
  if (navbar) {
    var onScroll = function () {
      navbar.classList.toggle("scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var sky = document.getElementById("space-background");
  if (sky) {
    var starLayer = sky.querySelector(".stars") || sky;
    var fragment = document.createDocumentFragment();
    var STAR_COUNT = window.innerWidth < 768 ? 32 : 48;

    for (var i = 0; i < STAR_COUNT; i++) {
      var star = document.createElement("span");
      star.className = Math.random() < 0.08 ? "star star-bright" : "star";

      var size = Math.random() * 1.2 + 0.4;
      star.style.width = size + "px";
      star.style.height = size + "px";
      star.style.top = Math.random() * 100 + "%";
      star.style.left = Math.random() * 100 + "%";
      star.style.setProperty(
        "--twinkle-duration",
        (Math.random() * 12 + 16).toFixed(2) + "s"
      );
      star.style.setProperty(
        "--twinkle-delay",
        (Math.random() * 12).toFixed(2) + "s"
      );
      star.style.setProperty(
        "--star-opacity",
        (Math.random() * 0.35 + 0.25).toFixed(2)
      );

      fragment.appendChild(star);
    }

    starLayer.appendChild(fragment);
  }

  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  var bgButtons = document.querySelectorAll(".bg-toggle-btn");
  if (bgButtons.length) {
    var bgRoot = document.documentElement;
    var spinSync = null;
    var galaxyButton = document.querySelector(
      '.bg-toggle-btn[data-bg-mode="galaxy"]'
    );
    var spinControl = document.querySelector(".spin-control");
    var immersiveContent = document.querySelectorAll(
      ".skip-link, #navbar, main, .site-footer"
    );
    var immersiveHint = document.createElement("p");
    immersiveHint.id = "bg-immersive-hint";
    immersiveHint.className = "bg-immersive-hint";
    immersiveHint.setAttribute("role", "status");
    immersiveHint.setAttribute("aria-live", "polite");
    document.body.appendChild(immersiveHint);

    if (spinControl) {
      spinControl.id = "spin-control";
      spinControl.setAttribute("aria-hidden", "true");
    }
    if (galaxyButton) {
      galaxyButton.setAttribute("aria-controls", "spin-control");
      galaxyButton.setAttribute("aria-expanded", "false");
    }

    var showImmersiveHint = function (message) {
      immersiveHint.textContent = message;
      immersiveHint.classList.remove("show");
      void immersiveHint.offsetWidth;
      immersiveHint.classList.add("show");
    };

    var syncGalaxyButton = function () {
      if (!galaxyButton) return;
      var selected = bgRoot.getAttribute("data-bg") === "galaxy";
      var immersive = selected && bgRoot.classList.contains("immersive");
      galaxyButton.setAttribute("aria-expanded", String(immersive));
      galaxyButton.title = selected
        ? immersive
          ? "Exit interactive galaxy"
          : "Click again to interact with the galaxy"
        : "Animated galaxy";
    };

    var setImmersive = function (active, returnFocus) {
      active =
        Boolean(active) && bgRoot.getAttribute("data-bg") === "galaxy";
      bgRoot.classList.toggle("immersive", active);
      immersiveContent.forEach(function (element) {
        if (active) {
          element.setAttribute("inert", "");
          element.setAttribute("aria-hidden", "true");
        } else {
          element.removeAttribute("inert");
          element.removeAttribute("aria-hidden");
        }
      });
      if (spinControl) {
        spinControl.setAttribute("aria-hidden", String(!active));
      }
      syncGalaxyButton();
      if (spinSync) spinSync();

      if (active) {
        showImmersiveHint(
          "Drag to rotate | Scroll to zoom | Use the slider to set spin | Click Galaxy again to exit"
        );
      } else {
        immersiveHint.classList.remove("show");
        if (returnFocus && galaxyButton) galaxyButton.focus();
      }
    };

    var applyBgMode = function (mode, persist) {
      mode = mode === "galaxy" ? "galaxy" : "stars";
      if (mode !== "galaxy") setImmersive(false, false);
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
      if (window.__bgStars) window.__bgStars.stop();
      if (spinSync) spinSync();
      syncGalaxyButton();
      if (persist) {
        try {
          localStorage.setItem("bg-mode", mode);
        } catch (e) {}
      }
    };

    applyBgMode(bgRoot.getAttribute("data-bg") || "stars", false);
    setImmersive(false, false);

    bgButtons.forEach(function (b) {
      b.addEventListener("click", function () {
        var target = b.getAttribute("data-bg-mode");
        var current = bgRoot.getAttribute("data-bg");
        if (target !== current) {
          applyBgMode(target, true);
          if (target === "galaxy") {
            showImmersiveHint("Click Galaxy again to interact");
          }
        } else if (target === "galaxy") {
          setImmersive(!bgRoot.classList.contains("immersive"), false);
        }
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && bgRoot.classList.contains("immersive")) {
        setImmersive(false, true);
      }
    });
  }

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
  var rgbaString = function (hex, alpha) {
    var c = hexToRgb(hex);
    return "rgba(" + c.r + ", " + c.g + ", " + c.b + ", " + alpha + ")";
  };
  var toneHex = function (hex, saturationDelta, valueDelta) {
    var c = hexToHsv(hex);
    return hsvToHex(
      c.h,
      clamp01(c.s + saturationDelta),
      clamp01(c.v + valueDelta)
    );
  };
  var colorLuminance = function (hex) {
    var c = hexToRgb(hex);
    var channel = function (value) {
      value /= 255;
      return value <= 0.03928
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  };

  var setupPalette = function (palette, cfg) {
    var paletteBtn = palette.querySelector(".palette-btn");
    var palettePanel = palette.querySelector(".palette-panel");
    var swatches = palette.querySelectorAll(".palette-swatch");
    var sv = palette.querySelector(".cp-sv");
    var svThumb = palette.querySelector(".cp-sv-thumb");
    var saturation = palette.querySelector(".cp-saturation");
    var saturationValue = palette.querySelector(".cp-saturation-value");
    var brightness = palette.querySelector(".cp-brightness");
    var brightnessValue = palette.querySelector(".cp-brightness-value");
    var hue = palette.querySelector(".cp-hue");
    var hexInput = palette.querySelector(".cp-hex");
    var targets = palette.querySelectorAll(".custom-target");

    var targetKeys = [];
    targets.forEach(function (b) {
      targetKeys.push(b.getAttribute("data-target"));
    });
    var activeTarget = targetKeys[0];

    var endpoints = {};

    var hexOf = function (t) {
      var c = endpoints[t];
      return hsvToHex(c.h, c.s, c.v);
    };
    var colorsObj = function () {
      var o = {};
      targetKeys.forEach(function (k) {
        o[k] = hexOf(k);
      });
      return o;
    };

    var applyColors = function () {
      cfg.apply(colorsObj());
    };

    var persistPalette = function (name) {
      try {
        localStorage.setItem(cfg.storageName, name);
        localStorage.setItem(cfg.storageColors, JSON.stringify(colorsObj()));
      } catch (e) {}
    };

    var markSelected = function (name) {
      swatches.forEach(function (s) {
        s.setAttribute(
          "aria-pressed",
          String(s.getAttribute("data-palette") === name)
        );
      });
    };

    var renderPicker = function (skipHex) {
      var c = endpoints[activeTarget];
      if (sv) {
        sv.style.backgroundColor = "hsl(" + c.h + ", 100%, 50%)";
      }
      if (svThumb) {
        svThumb.style.left = c.s * 100 + "%";
        svThumb.style.top = (1 - c.v) * 100 + "%";
        svThumb.style.backgroundColor = hexOf(activeTarget);
      }
      if (saturation) saturation.value = String(Math.round(c.s * 100));
      if (saturationValue) {
        saturationValue.textContent = Math.round(c.s * 100) + "%";
      }
      if (brightness) brightness.value = String(Math.round(c.v * 100));
      if (brightnessValue) {
        brightnessValue.textContent = Math.round(c.v * 100) + "%";
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
      applyColors();
    };
    var persistNow = function () {
      persistPalette("custom");
    };

    var savedName = cfg.defaultName;
    var savedColors = cfg.presets[cfg.defaultName];
    try {
      var sn = localStorage.getItem(cfg.storageName);
      if (sn && (sn === "custom" || cfg.presets[sn])) savedName = sn;
      if (savedName !== "custom") {
        savedColors = cfg.presets[savedName] || cfg.presets[cfg.defaultName];
      }
      var scStored = JSON.parse(localStorage.getItem(cfg.storageColors));
      if (savedName === "custom" && scStored) {
        var ok = true;
        targetKeys.forEach(function (k) {
          if (!scStored[k]) ok = false;
        });
        if (ok) savedColors = scStored;
        else savedName = cfg.defaultName;
      } else if (savedName === "custom") {
        savedName = cfg.defaultName;
      }
    } catch (e) {}
    targetKeys.forEach(function (k) {
      endpoints[k] = hexToHsv(savedColors[k]);
    });
    markSelected(savedName);
    renderPicker();
    applyColors();

    var setOpen = function (open) {
      if (open) {
        document.querySelectorAll('.palette[data-open="true"]').forEach(function (other) {
          if (other === palette) return;
          other.setAttribute("data-open", "false");
          var otherBtn = other.querySelector(".palette-btn");
          var otherPanel = other.querySelector(".palette-panel");
          if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
          if (otherPanel) otherPanel.setAttribute("aria-hidden", "true");
        });
      }
      palette.setAttribute("data-open", String(open));
      if (paletteBtn) paletteBtn.setAttribute("aria-expanded", String(open));
      if (palettePanel) palettePanel.setAttribute("aria-hidden", String(!open));
    };
    setOpen(false);

    if (paletteBtn) {
      paletteBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        setOpen(palette.getAttribute("data-open") !== "true");
      });
    }

    swatches.forEach(function (s) {
      s.addEventListener("click", function () {
        var name = s.getAttribute("data-palette");
        var p = cfg.presets[name];
        if (!p) return;
        targetKeys.forEach(function (k) {
          endpoints[k] = hexToHsv(p[k]);
        });
        markSelected(name);
        renderPicker();
        applyColors();
        persistPalette(name);
      });
    });

    targets.forEach(function (b) {
      b.addEventListener("click", function () {
        activeTarget = b.getAttribute("data-target");
        targets.forEach(function (o) {
          o.setAttribute("aria-pressed", String(o === b));
        });
        renderPicker();
      });
    });

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
    }

    if (saturation) {
      saturation.addEventListener("input", function () {
        endpoints[activeTarget].s = clamp01(parseFloat(saturation.value) / 100);
        renderPicker();
        applyLive();
      });
      saturation.addEventListener("change", persistNow);
    }

    if (brightness) {
      brightness.addEventListener("input", function () {
        endpoints[activeTarget].v = clamp01(parseFloat(brightness.value) / 100);
        renderPicker();
        applyLive();
      });
      brightness.addEventListener("change", persistNow);
    }

    if (hue) {
      hue.addEventListener("input", function () {
        endpoints[activeTarget].h = parseFloat(hue.value) || 0;
        renderPicker();
        applyLive();
      });
      hue.addEventListener("change", persistNow);
    }

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
        if (paletteBtn) paletteBtn.focus();
      }
    });
  };

  var createUiPalette = function () {
    var palette = document.createElement("div");
    palette.className = "palette palette-ui";
    palette.setAttribute("data-open", "false");
    palette.innerHTML = `
      <button
        class="palette-btn"
        type="button"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="palette-ui-panel"
        aria-label="UI color palette"
        title="UI palette"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14.5 4.5 5 5"/><path d="m4 20 4.2-1 10.6-10.6a2.12 2.12 0 0 0-3-3L5.2 16Z"/><path d="m5.2 16 2.8 2.8"/></svg>
      </button>
      <div class="palette-panel" id="palette-ui-panel" role="dialog" aria-label="UI palette" aria-hidden="true">
        <p class="palette-title">UI palette</p>
        <div class="palette-presets">
          <button type="button" class="palette-swatch" data-palette="blue" aria-pressed="true">
            <span class="swatch-chip" style="background: linear-gradient(135deg, #314fbd, #112c8f);"></span>
            <span class="swatch-name">Dark blue</span>
          </button>
          <button type="button" class="palette-swatch" data-palette="teal" aria-pressed="false">
            <span class="swatch-chip" style="background: linear-gradient(135deg, #5ca7a4, #367b79);"></span>
            <span class="swatch-name">Teal</span>
          </button>
          <button type="button" class="palette-swatch" data-palette="sage" aria-pressed="false">
            <span class="swatch-chip" style="background: linear-gradient(135deg, #7fa276, #526e4b);"></span>
            <span class="swatch-name">Sage</span>
          </button>
          <button type="button" class="palette-swatch" data-palette="amber" aria-pressed="false">
            <span class="swatch-chip" style="background: linear-gradient(135deg, #c69855, #8f642e);"></span>
            <span class="swatch-name">Amber</span>
          </button>
        </div>
        <div class="palette-divider"></div>
        <div class="palette-custom">
          <span class="palette-custom-label">Custom</span>
          <div class="custom-targets" role="group" aria-label="UI color to edit">
            <button type="button" class="custom-target" data-target="ui" aria-pressed="true">
              <span class="custom-target-chip"></span>
              <span class="custom-target-name">Accent</span>
            </button>
          </div>
          <div class="cp">
            <div class="cp-sv" aria-hidden="true">
              <span class="cp-sv-thumb"></span>
            </div>
            <div class="cp-channels">
              <label class="cp-channel">
                <span>Saturation</span>
                <input type="range" class="cp-saturation" min="0" max="100" step="1" value="100" />
                <span class="cp-saturation-value" aria-hidden="true">100%</span>
              </label>
              <label class="cp-channel">
                <span>Brightness</span>
                <input type="range" class="cp-brightness" min="0" max="100" step="1" value="100" />
                <span class="cp-brightness-value" aria-hidden="true">100%</span>
              </label>
            </div>
            <input type="range" class="cp-hue" min="0" max="360" step="1" value="0" aria-label="Hue" />
            <div class="cp-hex-row">
              <span class="cp-hash">#</span>
              <input type="text" class="cp-hex" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Hex color" />
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(palette);
    return palette;
  };

  var uiPalette = createUiPalette();
  setupPalette(uiPalette, {
    presets: {
      blue: { ui: "#314fbd" },
      teal: { ui: "#5ca7a4" },
      sage: { ui: "#7fa276" },
      amber: { ui: "#c69855" },
    },
    defaultName: "blue",
    storageName: "ui-palette-v1",
    storageColors: "ui-colors-v1",
    apply: function (c) {
      var color = c.ui;
      var strong = toneHex(color, 0.1, -0.11);
      var deep = toneHex(color, 0.22, -0.29);
      var gradientEnd = toneHex(color, 0.14, -0.18);
      var hover = toneHex(color, -0.04, 0.01);
      var base = hexToHsv(color);
      var focus = hsvToHex(base.h, base.s * 0.84, Math.max(base.v, 0.99));
      var rootStyle = document.documentElement.style;

      rootStyle.setProperty("--accent", color);
      rootStyle.setProperty("--accent-strong", strong);
      rootStyle.setProperty("--accent-deep", deep);
      rootStyle.setProperty("--accent-hover", hover);
      rootStyle.setProperty("--accent-gradient-end", gradientEnd);
      rootStyle.setProperty(
        "--accent-contrast",
        colorLuminance(color) > 0.18 ? "#04111f" : "#f7fbff"
      );
      rootStyle.setProperty("--accent-soft", rgbaString(strong, 0.16));
      rootStyle.setProperty("--accent-soft-hover", rgbaString(strong, 0.26));
      rootStyle.setProperty("--accent-faint", rgbaString(strong, 0.08));
      rootStyle.setProperty("--accent-bg", rgbaString(strong, 0.24));
      rootStyle.setProperty("--accent-bg-soft", rgbaString(strong, 0.18));
      rootStyle.setProperty("--accent-bg-deep", rgbaString(deep, 0.18));
      rootStyle.setProperty("--accent-bg-deep-soft", rgbaString(deep, 0.14));
      rootStyle.setProperty("--accent-border-soft", rgbaString(color, 0.22));
      rootStyle.setProperty("--accent-glow", rgbaString(color, 0.32));
      rootStyle.setProperty("--accent-glow-strong", rgbaString(color, 0.48));
      rootStyle.setProperty("--border", rgbaString(focus, 0.18));
      rootStyle.setProperty("--border-hover", rgbaString(color, 0.54));
      rootStyle.setProperty("--control-border", rgbaString(focus, 0.3));
      rootStyle.setProperty("--focus-ring", focus);
    },
  });

  var galaxyPalette = document.querySelector(".palette-galaxy");
  if (galaxyPalette) {
    setupPalette(galaxyPalette, {
      presets: {
        default: { in: "#38bdf8", out: "#4f46e5" },
        cool: { in: "#2fd6e6", out: "#2a48d8" },
        warm: { in: "#ffb42a", out: "#e6478c" },
        aurora: { in: "#3ce69b", out: "#9a5cff" },
      },
      defaultName: "default",
      storageName: "galaxy-palette-v2",
      storageColors: "galaxy-colors-v2",
      apply: function (c) {
        if (window.__bgGalaxy && window.__bgGalaxy.setColors) {
          window.__bgGalaxy.setColors(c.in, c.out);
        }
      },
    });
  }

  var starsPalette = document.querySelector(".palette-stars");
  if (starsPalette) {
    setupPalette(starsPalette, {
      presets: {
        default: { star: "#dbeafe", bg: "#030712" },
        cool: { star: "#9fd0ff", bg: "#070d1a" },
        warm: { star: "#ffb46b", bg: "#120806" },
        aurora: { star: "#7dffc4", bg: "#04120e" },
      },
      defaultName: "default",
      storageName: "stars-palette-v2",
      storageColors: "stars-colors-v2",
      apply: function (c) {
        if (window.__bgStars && window.__bgStars.setColors) {
          window.__bgStars.setColors(c.bg, c.star);
        }
      },
    });
  }

  var spin = document.querySelector(".spin-control");
  if (spin) {
    var spinSlider = spin.querySelector(".spin-slider");
    var spinReset = spin.querySelector(".spin-reset");

    if (spinSlider) {
      spinSlider.setAttribute("aria-label", "Galaxy spin speed and direction");
    }
    if (spinReset) {
      spinReset.setAttribute("aria-label", "Stop galaxy spin");
      spinReset.title = "Stop galaxy spin";
    }

    var spinIsGalaxy = function () {
      return document.documentElement.getAttribute("data-bg") === "galaxy";
    };
    var spinKey = function () {
      return spinIsGalaxy() ? "galaxy-spin" : "stars-spin";
    };
    var spinTarget = function () {
      return spinIsGalaxy() ? window.__bgGalaxy : window.__bgStars;
    };
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
      if (spinSlider) {
        spinSlider.setAttribute(
          "aria-valuetext",
          v === 0
            ? "Stopped"
            : Math.abs(v) + "% " + (v < 0 ? "reverse" : "forward")
        );
      }
      if (persist) {
        try {
          localStorage.setItem(spinKey(), String(v));
        } catch (e) {}
      }
    };

    var syncSpin = function () {
      var v = readSaved();
      if (spinSlider) spinSlider.value = String(v);
      applySpin(v, false);
    };
    spinSync = syncSpin;
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

})();
