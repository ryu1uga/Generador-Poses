/**
 * Definición del esqueleto humanoide. Módulo PURO: sin dependencias de three.js
 * para poder testearlo desde Node.
 *
 * CONVENCIÓN DE EJES (importante para autorar poses)
 * --------------------------------------------------
 *  +Y = arriba, +Z = hacia donde MIRA el personaje, +X = lado IZQUIERDO del personaje.
 *
 *  Cada hueso tiene su eje local. Los huesos de extremidades apuntan hacia -Y
 *  (cuelgan). Los huesos de la columna apuntan hacia +Y (suben). Por eso:
 *
 *    EXTREMIDADES (brazos/piernas/manos/pies)
 *      rot.x positivo  -> la punta va hacia ATRÁS (-Z)
 *      rot.x negativo  -> la punta va hacia ADELANTE (+Z)   [levantar brazo/pierna al frente]
 *      rot.z positivo  -> la punta va hacia +X (izquierda del personaje)
 *      rot.y           -> torsión sobre el propio hueso
 *
 *    COLUMNA (spine, chest, neck, head)  -- señales INVERTIDAS
 *      rot.x positivo  -> inclinarse hacia ADELANTE (+Z)
 *      rot.z positivo  -> inclinarse hacia -X (derecha del personaje)
 *
 * Referencias rápidas de ángulos:
 *   Brazo horizontal al frente ............ upperArm.x = -90
 *   Brazo horizontal al costado ........... upperArm.z = +90 (izq) / -90 (der)
 *   Brazo en alto ......................... upperArm.z = +165 (izq) / -165 (der)
 *   Codo flexionado 90° ................... foreArm.x  = -90
 *   Cadera flexionada 90° (muslo al frente) thigh.x    = -90
 *   Rodilla flexionada 90° ................ shin.x     = +90
 *   Punta de pie estirada ................. foot.x     = +35
 */

/**
 * Altura por defecto de la articulación de la cadera sobre el suelo.
 * El grupo raíz del maniquí se coloca aquí; `pose.root.pos` es ABSOLUTO.
 */
export const DEFAULT_ROOT_Y = 0.95;

