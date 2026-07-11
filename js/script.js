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
    var STAR_COUNT = window.innerWidth < 768 ? 110 : 150;

    for (var i = 0; i < STAR_COUNT; i++) {
      var star = document.createElement("span");
      star.className = Math.random() < 0.13 ? "star star-bright" : "star";

      var size = Math.random() * 2 + 0.5;
      star.style.width = size + "px";
      star.style.height = size + "px";
      star.style.top = Math.random() * 100 + "%";
      star.style.left = Math.random() * 100 + "%";
      star.style.setProperty(
        "--twinkle-duration",
        (Math.random() * 8 + 12).toFixed(2) + "s"
      );
      star.style.setProperty(
        "--twinkle-delay",
        (Math.random() * 12).toFixed(2) + "s"
      );
      star.style.setProperty(
        "--star-opacity",
        (Math.random() * 0.5 + 0.3).toFixed(2)
      );

      fragment.appendChild(star);
    }

    starLayer.appendChild(fragment);
  }

  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  var sourceUpdate = document.querySelector("[data-source-update]");
  if (sourceUpdate && "fetch" in window) {
    var sourceTime = sourceUpdate.querySelector("[data-source-update-time]");
    var sourceLink = sourceUpdate.querySelector("[data-source-update-link]");
    var sourceCacheKey = "portfolio-source-update-v2";
    var sourceCacheTtl = 12 * 60 * 60 * 1000;

    var showSourceUpdate = function (entry) {
      if (!entry || !entry.date || !entry.url || !sourceTime || !sourceLink)
        return;
      var date = new Date(entry.date);
      if (isNaN(date.getTime())) return;
      sourceTime.dateTime = date.toISOString();
      sourceTime.textContent = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
      sourceLink.href = entry.url;
      sourceLink.setAttribute(
        "aria-label",
        "View the latest source commit (opens in a new tab)"
      );
      sourceUpdate.hidden = false;
    };

    var cachedUpdate = null;
    try {
      cachedUpdate = JSON.parse(localStorage.getItem(sourceCacheKey));
    } catch (e) {}

    if (cachedUpdate) {
      showSourceUpdate(cachedUpdate);
    }
    var cacheAge = cachedUpdate
      ? Date.now() - Number(cachedUpdate.cachedAt || 0)
      : sourceCacheTtl;
    var cacheFresh = cacheAge >= 0 && cacheAge < sourceCacheTtl;

    if (!cacheFresh) {
      var sourceController =
        "AbortController" in window ? new AbortController() : null;
      var sourceTimeout = sourceController
        ? setTimeout(function () {
            sourceController.abort();
          }, 4000)
        : null;
      fetch(
        "https://api.github.com/repos/xLostsol/new-website/commits?sha=main&per_page=1",
        sourceController ? { signal: sourceController.signal } : undefined
      )
        .then(function (response) {
          if (!response.ok) throw new Error("Source update unavailable");
          return response.json();
        })
        .then(function (data) {
          var commit = Array.isArray(data) ? data[0] : null;
          var entry =
            commit && commit.commit && commit.commit.committer
              ? {
                  date: commit.commit.committer.date,
                  url: commit.html_url,
                  cachedAt: Date.now(),
                }
              : null;
          if (!entry || !entry.date || !entry.url) return;
          try {
            localStorage.setItem(sourceCacheKey, JSON.stringify(entry));
          } catch (e) {}
          showSourceUpdate(entry);
        })
        .catch(function () {})
        .then(function () {
          if (sourceTimeout) clearTimeout(sourceTimeout);
        });
    }
  }

  var bgButtons = document.querySelectorAll(".bg-toggle-btn");
  var immersiveButton = document.querySelector(".bg-immersive-btn");
  if (bgButtons.length) {
    var bgRoot = document.documentElement;
    var spinSync = null;
    var transferOn = function () {
      try {
        return localStorage.getItem("stars-transfer") === "1";
      } catch (e) {
        return false;
      }
    };
    var syncStarsBg = function () {
      var stars = bgRoot.getAttribute("data-bg") !== "galaxy";
      var immersive = bgRoot.classList.contains("immersive");
      var keep = stars && transferOn();
      bgRoot.classList.toggle("stars-transfer", keep);
      if (window.__bgStars) {
        if (stars && (immersive || keep)) window.__bgStars.start();
        else window.__bgStars.stop();
      }
    };
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
      syncStarsBg();
      if (spinSync) spinSync();
      if (persist) {
        try {
          localStorage.setItem("bg-mode", mode);
        } catch (e) {}
      }
    };

    var hintEl = null;
    var immersiveRegions = document.querySelectorAll(
      ".skip-link, #navbar, main, .site-footer"
    );
    var immersiveSpin = document.querySelector(".spin-control");
    var setImmersive = function (on) {
      document
        .querySelectorAll('.palette[data-open="true"]')
        .forEach(function (openPalette) {
          openPalette.setAttribute("data-open", "false");
          var openButton = openPalette.querySelector(".palette-btn");
          var openPanel = openPalette.querySelector(".palette-panel");
          if (openButton) openButton.setAttribute("aria-expanded", "false");
          if (openPanel) openPanel.setAttribute("aria-hidden", "true");
        });
      bgRoot.classList.toggle("immersive", on);
      immersiveRegions.forEach(function (region) {
        if (on) region.setAttribute("inert", "");
        else region.removeAttribute("inert");
      });
      if (immersiveSpin) {
        if (on) immersiveSpin.removeAttribute("inert");
        else immersiveSpin.setAttribute("inert", "");
      }
      if (immersiveButton) {
        immersiveButton.setAttribute("aria-pressed", String(on));
        immersiveButton.setAttribute(
          "aria-label",
          on ? "Exit background view" : "Explore the background"
        );
        immersiveButton.title = on
          ? "Exit background view"
          : "Explore the background";
      }
      var stars = bgRoot.getAttribute("data-bg") !== "galaxy";
      syncStarsBg();
      if (spinSync) spinSync();
      if (on) {
        if (!hintEl) {
          hintEl = document.createElement("div");
          hintEl.className = "bg-immersive-hint";
          hintEl.setAttribute("role", "status");
          document.body.appendChild(hintEl);
        }
        hintEl.hidden = false;
        hintEl.textContent = stars
          ? "Slider spins the star trails \u00b7 Esc or Explore to exit"
          : "Drag to spin \u00b7 slider sets a steady spin \u00b7 Esc or Explore to exit";
        hintEl.classList.remove("show");
        void hintEl.offsetWidth;
        hintEl.classList.add("show");
      } else if (hintEl) {
        hintEl.classList.remove("show");
        hintEl.hidden = true;
      }
    };

    applyBgMode(bgRoot.getAttribute("data-bg") || "stars", false);
    setImmersive(false);

    bgButtons.forEach(function (b) {
      b.addEventListener("click", function () {
        var target = b.getAttribute("data-bg-mode");
        if (target !== bgRoot.getAttribute("data-bg")) {
          setImmersive(false);
          applyBgMode(target, true);
        }
      });
    });

    if (immersiveButton) {
      immersiveButton.addEventListener("click", function () {
        setImmersive(!bgRoot.classList.contains("immersive"));
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && bgRoot.classList.contains("immersive")) {
        var openPal = document.querySelector('.palette[data-open="true"]');
        if (openPal) return;
        setImmersive(false);
        if (immersiveButton) immersiveButton.focus();
      }
    });

    var transferToggle = document.querySelector(".stars-transfer-toggle");
    if (transferToggle) {
      transferToggle.checked = transferOn();
      transferToggle.addEventListener("change", function () {
        try {
          localStorage.setItem(
            "stars-transfer",
            transferToggle.checked ? "1" : "0"
          );
        } catch (e) {}
        syncStarsBg();
      });
    }
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

  var galaxyPalette = document.querySelector(".palette-galaxy");
  if (galaxyPalette) {
    setupPalette(galaxyPalette, {
      presets: {
        default: { in: "#e39b00", out: "#6432ff" },
        cool: { in: "#2fd6e6", out: "#2a48d8" },
        warm: { in: "#ffb42a", out: "#e6478c" },
        aurora: { in: "#3ce69b", out: "#9a5cff" },
      },
      defaultName: "default",
      storageName: "galaxy-palette",
      storageColors: "galaxy-colors",
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
        default: { star: "#f2f5f3", bg: "#080b0a" },
        cool: { star: "#9fd0ff", bg: "#070d1a" },
        warm: { star: "#ffb46b", bg: "#120806" },
        aurora: { star: "#7dffc4", bg: "#04120e" },
      },
      defaultName: "default",
      storageName: "stars-palette",
      storageColors: "stars-colors",
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

  var copyEmailButton = document.querySelector("[data-copy-email]");
  if (copyEmailButton) {
    var copyEmailStatus = document.getElementById("contact-email-status");
    var copyResetTimer = null;
    var legacyCopy = function (text) {
      return new Promise(function (resolve, reject) {
        var field = document.createElement("textarea");
        field.value = text;
        field.setAttribute("readonly", "");
        field.setAttribute("aria-hidden", "true");
        field.style.position = "fixed";
        field.style.left = "-9999px";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        field.setSelectionRange(0, field.value.length);
        try {
          if (!document.execCommand("copy")) throw new Error("Copy failed");
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          field.remove();
          copyEmailButton.focus();
        }
      });
    };
    var copyEmail = function (text) {
      if (navigator.clipboard && window.isSecureContext) {
        var clipboardTimeout = new Promise(function (_, reject) {
          setTimeout(function () {
            reject(new Error("Clipboard request timed out"));
          }, 1200);
        });
        return Promise.race([
          navigator.clipboard.writeText(text),
          clipboardTimeout,
        ]).catch(function () {
          return legacyCopy(text);
        });
      }
      return legacyCopy(text);
    };

    copyEmailButton.addEventListener("click", function () {
      var target = document.querySelector(
        copyEmailButton.getAttribute("data-copy-email")
      );
      if (!target) return;
      var email = target.textContent.trim();
      if (copyEmailStatus) copyEmailStatus.textContent = "";
      copyEmailButton.textContent = "Copying";
      copyEmail(email)
        .then(function () {
          clearTimeout(copyResetTimer);
          copyEmailButton.textContent = "Copied";
          copyEmailButton.setAttribute("data-copied", "true");
          if (copyEmailStatus) {
            copyEmailStatus.textContent = "Email address copied to clipboard.";
          }
          copyResetTimer = setTimeout(function () {
            copyEmailButton.textContent = "Copy email";
            copyEmailButton.removeAttribute("data-copied");
          }, 2200);
        })
        .catch(function () {
          copyEmailButton.textContent = "Copy email";
          copyEmailButton.removeAttribute("data-copied");
          if (copyEmailStatus) {
            copyEmailStatus.textContent =
              "Copy failed. Select the email address to copy it.";
          }
        });
    });
  }

  var spyCard = document.querySelector(".project-card.has-spy");
  var spyTrigger = spyCard && spyCard.querySelector(".spy-trigger");
  if (spyCard && spyTrigger) {
    spyTrigger.addEventListener("click", function () {
      var on = !spyCard.classList.contains("spy-on");
      if (on) {
        spyCard.querySelectorAll("img[data-src]").forEach(function (img) {
          img.src = img.getAttribute("data-src");
          img.removeAttribute("data-src");
        });
      }
      spyCard.classList.toggle("spy-on", on);
      spyTrigger.setAttribute("aria-pressed", String(on));
      var spyLabel = spyTrigger.querySelector(".spy-trigger-label");
      if (spyLabel) {
        spyLabel.textContent = on ? "Hide the disguise" : "Try the disguise";
      }
    });
  }
})();
