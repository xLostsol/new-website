# joseph.jbressani.org

Joseph Bressani's portfolio: Computer Engineering at USF, a completed DTCC Data
Solutions internship, and projects in infrastructure, multiplayer software,
and a Microsoft-sponsored student capstone.

Dark by default, with a resume-style homepage, restrained blue accents, project
case studies, profile links, and a downloadable resume. Homepage entry titles
link to the full detail pages. The site remains static HTML, CSS, and
JavaScript, hosted on GitHub Pages with its existing domain.

## Repository layout

| Path | Purpose |
| --- | --- |
| `docs/` | The published website. GitHub Pages serves only this folder. |
| `site/` | Page content (`site/pages/`) and the shared page shell (`site/layout.html`). |
| `scripts/` | `build.mjs` generates the pages; `check.mjs` verifies them. |

Inside `docs/`, the HTML pages and `sitemap.xml` are generated, so don't edit
them directly. Styles (`docs/css/`), scripts (`docs/js/`), and files in
`docs/assets/` are edited in place.

## Editing and checking

Edit page content in `site/pages/` and the shared shell in `site/layout.html`.
Run these commands with Node.js (no npm dependencies or install required):

```sh
npm run build
npm run check
```

The build writes the HTML pages and sitemap into `docs/`, with content hashes
on shared CSS and JavaScript URLs. Commit the regenerated files with your
changes.

To preview, serve the `docs/` folder:

```sh
python -m http.server 4173 --bind 127.0.0.1 --directory docs
```

Open `http://127.0.0.1:4173/`. Root-relative links require an HTTP server.
The check command verifies local routes, anchors, metadata, and resume access.
For visual changes, also check desktop/mobile layouts and keyboard interactions.

## Publishing

GitHub Pages deploys from a branch: `main`, folder `/docs` (Settings > Pages).
`docs/CNAME` keeps the custom domain, and `docs/.nojekyll` serves files as-is.

## Pages and assets

- Home, Projects, Experience, About (`education.html`), and Contact preserve existing routes.
- Homelab, Sky Slam, and Capstone have dedicated case studies.
- `docs/assets/Joseph-Bressani-Resume.pdf` is the supplied resume, unchanged.
- The Sky Slam cover uses an optimized WebP image and is labeled as promotional
  artwork. The homelab diagram is a logical overview.

Local audit records, planning notes, and optional tooling are kept in the ignored
`Storage/` folder and are not required to build or publish the site.
