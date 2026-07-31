import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  BONES, BONE_BY_NAME, BONE_NAMES, IK_CHAINS, GROUPS, BODY_TYPES,
  PROPORTION_RANGES, validateSkeleton, DEFAULT_ROOT_Y,
} from '../src/js/skeleton-def.js';

describe('Esqueleto', () => {
  test('la jerarquía es válida', () => {
    assert.equal(validateSkeleton(), true);
  });

  test('hay exactamente una raíz', () => {
    const roots = BONES.filter((b) => b.parent === null);
    assert.equal(roots.length, 1);
    assert.equal(roots[0].name, 'hips');
  });

  test('todos los huesos tienen etiqueta, grupo, geometría y límites', () => {
    for (const b of BONES) {
      assert.ok(b.label, `${b.name} sin etiqueta`);
      assert.ok(GROUPS.some((g) => g.id === b.group), `${b.name} con grupo desconocido: ${b.group}`);
      assert.ok(b.geo?.shape, `${b.name} sin geometría`);
      assert.ok(b.limits?.x && b.limits?.y && b.limits?.z, `${b.name} sin límites`);
      assert.equal(b.offset.length, 3, `${b.name} con offset inválido`);
    }
  });

  test('los límites son rangos coherentes que contienen el 0', () => {
    for (const b of BONES) {
      for (const ax of ['x', 'y', 'z']) {
        const [lo, hi] = b.limits[ax];
        assert.ok(lo < hi, `${b.name}.${ax}: rango invertido`);
        assert.ok(lo <= 0 && hi >= 0, `${b.name}.${ax}: el reposo (0) queda fuera del rango`);
      }
    }
  });

  test('los espejos son recíprocos', () => {
    for (const b of BONES) {
      if (!b.mirror) continue;
      const twin = BONE_BY_NAME[b.mirror];
      assert.ok(twin, `${b.name} apunta a un espejo inexistente: ${b.mirror}`);
      assert.equal(twin.mirror, b.name, `${b.name} y ${twin.name} no se apuntan mutuamente`);
    }
  });

  test('los huesos espejo son simétricos en X y en sus límites', () => {
    for (const b of BONES) {
      if (!b.mirror) continue;
      const twin = BONE_BY_NAME[b.mirror];
      assert.ok(Math.abs(b.offset[0] + twin.offset[0]) < 1e-9,
        `${b.name}/${twin.name}: offsets X no simétricos`);
      assert.ok(Math.abs(b.offset[1] - twin.offset[1]) < 1e-9,
        `${b.name}/${twin.name}: alturas distintas`);
      assert.deepEqual(b.limits.x, twin.limits.x, `${b.name}/${twin.name}: límites X distintos`);
      assert.deepEqual(b.limits.z, [-twin.limits.z[1], -twin.limits.z[0]],
        `${b.name}/${twin.name}: límites Z no reflejados`);
    }
  });

  test('las cadenas de IK apuntan a huesos reales y encadenados', () => {
    for (const [effector, chain] of Object.entries(IK_CHAINS)) {
      assert.ok(BONE_BY_NAME[chain.root], `cadena ${effector}: raíz inexistente`);
      assert.ok(BONE_BY_NAME[chain.mid], `cadena ${effector}: medio inexistente`);
      assert.ok(BONE_BY_NAME[chain.end], `cadena ${effector}: efector inexistente`);
      assert.equal(BONE_BY_NAME[chain.mid].parent, chain.root, `cadena ${effector} mal encadenada`);
      assert.equal(BONE_BY_NAME[chain.end].parent, chain.mid, `cadena ${effector} mal encadenada`);
      assert.equal(chain.end, effector);
      assert.ok([1, -1].includes(chain.bendSign));
    }
  });

  test('las proporciones de cada tipo de cuerpo caen dentro de los rangos de la UI', () => {
    for (const [key, body] of Object.entries(BODY_TYPES)) {
      for (const [prop, [lo, hi]] of Object.entries(PROPORTION_RANGES)) {
        const v = body[prop];
        assert.equal(typeof v, 'number', `${key}.${prop} no es número`);
        assert.ok(v >= lo && v <= hi, `${key}.${prop} = ${v} fuera de [${lo}, ${hi}]`);
      }
    }
  });

  test('la altura de la cadera es razonable', () => {
    assert.ok(DEFAULT_ROOT_Y > 0.7 && DEFAULT_ROOT_Y < 1.1);
  });

  test('los nombres no se repiten', () => {
    assert.equal(new Set(BONE_NAMES).size, BONE_NAMES.length);
  });
});
