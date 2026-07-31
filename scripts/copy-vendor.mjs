/**
 * Copia three.js desde node_modules a src/vendor/ para que el renderer
 * pueda importarlo por ruta relativa (sin bundler, sin internet en runtime).
 * Se ejecuta solo con: npm run vendor
 */
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const vendorDir = join(root, 'src', 'vendor');

const SOURCES = [
  {
    from: join(root, 'node_modules', 'three', 'build', 'three.module.js'),
    to: join(vendorDir, 'three.module.js'),
  },
];

mkdirSync(vendorDir, { recursive: true });

let ok = true;
for (const { from, to } of SOURCES) {
  if (!existsSync(from)) {
    console.error(`[vendor] NO ENCONTRADO: ${from}`);
    console.error('[vendor] Ejecuta primero: npm install');
    ok = false;
    continue;
  }
  copyFileSync(from, to);
  console.log(`[vendor] OK -> ${to}`);
}

process.exit(ok ? 0 : 1);
