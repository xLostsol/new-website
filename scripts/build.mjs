import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const pages = [
  { file: 'index', title: 'Joseph Bressani — Software & Infrastructure', description: 'Computer Engineering student at USF, graduating May 2027. Data tooling at DTCC, private infrastructure, and published multiplayer software.', active: 'home' },
  { file: 'projects', title: 'Selected work — Joseph Bressani', description: 'Explore Sky Slam, a Proxmox homelab, and a Microsoft-sponsored capstone on agentic development.', active: 'work' },
  { file: 'experience', title: 'Experience — Joseph Bressani', description: 'Summer 2026 Data Solutions internship at DTCC: Apache Iceberg, Snowflake, AWS S3, and developer tooling.', active: 'experience' },
  { file: 'education', title: 'About & education — Joseph Bressani', description: 'Computer Engineering at the University of South Florida. Expected May 2027, 3.77 GPA, and interests in software and infrastructure.', active: 'about' },
  { file: 'contact', title: 'Contact — Joseph Bressani', description: 'Contact Joseph Bressani by email, LinkedIn, or GitHub, and download his resume.', active: 'contact' },
  { file: 'sky-slam', title: 'Sky Slam — Joseph Bressani', description: 'A published multiplayer Roblox game with strictly typed Luau, reactive UI, and real-time game-state synchronization.', active: 'work' },
  { file: 'homelab', title: 'Homelab infrastructure — Joseph Bressani', description: 'Private remote access, isolated Proxmox services, restore-tested backups, and a hardened Python wake relay.', active: 'work' },
  { file: 'capstone', title: 'Agentic development capstone — Joseph Bressani', description: 'A Microsoft-sponsored student capstone researching AI agents for coding, testing, review, and deployment.', active: 'work' },
  { file: '404', title: 'Page not found — Joseph Bressani', description: 'Find your way back to Joseph Bressani’s portfolio.', active: '', robots: '<meta name="robots" content="noindex" />' }
];
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const hash = async file => createHash('sha256').update(await readFile(path.join(root, file))).digest('hex').slice(0, 10);
const layout = await readFile(path.join(root, 'site/layout.html'), 'utf8');
const cssVersion = await hash('css/styles.css');
const jsVersion = await hash('js/script.js');
const resumeAssets = `<link rel="stylesheet" href="/css/resume.css?v=${await hash('css/resume.css')}" /><script src="/js/resume.js?v=${await hash('js/resume.js')}" defer></script>`;
for (const page of pages) {
  const url = `https://joseph.jbressani.org/${page.file === 'index' ? '' : `${page.file}.html`}`;
  const navigation = [ ['work', '/projects.html', 'Work'], ['experience', '/experience.html', 'Experience'], ['about', '/education.html', 'About'], ['contact', '/contact.html', 'Contact'] ]
    .map(([key, href, label]) => `<a href="${href}"${page.active === key ? ` class="active"${href === `/${page.file}.html` ? ' aria-current="page"' : ''}` : ''}>${label}</a>`).join('\n');
  const data = {
    TITLE: escape(page.title), DESCRIPTION: escape(page.description), URL: url,
    NAV: navigation, CONTENT: await readFile(path.join(root, `site/pages/${page.file}.html`), 'utf8'),
    CSS_VERSION: cssVersion, JS_VERSION: jsVersion, ROBOTS: page.robots || '',
    PAGE_ASSETS: page.file === 'index' ? resumeAssets : '',
    STRUCTURED_DATA: page.file === 'index' ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: 'Joseph Bressani', url, description: page.description, affiliation: { '@type': 'CollegeOrUniversity', name: 'University of South Florida' }, sameAs: ['https://github.com/xLostsol', 'https://www.linkedin.com/in/joseph-bressani-0369a224a/'] })}</script>` : ''
  };
  const html = layout.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in data)) throw new Error(`Unknown template key ${key}`);
    return data[key];
  });
  await writeFile(path.join(root, `${page.file}.html`), html.replace(/[\t ]+$/gm, ''));
}
await writeFile(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter(page => page.file !== '404').map(page => `  <url><loc>https://joseph.jbressani.org/${page.file === 'index' ? '' : `${page.file}.html`}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`Built ${pages.length} static pages.`);
