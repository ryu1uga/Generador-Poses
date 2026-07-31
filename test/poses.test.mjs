import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  POSES, POSES_BY_ID, PROP_IDS, PROP_LABELS, CATEGORIES,
  searchPoses, clonePose, mirrorBones, naturalize,
} from '../src/js/poses.js';
import { BONE_BY_NAME, BONE_NAMES } from '../src/js/skeleton-def.js';

const propsSource = readFileSync(
  fileURLToPath(new URL('../src/js/props.js', import.meta.url)), 'utf8',
);

describe('Biblioteca de poses', () => {
  test('hay una cantidad útil de poses', () => {
    assert.ok(POSES.length >= 20, `solo hay ${POSES.length} poses`);
  });

  test('los ids son únicos', () => {
    const ids = POSES.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('cada pose tiene nombre, categoría conocida y etiquetas', () => {
    const cats = new Set(CATEGORIES.map((c) => c.id));
    for (const p of POSES) {
      assert.ok(p.name, `${p.id} sin nombre`);
      assert.ok(cats.has(p.cat), `${p.id}: categoría desconocida "${p.cat}"`);
      assert.ok(Array.isArray(p.tags) && p.tags.length, `${p.id} sin etiquetas`);
    }
  });

  test('todas las rotaciones apuntan a huesos existentes', () => {
    for (const p of POSES) {
      for (const name of Object.keys(p.bones || {})) {
        assert.ok(BONE_NAMES.includes(name), `${p.id}: hueso desconocido "${name}"`);
      }
    }
  });

  test('cada rotación es una terna de números finitos', () => {
    for (const p of POSES) {
      for (const [name, r] of Object.entries(p.bones || {})) {
        assert.equal(r.length, 3, `${p.id}.${name}: se esperaban 3 ejes`);
        for (const v of r) assert.ok(Number.isFinite(v), `${p.id}.${name}: valor no numérico`);
      }
    }
  });

  test('ninguna pose viola los límites articulares', () => {
    const fallos = [];
    for (const p of POSES) {
      for (const [name, r] of Object.entries(p.bones || {})) {
        const lim = BONE_BY_NAME[name].limits;
        ['x', 'y', 'z'].forEach((ax, i) => {
          const [lo, hi] = lim[ax];
          if (r[i] < lo || r[i] > hi) {
            fallos.push(`${p.id}.${name}.${ax} = ${r[i]} (permitido ${lo}..${hi})`);
          }
        });
      }
    }
    assert.deepEqual(fallos, [], `Rotaciones fuera de rango:\n${fallos.join('\n')}`);
  });

  test('la raíz está bien formada y a una altura plausible', () => {
    for (const p of POSES) {
      assert.equal(p.root.pos.length, 3, `${p.id}: root.pos inválido`);
      assert.equal(p.root.rot.length, 3, `${p.id}: root.rot inválido`);
      const y = p.root.pos[1];
      assert.ok(y > 0 && y < 1.6, `${p.id}: cadera a ${y} m, poco creíble`);
    }
  });

  test('los props referenciados existen y tienen constructor', () => {
    for (const p of POSES) {
      for (const prop of p.props || []) {
        assert.ok(PROP_IDS.includes(prop.id), `${p.id}: prop desconocido "${prop.id}"`);
        assert.ok(new RegExp(`^\\s{2}${prop.id}\\(`, 'm').test(propsSource),
          `props.js no implementa el constructor "${prop.id}"`);
        assert.equal(prop.pos.length, 3, `${p.id}/${prop.id}: pos inválida`);
      }
    }
  });

  test('todo prop declarado tiene etiqueta y constructor', () => {
    for (const id of PROP_IDS) {
      assert.ok(PROP_LABELS[id], `falta etiqueta para "${id}"`);
      assert.ok(new RegExp(`^\\s{2}${id}\\(`, 'm').test(propsSource),
        `props.js no implementa "${id}"`);
    }
  });

  test('las cámaras sugeridas son usables', () => {
    for (const p of POSES) {
      if (!p.cam) continue;
      assert.ok(p.cam.dist > 0.5 && p.cam.dist < 12, `${p.id}: distancia de cámara rara`);
      assert.ok(p.cam.fov >= 12 && p.cam.fov <= 90, `${p.id}: campo de visión fuera de rango`);
      assert.ok(p.cam.phi >= -85 && p.cam.phi <= 85, `${p.id}: elevación fuera de rango`);
    }
  });

  test('las poses con props para sentarse no se auto-apoyan en el suelo', () => {
    const asientos = new Set(['chair', 'stool', 'table', 'box']);
    for (const p of POSES) {
      const sentado = (p.props || []).some((x) => asientos.has(x.id));
      const encima = p.root.pos[1] > 0.45 && p.cat === 'sentado';
      if (sentado && encima) {
        assert.equal(p.snap, false,
          `${p.id}: está sentado sobre un objeto, snap debería ser false`);
      }
    }
  });

  test('existe la pose neutra de referencia', () => {
    assert.ok(POSES_BY_ID.neutral, 'falta la pose "neutral"');
  });
});

describe('Búsqueda', () => {
  test('encuentra por etiqueta', () => {
    const r = searchPoses(POSES, 'gato');
    assert.ok(r.length >= 2, 'deberían salir al menos dos poses con gato');
    assert.ok(r.every((p) => JSON.stringify(p).toLowerCase().includes('gato')));
  });

  test('filtra por categoría', () => {
    const r = searchPoses(POSES, '', 'accion');
    assert.ok(r.length > 0);
    assert.ok(r.every((p) => p.cat === 'accion'));
  });

  test('sin texto ni filtro devuelve todo', () => {
    assert.equal(searchPoses(POSES, '', 'todas').length, POSES.length);
  });

  test('no distingue mayúsculas', () => {
    assert.deepEqual(
      searchPoses(POSES, 'MESA').map((p) => p.id),
      searchPoses(POSES, 'mesa').map((p) => p.id),
    );
  });
});

describe('Transformaciones de pose', () => {
  test('clonePose no comparte referencias', () => {
    const a = POSES[1];
    const b = clonePose(a);
    b.bones.head = [99, 99, 99];
    assert.notDeepEqual(a.bones.head, b.bones.head);
  });

  test('reflejar dos veces devuelve la pose original', () => {
    for (const p of POSES) {
      const once = mirrorBones(p.bones, BONE_BY_NAME);
      const twice = mirrorBones(once, BONE_BY_NAME);
      for (const [name, r] of Object.entries(p.bones)) {
        assert.deepEqual(twice[name], r, `${p.id}.${name} no volvió a su valor original`);
      }
    }
  });

  test('reflejar intercambia izquierda y derecha', () => {
    const out = mirrorBones({ upperArm_L: [10, 20, 30] }, BONE_BY_NAME);
    assert.deepEqual(out.upperArm_R, [10, -20, -30]);
    assert.equal(out.upperArm_L, undefined);
  });

  test('reflejar deja los huesos centrales en su sitio', () => {
    const out = mirrorBones({ chest: [10, 20, 30] }, BONE_BY_NAME);
    assert.deepEqual(out.chest, [10, -20, -30]);
  });

  test('naturalizar con intensidad 0 no cambia nada', () => {
    const src = { chest: [10, 0, 0], head: [5, 5, 5] };
    assert.deepEqual(naturalize(src, 0, () => 0.9), src);
  });

  test('naturalizar rompe la simetría pero se mantiene acotado', () => {
    const src = { upperArm_L: [0, 0, 9], upperArm_R: [0, 0, -9] };
    const out = naturalize(src, 1, () => 1); // desviación máxima
    for (const [name, r] of Object.entries(out)) {
      r.forEach((v, i) => {
        assert.ok(Math.abs(v - src[name][i]) <= 7.001,
          `${name}[${i}] se desvió ${Math.abs(v - src[name][i])}°, demasiado`);
      });
    }
  });

  test('naturalizar es determinista con un generador fijo', () => {
    const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const src = { chest: [10, 0, 0] };
    assert.deepEqual(naturalize(src, 0.5, rng(1)), naturalize(src, 0.5, rng(1)));
  });
});
