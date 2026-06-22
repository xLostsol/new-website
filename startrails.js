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

    var SPIN_MAX = 0.5;
    var FADE = 0.05;
    var DEFAULT_PCT = 40;
    var ZOOM_MIN = 0.45;
    var ZOOM_MAX = 3;

    var clamp = function (n, lo, hi) {
      return n < lo ? lo : n > hi ? hi : n;
    };

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

    var bgRGB = "5,6,15";
    var starRGB = "255,255,255";
    try {
      var cs = JSON.parse(localStorage.getItem("stars-colors"));
      if (cs) {
        var b = hexToRgbStr(cs.bg);
        var s = hexToRgbStr(cs.star);
        if (b) bgRGB = b;
        if (s) starRGB = s;
      }
    } catch (e) {}

    // Cached fill strings so the render loop never builds them per star/frame.
    // restyle() refreshes them whenever the palette changes (see setColors).
    var bgFill = "rgb(" + bgRGB + ")";
    var fadeStyle = "rgba(" + bgRGB + "," + FADE + ")";
    var restyle = function () {
      bgFill = "rgb(" + bgRGB + ")";
      fadeStyle = "rgba(" + bgRGB + "," + FADE + ")";
      for (var i = 0; i < stars.length; i++) {
        stars[i].style = "rgba(" + starRGB + "," + stars[i].br + ")";
      }
    };

    var spinRate = (DEFAULT_PCT / 100) * SPIN_MAX;
    try {
      var s0 = parseFloat(localStorage.getItem("stars-spin"));
      if (!isNaN(s0)) spinRate = (clamp(s0, -100, 100) / 100) * SPIN_MAX;
    } catch (e) {}

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
      cx = w * 0.5;
      cy = h * 0.45;
    }

    function makeStars() {
      stars = [];
      var diag = Math.sqrt(w * w + h * h);
      var Rmax = diag * 0.62;
      var small = w < 768;
      var count = small ? 320 : 620;
      for (var i = 0; i < count; i++) {
        var r = Rmax * Math.sqrt(Math.random());
        var a0 = Math.random() * Math.PI * 2;
        var b = Math.pow(Math.random(), 1.7);
        var br = 0.35 + b * 0.65;
        stars.push({
          r: r,
          a0: a0,
          size: 0.6 + b * 1.6,
          br: br,
          style: "rgba(" + starRGB + "," + br + ")",
        });
      }
    }

    function clearDark() {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = bgFill;
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
        ctx.fillStyle = st.style;
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

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = fadeStyle;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      var moving = prevRot !== rotation;
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var a2 = st.a0 + rotation;
        var rr = st.r * zoom;
        var style = st.style;
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

      window.addEventListener(
        "wheel",
        function (e) {
          if (!running) return;
          if (!document.documentElement.classList.contains("immersive")) return;
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
        drawStatic();
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

    function setColors(bgHex, starHex) {
      var b = hexToRgbStr(bgHex);
      var s = hexToRgbStr(starHex);
      if (b) bgRGB = b;
      if (s) starRGB = s;
      restyle();
      repaint();
    }

    function setZoom(value) {
      zoom = clamp(Number(value) || 1, ZOOM_MIN, ZOOM_MAX);
      repaint();
    }

    function dispose() {
      stop();
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvas = null;
      ctx = null;
      stars = [];
      inited = false;
    }

    return {
      start: start,
      stop: stop,
      dispose: dispose,
      setSpin: setSpin,
      setColors: setColors,
      setZoom: setZoom,
    };
  })();

  window.__bgStars = StarTrails;

  window.addEventListener("pagehide", function (e) {
    if (!e.persisted) StarTrails.dispose();
  });
})();
