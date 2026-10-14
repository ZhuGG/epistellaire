import sharp from 'sharp';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, basename } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = JSON.parse(await readFile(resolve(root, 'pages.json'), 'utf8'));
for (const dir of ['plates', 'thumbs', 'originals', 'identity']) await mkdir(resolve(root, 'public', dir), { recursive: true });
const manifest = [];
for (const [index, page] of pages.entries()) {
  const name = basename(page.src, '.jpg'), source = resolve(root, page.src);
  const metadata = await sharp(source).metadata();
  await sharp(source).rotate().resize({ width: 1800, height: 1500, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toFile(resolve(root, 'public/plates', name + '.webp'));
  await sharp(source).rotate().resize({ width: 360, height: 280, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(resolve(root, 'public/thumbs', name + '.webp'));
  await copyFile(source, resolve(root, 'public/originals', basename(page.src)));
  manifest.push({ id: name, title: index === 0 ? 'Couverture' : `Planche ${String(index).padStart(2, '0')}`, width: metadata.width, height: metadata.height, image: `plates/${name}.webp`, thumbnail: `thumbs/${name}.webp`, original: `originals/${basename(page.src)}` });
}
// La copie du logo rend le dépôt autonome après préparation.
const logo = resolve(root, 'public/identity/logo.png');
try {
  const sourceLogo = await readFile(resolve(root, '../../05-identite-visuelle/logo-helene-lagnieu.png'));
  await sharp(sourceLogo).resize({ width: 320, withoutEnlargement: true }).png({ palette: true }).toFile(logo);
}
catch { await readFile(logo); }
await writeFile(resolve(root, 'src/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`${manifest.length} images préparées ; originaux conservés à l’identique.`);
