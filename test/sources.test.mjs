import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const jsDir = join(root, 'src', 'js');

const files = readdirSync(jsDir).filter((f) => f.endsWith('.js'));

describe('Código fuente del renderer', () => {
  test('hay módulos que revisar', () => {
    assert.ok(files.length >= 6, `solo se encontraron ${files.length} módulos`);
  });

  for (const f of files) {
    test(`${f} no tiene errores de sintaxis`, () => {
      // node --check valida el parseo sin ejecutar nada (ni tocar el DOM).
      execFileSync(process.execPath, ['--check', join(jsDir, f)], { stdio: 'pipe' });
    });
  }

  test('los módulos que usan three lo importan por ruta relativa (sin bundler)', () => {
    for (const f of files) {
      const src = readFileSync(join(jsDir, f), 'utf8');
      if (!src.includes('THREE')) continue;
      assert.ok(
        src.includes("from '../vendor/three.module.js'"),
        `${f} usa THREE pero no importa ../vendor/three.module.js`,
      );
      assert.ok(
        !/from ['"]three['"]/.test(src),
        `${f} importa el paquete "three" por nombre; sin importmap eso falla`,
      );
    }
  });

  test('los módulos puros no dependen de three ni del DOM', () => {
    for (const f of ['ik.js', 'poses.js', 'skeleton-def.js']) {
      const src = readFileSync(join(jsDir, f), 'utf8');
      assert.ok(!src.includes('three.module.js'), `${f} debería ser independiente de three`);
      assert.ok(!/\bdocument\.|window\./.test(src), `${f} no debería tocar el DOM`);
    }
  });

  test('el HTML carga la app como módulo y no usa scripts en línea', () => {
    const html = readFileSync(join(root, 'src', 'index.html'), 'utf8');
    assert.ok(html.includes('type="module" src="./js/app.js"'), 'falta el script de entrada');
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/.test(html),
      'hay un <script> en línea; la CSP de la app lo bloquearía');
  });

  test('el HTML declara todos los elementos que app.js consulta por id', () => {
    const html = readFileSync(join(root, 'src', 'index.html'), 'utf8');
    const app = readFileSync(join(jsDir, 'app.js'), 'utf8');
    const ids = new Set();
    for (const m of app.matchAll(/\$\('#([\w-]+)'\)/g)) ids.add(m[1]);
    const faltan = [...ids].filter((id) => !html.includes(`id="${id}"`));
    assert.deepEqual(faltan, [], `Faltan elementos en index.html: ${faltan.join(', ')}`);
  });

  test('el proceso principal y el preload son CommonJS (.cjs)', () => {
    assert.ok(existsSync(join(root, 'main.cjs')));
    assert.ok(existsSync(join(root, 'preload.cjs')));
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    assert.equal(pkg.main, 'main.cjs');
    assert.equal(pkg.type, 'module');
  });

  test('cada canal IPC usado en preload existe en main', () => {
    const pre = readFileSync(join(root, 'preload.cjs'), 'utf8');
    const main = readFileSync(join(root, 'main.cjs'), 'utf8');
    const canales = [...pre.matchAll(/invoke\('([\w:]+)'/g)].map((m) => m[1]);
    assert.ok(canales.length >= 6, 'se esperaban varios canales IPC');
    for (const c of canales) {
      assert.ok(main.includes(`ipcMain.handle('${c}'`), `main.cjs no maneja el canal "${c}"`);
    }
  });
});
