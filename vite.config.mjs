import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const products = JSON.parse(readFileSync(new URL('./src/data/products.json', import.meta.url)));
const pages = [
  'index.html',
  '404.html',
  'merch/index.html',
  'portfolio/index.html',
  'about/index.html',
  'contact/index.html',
  'privacy/index.html',
  ...products.flatMap(({ slug }) => [`merch/${slug}/index.html`, `portfolio/${slug}/index.html`]),
];

export default defineConfig({
  base: '/', // The canonical site is a custom-domain GitHub Pages site.
  server: { host: '0.0.0.0', allowedHosts: ['terminal.local'] },
  plugins: [
    {
      name: 'guni-glsl',
      // Shaders stay readable in src/light-field.ts: commented and indented
      // template literals. Ship them without comments, indentation or blank
      // lines. GLSL has no strings, so '//' always starts a comment.
      transform(code, id) {
        if (!id.endsWith('/src/light-field.ts')) return;
        let inside = false;
        const lines = [];
        for (const line of code.split('\n')) {
          const opened = inside;
          if ((line.match(/`/g) ?? []).length % 2) inside = !inside;
          if (!opened) lines.push(line);
          else {
            const stripped = line.includes('`') ? line.trim() : line.replace(/\/\/.*$/, '').trim();
            if (stripped) lines.push(stripped);
          }
        }
        return { code: lines.join('\n'), map: null };
      },
    },
    {
      name: 'guni-static-pages',
      // The templates run in Node rather than in the browser. Regenerate their
      // HTML when authors edit copy or catalog data during local development.
      handleHotUpdate({ file, server }) {
        const sources = ['src/pages.mjs', 'src/catalog.mjs', 'src/data/products.json'];
        if (!sources.some((source) => file === resolve(source))) return;
        execFileSync(process.execPath, ['scripts/generate.mjs'], { stdio: 'inherit' });
        server.ws.send({ type: 'full-reload' });
        return [];
      },
    },
  ],
  build: {
    target: 'es2022',
    rollupOptions: { input: pages.map((page) => resolve(page)) },
  },
});
