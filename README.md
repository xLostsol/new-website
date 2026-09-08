# joseph.jbressani.org

Joseph Bressani's portfolio: Computer Engineering at USF, a completed DTCC Data
Solutions internship, and projects in infrastructure, multiplayer software,
and a Microsoft-sponsored student capstone.

Dark by default, with an open resume-inspired homepage, restrained blue accents, project
case studies, profile links, and a downloadable resume. Entries offer animated
previews on hover or keyboard focus, plus Preview buttons for touch. Escape or
an outside click dismisses a preview; entry links open the full detail pages.
Section shortcuts navigate the page, while animated skill links lead to relevant
detail pages. Heading words lift on hover; motion respects reduced-motion preferences. The site remains
static HTML, CSS, and JavaScript, hosted on GitHub Pages with its existing domain.

## Editing and checking

Edit page content in `site/pages/` and the shared shell in `site/layout.html`.
Run these commands with Node.js (no npm dependencies or install required):

```sh
npm run build
npm run check
```

The build generates the root HTML pages and sitemap, with content hashes on
shared CSS and JavaScript URLs. Include generated files when publishing to the
existing GitHub Pages setup. Do not edit generated HTML directly.

Serve the repository root to preview:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`. Root-relative links require an HTTP server.
The check command verifies local routes, anchors, metadata, and resume access.
For visual changes, also check desktop/mobile layouts and keyboard interactions.

## Pages and assets

- Home, Work, Experience, About (`education.html`), and Contact preserve existing routes.
- Homelab, Sky Slam, and Capstone have dedicated case studies.
- `assets/Joseph-Bressani-Resume.pdf` is the supplied resume, unchanged.
- The Sky Slam cover uses an optimized WebP image and is labeled as promotional
  artwork. The homelab diagram is a logical overview.

Local audit records, planning notes, and optional tooling are kept in the ignored
`Storage/` folder and are not required to build or publish the site.
