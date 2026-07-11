# joseph.jbressani.org

Personal portfolio website for Joseph Bressani, a Computer Engineering student
at the University of South Florida and Data Solutions Intern at DTCC.

Built with vanilla HTML, CSS, and JavaScript. Hosted on GitHub Pages with a
custom domain.

## Pages

- `index.html`: Home with current-work and featured-project highlights
- `experience.html`: Work experience
- `projects.html`: Selected projects
- `education.html`: Education and technical skills
- `contact.html`: Contact links
- `404.html`: Custom not-found page
- `robots.txt` and `sitemap.xml`: Search-engine discovery files

## Features

- Responsive layout with a mobile hamburger navigation
- Two user-controlled background modes: stars and a Three.js galaxy
- Custom galaxy color palettes
- Social preview metadata and a custom Open Graph image
- Display-only email with a copy control
- Locally hosted Space Grotesk and a lazily loaded, pinned Three.js module
- Respects `prefers-reduced-motion`
- No build step, just static files

Third-party source, version, hash, and license details are recorded in
`THIRD_PARTY_NOTICES.md`.

## Local development

Serve the repository root with any static file server. Root-relative routes are
used for canonical home and favicon URLs, so `file://` previews are not
supported.
