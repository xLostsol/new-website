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
})();
