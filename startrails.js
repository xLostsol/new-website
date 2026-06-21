// Long-exposure star-trail background for immersive "Stars" play mode.
//
// A field of stars rotates around a celestial-pole point; each frame strokes
// the short arc every star sweeps, laid over a slowly fading dark wash, so the
// stars leave smooth concentric trails like a long-exposure photograph. The
// spin slider sets the rotation speed (and therefore how long the trails read);
// the star palette sets the sky and star colors, and the scroll wheel zooms
// the field in and out.
//
// Canvas 2D (no WebGL). It builds lazily and runs only while immersive Stars
// mode is active, exposing window.__bgStars.start()/stop()/setSpin()/
// setColors()/setZoom().
// Technique inspiration: the classic "rotate the whole field + fade" approach
// used for star-trail and light-trail canvas effects.
(function () {
  var sky = document.getElementById("space-background");
  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  var StarTrails = (function () {
    var inited = false;
    var running = false;
    var canvas = null;
    var ctx = null;
    var w = 0;
    var h = 0;
    var dpr = 1;
    var cx = 0;
    var cy = 0;
    var stars = [];
    var rotation = 0;
    var raf = null;
    var last = 0;

    var SPIN_MAX = 0.5; // rad/s at full slider deflection
    var FADE = 0.05; // dark-wash alpha per frame; smaller = longer trails
    var DEFAULT_PCT = 40; // gentle default so first entry shows trails at once
    var ZOOM_MIN = 0.45;
    var ZOOM_MAX = 3;

    var clamp = function (n, lo, hi) {
      return n < lo ? lo : n > hi ? hi : n;
    };

    // "#rrggbb" (or "#rgb") -> "r,g,b" for use in rgb()/rgba(); null if invalid.
    var hexToRgbStr = function (hex) {
      hex = String(hex).replace("#", "");
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (hex.length !== 6) return null;
      var n = parseInt(hex, 16);
      if (isNaN(n)) return null;
      return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
    };

    // Sky (background) and star colors, held as "r,g,b" strings. The saved
    // palette is read here so the chosen look is in place the moment the trails
    // first build (mirrors how the galaxy reads its own saved colors).
    var bgRGB = "5,6,15"; // deep space navy
    var starRGB = "255,255,255"; // classic white
    try {
      var cs = JSON.parse(localStorage.getItem("stars-colors"));
      if (cs) {
        var b = hexToRgbStr(cs.bg);
        var s = hexToRgbStr(cs.star);
        if (b) bgRGB = b;
        if (s) starRGB = s;
      }
    } catch (e) {}

    // Continuous spin rate (rad/s) from the slider. Saved value wins; otherwise
    // a gentle default so the trails are visible the moment you enter.
    var spinRate = (DEFAULT_PCT / 100) * SPIN_MAX;
    try {
      var s0 = parseFloat(localStorage.getItem("stars-spin"));
      if (!isNaN(s0)) spinRate = (clamp(s0, -100, 100) / 100) * SPIN_MAX;
    } catch (e) {}

    // Scroll-wheel zoom: scales every star's orbit radius about the pole.
    var zoom = 1;
    try {
      var z0 = parseFloat(localStorage.getItem("stars-zoom"));
      if (!isNaN(z0)) zoom = clamp(z0, ZOOM_MIN, ZOOM_MAX);
    } catch (e) {}

    function sizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      // Pole sits a little above center, echoing a north-facing exposure
      cx = w * 0.5;
      cy = h * 0.45;
    }

    function makeStars() {
      stars = [];
      var diag = Math.sqrt(w * w + h * h);
      var Rmax = diag * 0.62; // cover the corners as the field rotates
      var small = w < 768;
      var count = small ? 320 : 620;
      for (var i = 0; i < count; i++) {
        var r = Rmax * Math.sqrt(Math.random()); // uniform across the disk
        var a0 = Math.random() * Math.PI * 2;
        var b = Math.pow(Math.random(), 1.7); // mostly dim, a few bright
        stars.push({
          r: r,
          a0: a0,
          size: 0.6 + b * 1.6,
          br: 0.35 + b * 0.65,
        });
      }
    }

    function clearDark() {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgb(" + bgRGB + ")";
      ctx.fillRect(0, 0, w, h);
    }

    function drawStatic() {
      clearDark();
      ctx.globalCompositeOperation = "lighter";
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var a = st.a0 + rotation;
        var rr = st.r * zoom;
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + starRGB + "," + st.br + ")";
        ctx.arc(cx + rr * Math.cos(a), cy + rr * Math.sin(a), st.size * 0.7, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      var delta = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;

      var prevRot = rotation;
      rotation += spinRate * delta;

      // Fading dark wash: previous arc segments dim into trailing tails.
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(" + bgRGB + "," + FADE + ")";
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      var moving = prevRot !== rotation;
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var a2 = st.a0 + rotation;
        var rr = st.r * zoom;
        var style = "rgba(" + starRGB + "," + st.br + ")";
        if (moving) {
          ctx.beginPath();
          ctx.lineWidth = st.size;
          ctx.strokeStyle = style;
          ctx.arc(cx, cy, rr, st.a0 + prevRot, a2, rotation < prevRot);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.fillStyle = style;
          ctx.arc(cx + rr * Math.cos(a2), cy + rr * Math.sin(a2), st.size * 0.7, 0, 6.2832);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    }

    // Reset the wash to the current background so trails rebuild cleanly after
    // a color or zoom change (a static frame when motion is reduced).
    function repaint() {
      if (!running) return;
      if (prefersReducedMotion) drawStatic();
      else clearDark();
    }

    function build() {
      canvas = document.createElement("canvas");
      canvas.className = "startrails-canvas";
      canvas.setAttribute("aria-hidden", "true");
      ctx = canvas.getContext("2d");
      sky.appendChild(canvas);
      sizeCanvas();
      makeStars();

      var resizeT = null;
      window.addEventListener("resize", function () {
        if (!running) return;
        clearTimeout(resizeT);
        resizeT = setTimeout(function () {
          sizeCanvas();
          makeStars();
          if (prefersReducedMotion) drawStatic();
          else clearDark();
        }, 150);
      });

      // Scroll to zoom the field in/out. The trail canvas itself is
      // pointer-events:none, so listen on the window and act only while the
      // trails are running; let the wheel fall through over the palette.
      window.addEventListener(
        "wheel",
        function (e) {
          if (!running) return;
          if (e.target && e.target.closest && e.target.closest(".palette")) return;
          var nz = clamp(zoom * Math.exp(-e.deltaY * 0.0015), ZOOM_MIN, ZOOM_MAX);
          e.preventDefault();
          if (nz === zoom) return;
          zoom = nz;
          try {
            localStorage.setItem("stars-zoom", String(zoom));
          } catch (_) {}
          repaint();
        },
        { passive: false }
      );

      inited = true;
    }

    function start() {
      if (!sky) return;
      if (!inited) build();
      canvas.classList.add("show");
      if (running) return;
      running = true;
      if (prefersReducedMotion) {
        drawStatic(); // calm static starscape, no rotation
        return;
      }
      clearDark();
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      if (canvas) {
        canvas.classList.remove("show");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, w, h);
        }
      }
    }

    function setSpin(value) {
      var n = clamp(Number(value) || 0, -100, 100);
      spinRate = (n / 100) * SPIN_MAX;
    }

    // Live sky/star color change from the star palette. Either argument may be
    // omitted to leave that color unchanged.
    function setColors(bgHex, starHex) {
      var b = hexToRgbStr(bgHex);
      var s = hexToRgbStr(starHex);
      if (b) bgRGB = b;
      if (s) starRGB = s;
      repaint();
    }

    function setZoom(value) {
      zoom = clamp(Number(value) || 1, ZOOM_MIN, ZOOM_MAX);
      repaint();
    }

    return {
      start: start,
      stop: stop,
      setSpin: setSpin,
      setColors: setColors,
      setZoom: setZoom,
    };
  })();

  window.__bgStars = StarTrails;
})();