/** Longitud del cuerpo base, en metros. Total ≈ 1.74 m (≈7.5 cabezas). */
export const BONES = [
  // ---------------------------------------------------------------- tronco
  {
    name: 'hips', label: 'Cadera', parent: null, group: 'torso',
    offset: [0, 0, 0],
    geo: { shape: 'cyl', dir: 'up', r0: 0.125, r1: 0.112, len: 0.13, flatZ: 0.74 },
    limits: { x: [-45, 45], y: [-60, 60], z: [-40, 40] },
    mirror: null,
  },
  {
    name: 'spine', label: 'Abdomen', parent: 'hips', group: 'torso',
    offset: [0, 0.13, 0],
    geo: { shape: 'cyl', dir: 'up', r0: 0.108, r1: 0.118, len: 0.15, flatZ: 0.74 },
    limits: { x: [-35, 55], y: [-40, 40], z: [-35, 35] },
    mirror: null,
  },
  {
    name: 'chest', label: 'Pecho', parent: 'spine', group: 'torso',
    offset: [0, 0.15, 0],
    geo: { shape: 'cyl', dir: 'up', r0: 0.118, r1: 0.148, len: 0.21, flatZ: 0.7 },
    limits: { x: [-30, 45], y: [-45, 45], z: [-30, 30] },
    mirror: null,
  },
  {
    name: 'neck', label: 'Cuello', parent: 'chest', group: 'torso',
    offset: [0, 0.215, 0],
    geo: { shape: 'cyl', dir: 'up', r0: 0.048, r1: 0.045, len: 0.085 },
    limits: { x: [-40, 40], y: [-45, 45], z: [-30, 30] },
    mirror: null,
  },
  {
    name: 'head', label: 'Cabeza', parent: 'neck', group: 'torso',
    offset: [0, 0.085, 0],
    geo: { shape: 'egg', dir: 'up', r0: 0.115, len: 0.235 },
    limits: { x: [-45, 50], y: [-70, 70], z: [-40, 40] },
    mirror: null,
  },

  // ---------------------------------------------------------- brazo izq (+X)
  {
    name: 'shoulder_L', label: 'Hombro izq.', parent: 'chest', group: 'armL',
    offset: [0.052, 0.185, 0], side: 'L',
    geo: { shape: 'sphere', r0: 0.058 },
    limits: { x: [-30, 30], y: [-25, 25], z: [-20, 35] },
    mirror: 'shoulder_R',
  },
  {
    name: 'upperArm_L', label: 'Brazo izq.', parent: 'shoulder_L', group: 'armL',
    offset: [0.148, 0.005, 0], side: 'L',
    geo: { shape: 'cyl', dir: 'down', r0: 0.054, r1: 0.043, len: 0.29 },
    limits: { x: [-180, 60], y: [-90, 90], z: [-45, 180] },
    mirror: 'upperArm_R',
  },
  {
    name: 'foreArm_L', label: 'Antebrazo izq.', parent: 'upperArm_L', group: 'armL',
    offset: [0, -0.29, 0], side: 'L',
    geo: { shape: 'cyl', dir: 'down', r0: 0.043, r1: 0.032, len: 0.255 },
    limits: { x: [-150, 5], y: [-90, 90], z: [-10, 10] },
    mirror: 'foreArm_R',
  },
  {
    name: 'hand_L', label: 'Mano izq.', parent: 'foreArm_L', group: 'armL',
    offset: [0, -0.255, 0], side: 'L', handle: 'ik',
    geo: { shape: 'box', dir: 'down', w: 0.085, len: 0.175, d: 0.036 },
    limits: { x: [-80, 80], y: [-30, 30], z: [-30, 30] },
    mirror: 'hand_R',
  },

  // ---------------------------------------------------------- brazo der (-X)
  {
    name: 'shoulder_R', label: 'Hombro der.', parent: 'chest', group: 'armR',
    offset: [-0.052, 0.185, 0], side: 'R',
    geo: { shape: 'sphere', r0: 0.058 },
    limits: { x: [-30, 30], y: [-25, 25], z: [-35, 20] },
    mirror: 'shoulder_L',
  },
  {
    name: 'upperArm_R', label: 'Brazo der.', parent: 'shoulder_R', group: 'armR',
    offset: [-0.148, 0.005, 0], side: 'R',
    geo: { shape: 'cyl', dir: 'down', r0: 0.054, r1: 0.043, len: 0.29 },
    limits: { x: [-180, 60], y: [-90, 90], z: [-180, 45] },
    mirror: 'upperArm_L',
  },
  {
    name: 'foreArm_R', label: 'Antebrazo der.', parent: 'upperArm_R', group: 'armR',
    offset: [0, -0.29, 0], side: 'R',
    geo: { shape: 'cyl', dir: 'down', r0: 0.043, r1: 0.032, len: 0.255 },
    limits: { x: [-150, 5], y: [-90, 90], z: [-10, 10] },
    mirror: 'foreArm_L',
  },
  {
    name: 'hand_R', label: 'Mano der.', parent: 'foreArm_R', group: 'armR',
    offset: [0, -0.255, 0], side: 'R', handle: 'ik',
    geo: { shape: 'box', dir: 'down', w: 0.085, len: 0.175, d: 0.036 },
    limits: { x: [-80, 80], y: [-30, 30], z: [-30, 30] },
    mirror: 'hand_L',
  },

  // --------------------------------------------------------- pierna izq (+X)
  {
    name: 'thigh_L', label: 'Muslo izq.', parent: 'hips', group: 'legL',
    offset: [0.098, -0.015, 0], side: 'L',
    geo: { shape: 'cyl', dir: 'down', r0: 0.088, r1: 0.062, len: 0.43 },
    limits: { x: [-135, 40], y: [-50, 50], z: [-30, 75] },
    mirror: 'thigh_R',
  },
  {
    name: 'shin_L', label: 'Pantorrilla izq.', parent: 'thigh_L', group: 'legL',
    offset: [0, -0.43, 0], side: 'L',
    geo: { shape: 'cyl', dir: 'down', r0: 0.062, r1: 0.042, len: 0.41 },
    limits: { x: [-5, 150], y: [-25, 25], z: [-8, 8] },
    mirror: 'shin_R',
  },
  {
    name: 'foot_L', label: 'Pie izq.', parent: 'shin_L', group: 'legL',
    offset: [0, -0.41, 0], side: 'L', handle: 'ik',
    geo: { shape: 'box', dir: 'fwd', w: 0.088, len: 0.235, d: 0.062, drop: 0.032 },
    limits: { x: [-35, 55], y: [-25, 25], z: [-20, 20] },
    mirror: 'foot_R',
  },

  // --------------------------------------------------------- pierna der (-X)
  {
    name: 'thigh_R', label: 'Muslo der.', parent: 'hips', group: 'legR',
    offset: [-0.098, -0.015, 0], side: 'R',
    geo: { shape: 'cyl', dir: 'down', r0: 0.088, r1: 0.062, len: 0.43 },
    limits: { x: [-135, 40], y: [-50, 50], z: [-75, 30] },
    mirror: 'thigh_L',
  },
  {
    name: 'shin_R', label: 'Pantorrilla der.', parent: 'thigh_R', group: 'legR',
    offset: [0, -0.43, 0], side: 'R',
    geo: { shape: 'cyl', dir: 'down', r0: 0.062, r1: 0.042, len: 0.41 },
    limits: { x: [-5, 150], y: [-25, 25], z: [-8, 8] },
    mirror: 'shin_L',
  },
  {
    name: 'foot_R', label: 'Pie der.', parent: 'shin_R', group: 'legR',
    offset: [0, -0.41, 0], side: 'R', handle: 'ik',
    geo: { shape: 'box', dir: 'fwd', w: 0.088, len: 0.235, d: 0.062, drop: 0.032 },
    limits: { x: [-35, 55], y: [-25, 25], z: [-20, 20] },
    mirror: 'foot_L',
  },
];

