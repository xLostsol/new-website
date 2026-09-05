import { readdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const names = (await readdir(path.join(root, 'site/pages'))).filter(name => name.endsWith('.html'));
const documents = new Map(await Promise.all(names.map(async name => [name, await readFile(path.join(root, name), 'utf8')])));
let links = 0;
for (const [name, html] of documents) {
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${name}: exactly one main heading`);
  assert(!/\{\{[A-Z_]+\}\}/.test(html), `${name}: unresolved template`);
  assert(html.includes('name="description"') && html.includes('rel="canonical"'), `${name}: metadata missing`);
  assert(html.includes('/assets/Joseph-Bressani-Resume.pdf'), `${name}: missing resume access`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, `${name}: duplicate IDs`);
  assert(!/galaxy3d|experiment\.js|startrails|woff2/.test(html), `${name}: optional resources leaked into core page`);
  for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:)/.test(raw)) continue;
    const url = new URL(raw, `https://local.test/${name}`);
    const file = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).slice(1);
    assert((await stat(path.join(root, file))).isFile(), `${name}: missing ${raw}`);
    if (url.hash) {
      const target = documents.get(file) || await readFile(path.join(root, file), 'utf8');
      assert(target.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${name}: broken anchor ${raw}`);
    }
    links++;
  }
}
const pdf = await readFile(path.join(root, 'assets/Joseph-Bressani-Resume.pdf'));
assert.equal(pdf.subarray(0, 5).toString(), '%PDF-', 'Resume must be a PDF');
const homepage = documents.get('index.html');
assert(homepage.includes('3.77') && homepage.includes('May 2027'), 'Homepage education is out of date');
assert(!documents.get('experience.html').includes('June 2026 – Present'), 'DTCC dates are out of date');
assert(!homepage.includes('worksFor'), 'Completed internship must not be presented as current employment');
console.log(`Checked ${documents.size} pages, ${links} local links/assets, anchors, metadata, and the resume PDF.`);
