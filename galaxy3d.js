// 3D point-cloud galaxy background, adapted from "Nova - Points" by
// brij121e: https://codepen.io/brij121e/pen/zYaPZGY
// The core shimmers constantly. The whole galaxy drifts gently and can be
// grabbed and spun by the user (with momentum), and the points are pushed
// aside around the mouse cursor.
//
// The galaxy is one of two background modes (the other is a calm starfield).
// It builds lazily and exposes window.__bgGalaxy.start()/stop() so "Stars"
// mode fully halts the WebGL render loop instead of just hiding the canvas.
import * as THREE from "https://cdn.skypack.dev/three@0.136.0";

var prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
var sky = document.getElementById("space-background");

var Galaxy = (function () {
  var inited = false;
  var running = false;
  var renderer = null;
  var loop = null;

  // Heavy one-time setup: only runs the first time the galaxy is shown
  function build() {
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    } catch (e) {
      renderer = null;
      return false; // no WebGL: the static starfield stays visible instead
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.className = "space-canvas";
    sky.appendChild(renderer.domElement);
    sky.classList.add("has-canvas");

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );

    // Shared shader uniforms: animation time, plus the mouse position and
    // strength used to push points away from the cursor
    var gu = {
      time: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uMouseStr: { value: 0 },
      uAspect: { value: window.innerWidth / window.innerHeight },
    };

    var BASE_DIST = 26;
    var coreMaterial;
    var diskMaterial;
    var targetDist = BASE_DIST;
    var currentDist = BASE_DIST;

    // On narrow portrait screens the horizontal field of view shrinks, so
    // pull the camera back until the whole galaxy fits; wide screens keep
    // the original framing. Point size scales up to match the distance.
    var computeTargetDist = function () {
      var aspect = window.innerWidth / window.innerHeight;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      gu.uAspect.value = aspect;
      targetDist = Math.min(
        62,
        Math.max(BASE_DIST, 16 / (Math.tan(Math.PI / 6) * aspect))
      );
    };

    var applyCamera = function (dist) {
      var s = dist / BASE_DIST;
      camera.position.set(0, 7 * s, dist);
      camera.lookAt(0, 0, 0);
      if (coreMaterial && diskMaterial) {
        coreMaterial.size = 0.125 * s;
        diskMaterial.size = 0.125 * s;
      }
    };

    // Mobile browsers fire resize when the URL bar hides while scrolling;
    // ignore those small height-only changes, and glide to any real new
    // framing in the render loop instead of snapping
    var lastWidth = window.innerWidth;
    var lastHeight = window.innerHeight;
    window.addEventListener("resize", function () {
      var w = window.innerWidth;
      var h = window.innerHeight;
      if (w === lastWidth && Math.abs(h - lastHeight) < 160) return;
      lastWidth = w;
      lastHeight = h;
      renderer.setSize(w, h);
      computeTargetDist();
    });

    var small = window.innerWidth < 768;
    var CORE_POINTS = small ? 12000 : 35000;
    var DISK_POINTS = small ? 25000 : 70000;

    var makeAttributes = function (count, makePoint) {
      var pts = [];
      var sizes = [];
      var shift = [];
      for (var i = 0; i < count; i++) {
        pts.push(makePoint());
        sizes.push(Math.random() * 1.5 + 0.5);
        shift.push(
          Math.random() * Math.PI,
          Math.random() * Math.PI * 2,
          (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
          Math.random() * 0.9 + 0.1
        );
      }
      var geometry = new THREE.BufferGeometry().setFromPoints(pts);
      geometry.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
      geometry.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));
      return geometry;
    };

    // Spherical core
    var coreGeometry = makeAttributes(CORE_POINTS, function () {
      return new THREE.Vector3()
        .randomDirection()
        .multiplyScalar(Math.random() * 0.5 + 9.5);
    });

    // Wide, thin disk
    var diskGeometry = makeAttributes(DISK_POINTS, function () {
      var r = 10;
      var R = 40;
      var rand = Math.pow(Math.random(), 1.5);
      var radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
      return new THREE.Vector3().setFromCylindricalCoords(
        radius,
        Math.random() * 2 * Math.PI,
        (Math.random() - 0.5) * 2
      );
    });

    var colorChunk =
      "#include <color_vertex>\n" +
      "float d = length(abs(position) / vec3(40., 10., 40));\n" +
      "d = clamp(d, 0., 1.);\n" +
      "vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;";

    // Screen-space repulsion: after the point is projected, push it away from
    // the cursor when it falls inside a soft radius
    var repulseChunk =
      "#include <project_vertex>\n" +
      "vec2 mNdc = gl_Position.xy / gl_Position.w;\n" +
      "vec2 mDiff = (mNdc - uMouse) * vec2(uAspect, 1.0);\n" +
      "float mDist = length(mDiff);\n" +
      "if (uMouseStr > 0.001 && mDist < 0.22) {\n" +
      "  float f = 1.0 - mDist / 0.22; f = f * f;\n" +
      "  vec2 mDir = mDist > 0.0001 ? normalize(mDiff) / vec2(uAspect, 1.0) : vec2(0.0);\n" +
      "  gl_Position.xy += mDir * f * 0.15 * uMouseStr * gl_Position.w;\n" +
      "}";

    var makeMaterial = function (withWobble) {
      return new THREE.PointsMaterial({
        size: 0.125,
        transparent: true,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        onBeforeCompile: function (shader) {
          shader.uniforms.time = gu.time;
          shader.uniforms.uMouse = gu.uMouse;
          shader.uniforms.uMouseStr = gu.uMouseStr;
          shader.uniforms.uAspect = gu.uAspect;
          var vs =
            "uniform float time;\n" +
            "uniform vec2 uMouse;\n" +
            "uniform float uMouseStr;\n" +
            "uniform float uAspect;\n" +
            "attribute float sizes;\n" +
            "attribute vec4 shift;\n" +
            "varying vec3 vColor;\n" +
            shader.vertexShader;
          vs = vs
            .replace("gl_PointSize = size;", "gl_PointSize = size * sizes;")
            .replace("#include <color_vertex>", colorChunk)
            .replace("#include <project_vertex>", repulseChunk);
          if (withWobble) {
            vs = vs.replace(
              "#include <begin_vertex>",
              "#include <begin_vertex>\n" +
                "float t = time;\n" +
                "float moveT = mod(shift.x + shift.z * t, PI2);\n" +
                "float moveS = mod(shift.y + shift.z * t, PI2);\n" +
                "transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.a;"
            );
          }
          shader.vertexShader = vs;
          shader.fragmentShader = ("varying vec3 vColor;\n" + shader.fragmentShader)
            .replace(
              "#include <clipping_planes_fragment>",
              "#include <clipping_planes_fragment>\n" +
                "float d = length(gl_PointCoord.xy - 0.5);"
            )
            .replace(
              "vec4 diffuseColor = vec4( diffuse, opacity );",
              "vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.1, d) );"
            );
        },
      });
    };

    // Core wobbles forever; the disk holds still
    coreMaterial = makeMaterial(true);
    diskMaterial = makeMaterial(false);
    var core = new THREE.Points(coreGeometry, coreMaterial);
    var disk = new THREE.Points(diskGeometry, diskMaterial);
    [core, disk].forEach(function (points) {
      points.rotation.order = "ZYX";
      points.rotation.z = 0.2;
      points.position.y = -1.5;
      scene.add(points);
    });

    computeTargetDist();
    currentDist = targetDist;
    applyCamera(currentDist);

    // ----- Interaction: drag to spin (with momentum) + a gentle idle drift -----
    var enterDir = document.documentElement.getAttribute("data-enter");
    var spinVel =
      enterDir === "back" ? -1.4 : enterDir === "forward" ? 1.4 : 0.5;
    var rotY = 0; // accumulated spin around the vertical axis
    var tilt = 0; // current tilt, eases back to level when released
    var dragging = false;
    var lastX = 0;
    var lastY = 0;
    var lastDx = 0;
    var targetStr = 0; // target mouse-repulsion strength
    var ROT = 0.006; // radians per pixel dragged
    var IDLE_SPIN = 0.04; // gentle constant drift so it always feels alive

    var isInteractive = function (el) {
      return (
        el &&
        el.closest &&
        el.closest("a, button, input, textarea, select, label, summary, .bg-toggle")
      );
    };

    window.addEventListener("pointermove", function (e) {
      gu.uMouse.value.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      targetStr = 1;
      if (dragging) {
        var dx = e.clientX - lastX;
        var dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        lastDx = dx;
        rotY += dx * ROT;
        tilt = Math.max(-0.7, Math.min(0.7, tilt + dy * ROT));
        if (e.cancelable) e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener("pointerdown", function (e) {
      if (!running) return;
      if (document.documentElement.getAttribute("data-bg") !== "galaxy") return;
      if (isInteractive(e.target)) return;
      // On touch, only grab in immersive mode so normal scrolling still works
      if (
        e.pointerType !== "mouse" &&
        !document.documentElement.classList.contains("immersive")
      )
        return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      lastDx = 0;
      document.body.style.userSelect = "none";
    });

    var endDrag = function () {
      if (!dragging) return;
      dragging = false;
      spinVel = lastDx * ROT * 14; // carry the fling as momentum
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    document.addEventListener("mouseleave", function () {
      targetStr = 0;
    });

    var clock = new THREE.Clock();
    loop = function () {
      var delta = Math.min(clock.getDelta(), 0.1);
      gu.time.value = clock.elapsedTime * 0.5 * Math.PI;
      gu.uMouseStr.value +=
        (targetStr - gu.uMouseStr.value) * Math.min(1, delta * 5);

      if (Math.abs(currentDist - targetDist) > 0.01) {
        currentDist += (targetDist - currentDist) * Math.min(1, delta * 3);
        applyCamera(currentDist);
      }

      if (!dragging) {
        rotY += (spinVel + IDLE_SPIN) * delta;
        spinVel *= Math.exp(-1.2 * delta);
        tilt += (0 - tilt) * Math.min(1, delta * 2);
      }

      core.rotation.y = rotY;
      disk.rotation.y = rotY;
      core.rotation.x = tilt;
      disk.rotation.x = tilt;

      renderer.render(scene, camera);
    };

    inited = true;
    return true;
  }

  function start() {
    if (prefersReducedMotion || !sky) return;
    if (!inited && !build()) return;
    if (renderer && !running) {
      renderer.setAnimationLoop(loop);
      running = true;
    }
  }

  // Halt the render loop entirely so Stars mode costs no GPU
  function stop() {
    if (renderer && running) {
      renderer.setAnimationLoop(null);
      running = false;
    }
  }

  return { start: start, stop: stop };
})();

window.__bgGalaxy = Galaxy;

// Start immediately if the page loaded in galaxy mode (the inline head script
// sets data-bg from the saved preference before first paint)
if (document.documentElement.getAttribute("data-bg") === "galaxy") {
  Galaxy.start();
}
