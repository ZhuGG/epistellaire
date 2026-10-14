import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(root, 'src/manifest.json')));
const source = JSON.parse(await readFile(resolve(root, 'pages.json')));
assert.equal(manifest.length, source.length);
assert.equal(new Set(manifest.map(p => p.id)).size, manifest.length);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
for (const [index, page] of manifest.entries()) {
  for (const key of ['image', 'thumbnail', 'original']) await access(resolve(root, 'public', page[key]));
  assert(page.width > 0 && page.height > 0);
  assert.equal(hash(await readFile(resolve(root, source[index].src))), hash(await readFile(resolve(root, 'public', page.original))));
}
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size);
const js = await readFile(resolve(root, 'src/main.js'), 'utf8');
for (const match of js.matchAll(/\$\('([^']+)'\)/g)) assert(ids.includes(match[1]), `Élément absent : ${match[1]}`);
for (const file of ['src/main.js', 'src/book.js', 'scripts/prepare-assets.mjs']) execFileSync(process.execPath, ['--check', resolve(root, file)]);
console.log(`${manifest.length} originaux intègres ; manifeste, ressources, identifiants et syntaxe vérifiés.`);
