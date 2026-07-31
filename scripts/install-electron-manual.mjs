/**
 * Plan B: descarga e instala el binario de Electron sin usar @electron/get.
 *
 * El descargador oficial (`node_modules/electron/install.js`) usa @electron/get,
 * que tiene su propia caché, su propio manejo de proxy y varias variables de
 * entorno que pueden hacerlo fallar o saltarse la descarga en silencio
 * (ELECTRON_SKIP_BINARY_DOWNLOAD, ELECTRON_MIRROR, ELECTRON_CACHE…).
 *
 * Este script se salta todo eso: baja el zip oficial de GitHub con `fetch`,
 * lo extrae en node_modules/electron/dist y escribe path.txt.
 *
 * Uso:  npm run fix:electron:manual
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, statSync, chmodSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const electronDir = join(root, 'node_modules', 'electron');
const distDir = join(electronDir, 'dist');

const log = (...a) => console.log('[electron-manual]', ...a);
const fail = (msg) => { console.error('[electron-manual] ERROR:', msg); process.exit(1); };

/* -------------------------------------------------- versión y plataforma */

if (!existsSync(electronDir)) {
  fail('Falta node_modules/electron. Ejecuta antes:  npm install');
}

const version = JSON.parse(readFileSync(join(electronDir, 'package.json'), 'utf8')).version;

const PLATAFORMA = { win32: 'win32', darwin: 'darwin', linux: 'linux' }[process.platform];
if (!PLATAFORMA) fail(`Plataforma no soportada: ${process.platform}`);

const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'ia32' ? 'ia32' : 'x64';
const zipName = `electron-v${version}-${PLATAFORMA}-${arch}.zip`;
const url = `https://github.com/electron/electron/releases/download/v${version}/${zipName}`;

const EXE = {
  win32: 'electron.exe',
  linux: 'electron',
  darwin: 'Electron.app/Contents/MacOS/Electron',
}[PLATAFORMA];

log(`Electron ${version} · ${PLATAFORMA}-${arch}`);
log(`Origen: ${url}`);

/* -------------------------------------------------------------- descarga */

const zipPath = join(tmpdir(), zipName);

async function descargar() {
  log('Descargando… (son ~100 MB, puede tardar varios minutos)');
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    fail(`El servidor respondió ${res.status} ${res.statusText}.\n`
      + '  · Comprueba que tienes conexión.\n'
      + '  · Si estás tras un proxy, este script no lo usa: descarga el zip a mano\n'
      + `    desde ${url}\n`
      + '    y sigue la instalación manual de la sección 8 del README.');
  }

  const total = Number(res.headers.get('content-length') || 0);
  let leidos = 0;
  let ultimoPct = -1;

  const cuerpo = Readable.fromWeb(res.body);
  cuerpo.on('data', (chunk) => {
    leidos += chunk.length;
    if (!total) return;
    const pct = Math.floor((leidos / total) * 100);
    if (pct !== ultimoPct && pct % 5 === 0) {
      ultimoPct = pct;
      process.stdout.write(`\r[electron-manual] ${pct}%  (${(leidos / 1048576).toFixed(0)} MB)   `);
    }
  });

  await pipeline(cuerpo, createWriteStream(zipPath));
  process.stdout.write('\n');

  const tam = statSync(zipPath).size;
  if (tam < 50 * 1024 * 1024) {
    fail(`El archivo descargado pesa solo ${(tam / 1048576).toFixed(1)} MB; debería rondar los 100 MB.\n`
      + '  Probablemente un proxy o el antivirus cortaron la descarga.');
  }
  log(`Descargado: ${(tam / 1048576).toFixed(0)} MB`);
}

/* -------------------------------------------------------------- extraer */

async function extraer() {
  let extract;
  try {
    extract = require('extract-zip');
  } catch {
    fail('Falta el paquete extract-zip. Ejecuta:  npm install');
  }

  if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });

  log('Extrayendo en node_modules/electron/dist …');
  await extract(zipPath, { dir: distDir });

  const exePath = join(distDir, EXE);
  if (!existsSync(exePath)) {
    fail(`Se extrajo, pero no aparece ${EXE}.\n`
      + '  Esto suele significar que el antivirus lo puso en cuarentena justo al extraerlo.\n'
      + '  Añade a las exclusiones la carpeta del proyecto y vuelve a intentarlo.');
  }
  if (PLATAFORMA !== 'win32') chmodSync(exePath, 0o755);

  writeFileSync(join(electronDir, 'path.txt'), EXE, 'utf8');
  log('path.txt escrito.');
}

/* ----------------------------------------------------------------- main */

try {
  if (existsSync(zipPath) && statSync(zipPath).size > 50 * 1024 * 1024) {
    log(`Reutilizando el zip ya descargado: ${zipPath}`);
  } else {
    await descargar();
  }
  await extraer();
  rmSync(zipPath, { force: true });
  log('');
  log('Listo. Ejecuta:  npm start');
} catch (e) {
  fail(e?.stack || String(e));
}
