import { cp, copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');

const copy = async (from, to) => {
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to, { recursive: true, force: true });
};

await copy(join(root, 'assets', 'pages'), join(dist, 'assets', 'pages'));
await copyFile(join(root, 'pages.json'), join(dist, 'pages.json'));
