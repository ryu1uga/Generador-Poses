/**
 * Repara una instalación de Electron incompleta.
 *
 * Síntoma:  "Electron failed to install correctly, please delete
 *            node_modules/electron and try installing again"
 *
 * Causa habitual (npm 10+ / npm 12):
 *   npm bloquea por defecto los scripts de instalación de las dependencias.
 *   El paquete `electron` de npm pesa solo ~1.5 MB; el ejecutable real
 *   (~200 MB) lo descarga su `postinstall` (node install.js). Si npm bloquea
 *   ese script, queda `dist/` casi vacío y sin `path.txt`, que es justo lo que
 *   comprueba electron/index.js al arrancar.
 *
 *   Lo delata este aviso durante npm install:
 *     npm warn allow-scripts 1 package has install scripts not yet covered...
 *
 * Este script llama al descargador de Electron a mano, así que funciona
 * independientemente de la política de scripts de npm.
 *
 * Uso:  npm run fix:electron
 */
import { existsSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const electronDir = join(root, 'node_modules', 'electron');
const esWindows = process.platform === 'win32';
const npmCmd = esWindows ? 'npm.cmd' : 'npm';

const log = (...a) => console.log('[fix:electron]', ...a);
const err = (...a) => console.error('[fix:electron]', ...a);

/** @returns {string|null} descripción del problema, o null si está todo bien */
function diagnostico() {
  if (!existsSync(electronDir)) return 'el paquete electron no está instalado';

  const dist = join(electronDir, 'dist');
  if (!existsSync(dist)) return 'falta node_modules/electron/dist';

  const exe = esWindows ? 'electron.exe' : 'electron';
  const contenido = readdirSync(dist);
  if (!contenido.includes(exe)) {
    return `dist/ no contiene ${exe} (solo: ${contenido.join(', ') || 'nada'})`;
  }

  const pathFile = join(electronDir, 'path.txt');
  if (!existsSync(pathFile)) return 'falta path.txt';
  if (!existsSync(join(dist, readFileSync(pathFile, 'utf8').trim()))) {
    return 'path.txt apunta a un ejecutable que no existe';
  }
  return null;
}

/** Ejecuta un comando mostrando su salida en vivo. */
function correr(cmd, args, cwd = root) {
  log(`> ${cmd} ${args.join(' ')}`);
  return spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: esWindows }).status === 0;
}

/* ------------------------------------------------------------------ inicio */

const problema = diagnostico();
if (!problema) {
  log('Electron ya está bien instalado. Nada que reparar.');
  log('Ejecuta: npm start');
  process.exit(0);
}
log('Problema detectado:', problema);

// 1. Asegurar que el paquete de npm esté presente (esto sí funciona siempre;
//    lo que npm puede bloquear es su postinstall, no la descarga del paquete).
if (!existsSync(electronDir)) {
  const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    .devDependencies.electron;
  log(`Instalando el paquete electron@${version} …`);
  if (!correr(npmCmd, ['install', `electron@${version}`, '--no-audit', '--no-fund'])) {
    err('No se pudo instalar el paquete electron desde npm. ¿Hay red / proxy?');
    process.exit(1);
  }
}

// 2. Limpiar una extracción a medias antes de reintentar.
const dist = join(electronDir, 'dist');
if (existsSync(dist)) {
  log('Limpiando node_modules/electron/dist (extracción incompleta) …');
  rmSync(dist, { recursive: true, force: true });
}
rmSync(join(electronDir, 'path.txt'), { force: true });

// 3. Llamar al descargador DIRECTAMENTE. Aquí es donde se baja el zip de
//    ~100 MB con el ejecutable. Puede tardar varios minutos la primera vez.
log('Descargando el binario de Electron (~100 MB, puede tardar unos minutos) …');
log('');
const ok = correr(process.execPath, ['install.js'], electronDir);
log('');

const restante = diagnostico();

if (ok && !restante) {
  log('Listo. Ya puedes ejecutar: npm start');
  log('');
  log('Consejo: para que los futuros `npm install` no vuelvan a saltarse este');
  log('paso, autoriza el script una sola vez con:  npm approve-scripts electron');
  process.exit(0);
}

err('Sigue incompleto:', restante || 'el descargador terminó con error');
err('');
err('Revisa el error de arriba. Los culpables habituales:');
err('  · Antivirus: pon en exclusiones la carpeta del proyecto y');
err('    %LOCALAPPDATA%\\electron\\Cache, y reintenta.');
err('  · Proxy corporativo: npm config set https-proxy http://usuario:clave@proxy:puerto');
err('  · Caché corrupta: borra %LOCALAPPDATA%\\electron\\Cache y reintenta.');
err('');
err('Instalación manual paso a paso: sección 8 del README.');
process.exit(1);
