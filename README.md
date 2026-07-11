# joseph.jbressani.org

Personal portfolio website for Joseph Bressani, a Computer Engineering student
at the University of South Florida and Data Solutions Intern at DTCC.

Built with vanilla HTML, CSS, and JavaScript. Hosted on GitHub Pages with a
custom domain.

## Pages

- `index.html`: Home with current-work and featured-project highlights
- `experience.html`: Work experience
- `projects.html`: Selected projects and live source-update signal
- `education.html`: Education and technical skills
- `contact.html`: Contact links
- `404.html`: Custom not-found page
- `robots.txt` and `sitemap.xml`: Search-engine discovery files

## Features

- Responsive layout with a mobile hamburger navigation
- Three user-controlled background states: stars, a Three.js galaxy, and an
  immersive canvas star-trail mode
- Custom color palettes for both background modes
- Social preview metadata and a custom Open Graph image
- Recruiter-ready resume access and a display-only email copy control
- Locally hosted Space Grotesk and a lazily loaded, pinned Three.js module
- Respects `prefers-reduced-motion`
- No build step, just static files

Third-party source, version, hash, and license details are recorded in
`THIRD_PARTY_NOTICES.md`.

## Local development

Serve the repository root with any static file server. Root-relative routes are
used for canonical home, favicon, and resume URLs, so `file://` previews are not
supported.
