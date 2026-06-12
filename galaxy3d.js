// 3D point-cloud galaxy background, adapted from "Nova - Points" by
// brij121e: https://codepen.io/brij121e/pen/zYaPZGY
// The core shimmers constantly. The disk sits still, except on page
// changes where it spins in the swipe direction and eases to a stop.
import * as THREE from "https://cdn.skypack.dev/three@0.136.0";

var prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
var sky = document.getElementById("space-background");

if (sky && !prefersReducedMotion) {
  initGalaxy();
}

function initGalaxy() {
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
  } catch (e) {
    return; // no WebGL: the static starfield stays visible instead
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

  var BASE_DIST = 26;
  var coreMaterial;
  var diskMaterial;

  // On narrow portrait screens the horizontal field of view shrinks, so
  // pull the camera back until the whole galaxy fits; wide screens keep
  // the original framing. Point size scales up to match the distance.
  var updateCamera = function () {
    var aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    var dist = Math.min(
      62,
      Math.max(BASE_DIST, 16 / (Math.tan(Math.PI / 6) * aspect))
    );
    var s = dist / BASE_DIST;
    camera.position.set(0, 7 * s, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    if (coreMaterial && diskMaterial) {
      coreMaterial.size = 0.125 * s;
      diskMaterial.size = 0.125 * s;
    }
  };

  window.addEventListener("resize", function () {
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateCamera();
  });

  var gu = { time: { value: 0 } };
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

  var makeMaterial = function (withWobble) {
    return new THREE.PointsMaterial({
      size: 0.125,
      transparent: true,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      onBeforeCompile: function (shader) {
        shader.uniforms.time = gu.time;
        var vs =
          "uniform float time;\n" +
          "attribute float sizes;\n" +
          "attribute vec4 shift;\n" +
          "varying vec3 vColor;\n" +
          shader.vertexShader;
        vs = vs
          .replace("gl_PointSize = size;", "gl_PointSize = size * sizes;")
          .replace("#include <color_vertex>", colorChunk);
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

  updateCamera();

  // Page-change spin: start fast in the swipe direction, ease to a stop
  var enterDir = document.documentElement.getAttribute("data-enter");
  var spinVelocity =
    enterDir === "back" ? -1.4 : enterDir === "forward" ? 1.4 : 0.5;

  var clock = new THREE.Clock();
  renderer.setAnimationLoop(function () {
    var delta = Math.min(clock.getDelta(), 0.1);
    gu.time.value = clock.elapsedTime * 0.5 * Math.PI;
    disk.rotation.y += spinVelocity * delta;
    spinVelocity *= Math.exp(-1.3 * delta);
    renderer.render(scene, camera);
  });
}