export const BONE_NAMES = BONES.map((b) => b.name);
export const BONE_BY_NAME = Object.fromEntries(BONES.map((b) => [b.name, b]));

/** Huesos cuyo eje local apunta hacia arriba (columna). */
export const SPINE_BONES = ['hips', 'spine', 'chest', 'neck', 'head'];

export const GROUPS = [
  { id: 'torso', label: 'Torso y cabeza' },
  { id: 'armL', label: 'Brazo izquierdo' },
  { id: 'armR', label: 'Brazo derecho' },
  { id: 'legL', label: 'Pierna izquierda' },
  { id: 'legR', label: 'Pierna derecha' },
];

/** Cadenas de IK: raíz -> medio -> efector. */
export const IK_CHAINS = {
  hand_L: { root: 'upperArm_L', mid: 'foreArm_L', end: 'hand_L', bendSign: -1, label: 'Brazo izq.' },
  hand_R: { root: 'upperArm_R', mid: 'foreArm_R', end: 'hand_R', bendSign: -1, label: 'Brazo der.' },
  foot_L: { root: 'thigh_L', mid: 'shin_L', end: 'foot_L', bendSign: 1, label: 'Pierna izq.' },
  foot_R: { root: 'thigh_R', mid: 'shin_R', end: 'foot_R', bendSign: 1, label: 'Pierna der.' },
};

/** Presets de proporciones corporales. */
export const BODY_TYPES = {
  shonen: { label: 'Shōnen (masc.)', height: 1.0, head: 1.0, shoulders: 1.0, hips: 1.0, limbs: 1.0, torso: 1.0 },
  shojo: { label: 'Shōjo (fem.)', height: 0.94, head: 0.95, shoulders: 0.87, hips: 1.09, limbs: 0.86, torso: 0.97 },
  seinen: { label: 'Seinen (robusto)', height: 1.04, head: 0.97, shoulders: 1.14, hips: 1.04, limbs: 1.22, torso: 1.05 },
  bishonen: { label: 'Bishōnen (esbelto)', height: 1.02, head: 0.92, shoulders: 0.95, hips: 0.94, limbs: 0.82, torso: 0.98 },
  chibi: { label: 'Chibi', height: 0.52, head: 2.15, shoulders: 1.0, hips: 1.05, limbs: 1.35, torso: 1.0 },
  nino: { label: 'Niño', height: 0.72, head: 1.35, shoulders: 0.88, hips: 0.95, limbs: 0.95, torso: 1.0 },
};

/** Rangos permitidos para los sliders de proporción manuales. */
export const PROPORTION_RANGES = {
  height: [0.5, 1.2],
  head: [0.7, 2.4],
  shoulders: [0.75, 1.35],
  hips: [0.8, 1.3],
  limbs: [0.7, 1.4],
  torso: [0.85, 1.2],
};

/** Comprueba que la jerarquía sea válida (sin ciclos, padres existentes). */
export function validateSkeleton(bones = BONES) {
  const names = new Set();
  for (const b of bones) {
    if (names.has(b.name)) throw new Error(`Hueso duplicado: ${b.name}`);
    names.add(b.name);
  }
  for (const b of bones) {
    if (b.parent !== null && !names.has(b.parent)) {
      throw new Error(`El hueso ${b.name} apunta a un padre inexistente: ${b.parent}`);
    }
  }
  // Detección de ciclos y padre-antes-que-hijo
  const seen = new Set();
  for (const b of bones) {
    if (b.parent !== null && !seen.has(b.parent)) {
      throw new Error(`El hueso ${b.name} aparece antes que su padre ${b.parent}`);
    }
    seen.add(b.name);
  }
  return true;
}
