/**
 * Cinemática inversa de dos huesos (ley de cosenos). Módulo PURO: sin three.js,
 * trabaja con números y objetos {x,y,z} planos para poder testearse en Node.
 */

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const deg = (rad) => (rad * 180) / Math.PI;
export const rad = (d) => (d * Math.PI) / 180;

/**
 * Resuelve una cadena de 2 huesos.
 *
 * @param {number} l1 longitud del hueso superior (brazo / muslo)
 * @param {number} l2 longitud del hueso inferior (antebrazo / pantorrilla)
 * @param {number} dist distancia entre la raíz y el objetivo
 * @returns {{rootAngle:number, bendAngle:number, reachable:boolean, dist:number}}
 *   rootAngle = ángulo (rad) entre el hueso superior y la línea raíz→objetivo.
 *   bendAngle = flexión de la articulación media (rad, 0 = extendida).
 */
export function solveTwoBone(l1, l2, dist) {
  if (!(l1 > 0) || !(l2 > 0)) throw new Error('Las longitudes de hueso deben ser > 0');

  const maxReach = (l1 + l2) * 0.9995; // margen para evitar el bloqueo total
  const minReach = Math.abs(l1 - l2) * 1.0005 + 1e-5;
  const reachable = dist <= maxReach && dist >= minReach;
  const d = clamp(dist, minReach, maxReach);

  const cosRoot = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const cosBend = (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2);

  return {
    rootAngle: Math.acos(clamp(cosRoot, -1, 1)),
    bendAngle: Math.PI - Math.acos(clamp(cosBend, -1, 1)),
    reachable,
    dist: d,
  };
}

/**
 * Dirección local (en el espacio del hueso raíz) del vector raíz→efector
 * cuando la articulación media está flexionada `bendAngle` radianes.
 * Los huesos apuntan hacia -Y y la flexión gira sobre el eje X local.
 *
 * @param {number} l1
 * @param {number} l2
 * @param {number} bendAngle radianes
 * @param {number} sign  -1 codo (flexiona hacia +Z), +1 rodilla (hacia -Z)
 * @returns {{x:number,y:number,z:number}} vector unitario
 */
export function localChainDirection(l1, l2, bendAngle, sign = -1) {
  const b = bendAngle * sign;
  // R_x(b) aplicada a (0,-l2,0) => (0, -l2·cos b, -l2·sin b)
  const y = -l1 - l2 * Math.cos(b);
  const z = -l2 * Math.sin(b);
  const len = Math.hypot(y, z) || 1;
  return { x: 0, y: y / len, z: z / len };
}

/** Longitud de un vector plano. */
export const vlen = (v) => Math.hypot(v.x, v.y, v.z);

/** Normaliza un vector plano (devuelve uno nuevo). */
export function vnorm(v) {
  const l = vlen(v) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

export const vsub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const vadd = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const vmul = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const vdot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

export const vcross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

/**
 * Verificación geométrica: con los ángulos resueltos, ¿el efector cae donde
 * pedimos? Devuelve el error en metros. Se usa en los tests.
 */
export function reachError(l1, l2, dist, sign = -1) {
  const { bendAngle } = solveTwoBone(l1, l2, dist);
  const b = bendAngle * sign;
  const y = -l1 - l2 * Math.cos(b);
  const z = -l2 * Math.sin(b);
  const achieved = Math.hypot(y, z);
  const target = clamp(dist, Math.abs(l1 - l2) * 1.0005 + 1e-5, (l1 + l2) * 0.9995);
  return Math.abs(achieved - target);
}

/**
 * Interpolación suave entre dos conjuntos de rotaciones (para transiciones
 * entre poses). Devuelve un objeto nuevo con los mismos huesos.
 */
export function lerpPose(from, to, t) {
  const k = clamp(t, 0, 1);
  const out = {};
  const keys = new Set([...Object.keys(from || {}), ...Object.keys(to || {})]);
  for (const key of keys) {
    const a = from?.[key] ?? [0, 0, 0];
    const b = to?.[key] ?? [0, 0, 0];
    out[key] = [
      a[0] + (b[0] - a[0]) * k,
      a[1] + (b[1] - a[1]) * k,
      a[2] + (b[2] - a[2]) * k,
    ];
  }
  return out;
}
