// Long-exposure star-trail background for immersive "Stars" play mode.
//
// A field of stars rotates around a celestial-pole point; each frame strokes
// the short arc every star sweeps, laid over a slowly fading dark wash, so the
// stars leave smooth concentric trails like a long-exposure photograph. The
// spin slider sets the rotation speed (and therefore how long the trails read).
//
// Canvas 2D (no WebGL). It builds lazily and runs only while immersive Stars
// mode is active, exposing window.__bgStars.start()/stop()/setSpin().
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

    var clamp = function (n, lo, hi) {
      return n < lo ? lo : n > hi ? hi : n;
    };

    // Continuous spin rate (rad/s) from the slider. Saved value wins; otherwise
    // a gentle default so the trails are visible the moment you enter.
    var spinRate = (DEFAULT_PCT / 100) * SPIN_MAX;
    try {
      var s0 = parseFloat(localStorage.getItem("stars-spin"));
      if (!isNaN(s0)) spinRate = (clamp(s0, -100, 100) / 100) * SPIN_MAX;
    } catch (e) {}

    // Trail colors: the brightest stars take colBright, the faintest colFaint,
    // and each star is a mix by its own brightness. The Stars palette recolors
    // these live via setColors(); the saved choice is restored on first build.
    var colBright = { r: 255, g: 255, b: 255 };
    var colFaint = { r: 154, g: 180, b: 255 };
    var hexRgb = function (hex) {
      hex = String(hex).replace("#", "");
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      var n = parseInt(hex, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    try {
      var sc0 = JSON.parse(localStorage.getItem("stars-colors"));
      if (sc0 && sc0.in && sc0.out) {
        colBright = hexRgb(sc0.in);
        colFaint = hexRgb(sc0.out);
      }
    } catch (e) {}
    var mixCol = function (bf) {
      var r = Math.round(colFaint.r + (colBright.r - colFaint.r) * bf);
      var g = Math.round(colFaint.g + (colBright.g - colFaint.g) * bf);
      var b = Math.round(colFaint.b + (colBright.b - colFaint.b) * bf);
      return r + "," + g + "," + b;
    };

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
          bf: b, // brightness factor, drives the bright <-> faint color mix
          col: mixCol(b),
        });
      }
    }

    function clearDark() {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#05060f";
      ctx.fillRect(0, 0, w, h);
    }

    function drawStatic() {
      clearDark();
      ctx.globalCompositeOperation = "lighter";
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var a = st.a0 + rotation;
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + st.col + "," + st.br + ")";
        ctx.arc(
          cx + st.r * Math.cos(a),
          cy + st.r * Math.sin(a),
          st.size * 0.7,
          0,
          6.2832
        );
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
      ctx.fillStyle = "rgba(5,6,15," + FADE + ")";
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      var moving = prevRot !== rotation;
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var a2 = st.a0 + rotation;
        var style = "rgba(" + st.col + "," + st.br + ")";
        if (moving) {
          ctx.beginPath();
          ctx.lineWidth = st.size;
          ctx.strokeStyle = style;
          ctx.arc(cx, cy, st.r, st.a0 + prevRot, a2, rotation < prevRot);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.fillStyle = style;
          ctx.arc(
            cx + st.r * Math.cos(a2),
            cy + st.r * Math.sin(a2),
            st.size * 0.7,
            0,
            6.2832
          );
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = "source-over";
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

    // Recolor the field live: brightHex for the brightest stars, faintHex for
    // the dimmest, mixed per star. Safe before build (it takes hold when the
    // stars are first generated).
    function setColors(brightHex, faintHex) {
      if (brightHex) colBright = hexRgb(brightHex);
      if (faintHex) colFaint = hexRgb(faintHex);
      for (var i = 0; i < stars.length; i++) {
        stars[i].col = mixCol(stars[i].bf);
      }
    }

    return {
      start: start,
      stop: stop,
      setSpin: setSpin,
      setColors: setColors,
    };
  })();

  window.__bgStars = StarTrails;
})();
