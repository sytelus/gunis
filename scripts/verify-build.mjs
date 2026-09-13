/** Fail the build for broken local links/assets, metadata, missing pages or
 * accidental legacy branding. This inspects the actual deployment artifact. */
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('dist');
const entries = await readdir(root, { recursive: true });
const htmlFiles = entries.filter((path) => path.endsWith('.html'));
const errors = [];
for (const file of htmlFiles) {
  const html = await readFile(resolve(root, file), 'utf8');
  if (!html.includes('rel="canonical"') && !html.includes('rel=canonical'))
    errors.push(`${file}: missing canonical`);
  if (!/<html\s+lang=["']?en/.test(html)) errors.push(`${file}: missing language`);
  if (/www\.gunis\.ai|Designed in Seattle|Gunis LLC/.test(html))
    errors.push(`${file}: legacy branding`);
  for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
    const url = match[1];
    if (!url.startsWith('/') || url.startsWith('//')) continue;
    const path = url.split(/[?#]/)[0];
    if (!path) continue;
    const local = resolve(root, '.' + path, path.endsWith('/') ? 'index.html' : '');
    try {
      await stat(local);
    } catch {
      errors.push(`${file}: missing ${path}`);
    }
  }
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(match[1]);
    } catch {
      errors.push(`${file}: invalid JSON-LD`);
    }
  }
}
for (const file of ['CNAME', '.nojekyll', 'robots.txt', 'sitemap.xml', 'favicon.png', '404.html']) {
  try {
    await stat(resolve(root, file));
  } catch {
    errors.push(`missing ${file}`);
  }
}
assert.equal((await readFile(resolve(root, 'CNAME'), 'utf8')).trim(), 'guni.ai');
assert.equal(htmlFiles.length, 28, 'Expected canonical routes, legacy redirects, and 404');
const scripts = entries.filter((path) => extname(path) === '.js');
const javascriptBytes = (
  await Promise.all(scripts.map((path) => stat(resolve(root, path))))
).reduce((total, info) => total + info.size, 0);
if (javascriptBytes > 60_000) errors.push(`JavaScript budget exceeded: ${javascriptBytes} bytes`);
if (errors.length) throw new Error(errors.join('\n'));
console.log(
  `Verified ${htmlFiles.length} HTML files, internal links/assets, JSON-LD, and canonical domain. JavaScript: ${javascriptBytes.toLocaleString()} bytes.`,
);
