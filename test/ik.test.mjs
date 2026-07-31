import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  solveTwoBone, localChainDirection, reachError, lerpPose, clamp, vlen, vnorm,
} from '../src/js/ik.js';

describe('IK de dos huesos', () => {
  test('extendido: la flexión tiende a 0 cuando el objetivo está al límite', () => {
    // Alcance máximo = 0.56 m; cerca del límite la extremidad queda casi recta.
    const { bendAngle } = solveTwoBone(0.3, 0.26, 0.5595);
    assert.ok(bendAngle < 0.12, `flexión inesperada: ${bendAngle} rad`);
  });

  test('plegado: la flexión crece cuando el objetivo se acerca', () => {
    const lejos = solveTwoBone(0.3, 0.26, 0.5).bendAngle;
    const medio = solveTwoBone(0.3, 0.26, 0.4).bendAngle;
    const cerca = solveTwoBone(0.3, 0.26, 0.15).bendAngle;
    assert.ok(lejos < medio, 'la flexión debe crecer al acercarse');
    assert.ok(medio < cerca, 'la flexión debe crecer al acercarse');
  });

  test('marca como inalcanzable lo que está fuera de rango', () => {
    assert.equal(solveTwoBone(0.3, 0.26, 0.9).reachable, false);
    assert.equal(solveTwoBone(0.3, 0.26, 0.45).reachable, true);
  });

  test('nunca devuelve NaN, incluso en los extremos', () => {
    for (const d of [0, 0.001, 0.04, 0.56, 5, 1e6]) {
      const r = solveTwoBone(0.3, 0.26, d);
      assert.ok(Number.isFinite(r.rootAngle), `rootAngle NaN con d=${d}`);
      assert.ok(Number.isFinite(r.bendAngle), `bendAngle NaN con d=${d}`);
    }
  });

  test('rechaza longitudes inválidas', () => {
    assert.throws(() => solveTwoBone(0, 0.3, 0.2));
    assert.throws(() => solveTwoBone(0.3, -1, 0.2));
  });

  test('la solución reproduce la distancia pedida (< 1 mm de error)', () => {
    const l1 = 0.43, l2 = 0.41;
    for (let d = 0.06; d < l1 + l2; d += 0.02) {
      for (const sign of [-1, 1]) {
        assert.ok(reachError(l1, l2, d, sign) < 0.001,
          `error de ${reachError(l1, l2, d, sign)} m con d=${d.toFixed(2)}`);
      }
    }
  });
});

describe('Dirección local de la cadena', () => {
  test('es un vector unitario', () => {
    for (const b of [0, 0.5, 1.2, 2.4, Math.PI - 0.01]) {
      const v = localChainDirection(0.29, 0.255, b, -1);
      assert.ok(Math.abs(vlen(v) - 1) < 1e-9, `no unitario: ${vlen(v)}`);
    }
  });

  test('sin flexión apunta recto hacia -Y', () => {
    const v = localChainDirection(0.29, 0.255, 0, -1);
    assert.ok(Math.abs(v.y + 1) < 1e-9);
    assert.ok(Math.abs(v.z) < 1e-9);
  });

  test('el signo decide hacia dónde se dobla (codo adelante, rodilla atrás)', () => {
    const codo = localChainDirection(0.29, 0.255, 1.0, -1);
    const rodilla = localChainDirection(0.43, 0.41, 1.0, 1);
    assert.ok(codo.z > 0, 'el codo debe llevar la mano hacia +Z');
    assert.ok(rodilla.z < 0, 'la rodilla debe llevar el pie hacia -Z');
  });
});

describe('Utilidades', () => {
  test('clamp', () => {
    assert.equal(clamp(5, 0, 3), 3);
    assert.equal(clamp(-5, 0, 3), 0);
    assert.equal(clamp(1.5, 0, 3), 1.5);
  });

  test('vnorm de un vector cero no explota', () => {
    const v = vnorm({ x: 0, y: 0, z: 0 });
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z));
  });

  test('lerpPose interpola y respeta los extremos', () => {
    const a = { chest: [0, 0, 0] };
    const b = { chest: [90, -30, 10] };
    assert.deepEqual(lerpPose(a, b, 0).chest, [0, 0, 0]);
    assert.deepEqual(lerpPose(a, b, 1).chest, [90, -30, 10]);
    assert.deepEqual(lerpPose(a, b, 0.5).chest, [45, -15, 5]);
  });

  test('lerpPose completa los huesos que faltan en un lado', () => {
    const out = lerpPose({}, { head: [10, 0, 0] }, 1);
    assert.deepEqual(out.head, [10, 0, 0]);
  });
});
