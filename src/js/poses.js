/**
 * Biblioteca de poses. Módulo PURO (sin three.js) para poder testearlo.
 *
 * Formato de una pose:
 *   id      identificador único
 *   name    nombre visible
 *   cat     categoría para el filtro de la biblioteca
 *   tags    palabras clave para el buscador
 *   root    { pos:[x,y,z] absoluto en metros, rot:[x,y,z] en grados }
 *   snap    true = apoyar automáticamente el punto más bajo en el suelo
 *   bones   { nombreHueso: [rotX, rotY, rotZ] en GRADOS }
 *   props   [ { id, pos:[x,y,z], rot:[x,y,z], scale } ]
 *   cam     { theta, phi, dist, targetY, fov }  cámara sugerida
 *
 * Los huesos que no aparezcan en `bones` quedan en 0.
 * Ver src/js/skeleton-def.js para la convención de signos de rotación.
 */

/** Objetos de escena disponibles. */
export const PROP_IDS = [
  'table', 'chair', 'stool', 'box', 'steps', 'wall', 'railing', 'cat', 'floorMat',
];

export const PROP_LABELS = {
  table: 'Mesa (75 cm)',
  chair: 'Silla (asiento 45 cm)',
  stool: 'Banco / taburete',
  box: 'Caja (50 cm)',
  steps: 'Escalones',
  wall: 'Pared',
  railing: 'Barandal / barra (105 cm)',
  cat: 'Gato',
  floorMat: 'Tapete / futón',
};

export const CATEGORIES = [
  { id: 'todas', label: 'Todas' },
  { id: 'base', label: 'Base' },
  { id: 'cotidiano', label: 'Cotidiano' },
  { id: 'accion', label: 'Acción' },
  { id: 'sentado', label: 'Sentado' },
  { id: 'suelo', label: 'En el suelo' },
  { id: 'objeto', label: 'Con objeto' },
];

const DEFAULT_CAM = { theta: 18, phi: 6, dist: 3.3, targetY: 0.95, fov: 40 };

export const POSES = [
  /* ------------------------------------------------------------------ base */
  {
    id: 'neutral',
    name: 'Neutra (A-pose)',
    cat: 'base',
    tags: ['base', 'referencia', 'inicio'],
    root: { pos: [0, 0.95, 0], rot: [0, 0, 0] },
    snap: true,
    bones: {
      upperArm_L: [0, 0, 9], upperArm_R: [0, 0, -9],
    },
    props: [],
    cam: { ...DEFAULT_CAM, theta: 0 },
  },
  {
    id: 'reposo_natural',
    name: 'Reposo natural (contrapposto)',
    cat: 'base',
    tags: ['de pie', 'relajado', 'peso', 'cadera'],
    root: { pos: [0, 0.95, 0], rot: [0, 4, 0] },
    snap: true,
    bones: {
      hips: [0, 0, -5], spine: [2, 2, 4], chest: [1, 3, 3],
      neck: [-3, -4, 0], head: [4, -9, -2],
      thigh_R: [-1, 2, -2], shin_R: [3, 0, 0], foot_R: [-1, 2, 0],
      thigh_L: [-3, -4, 9], shin_L: [9, 0, 0], foot_L: [11, -6, 0],
      shoulder_L: [0, 0, -4], shoulder_R: [0, 0, 2],
      upperArm_L: [-5, 0, 8], foreArm_L: [-14, 8, 0], hand_L: [-6, 0, 0],
      upperArm_R: [-2, 0, -7], foreArm_R: [-18, -10, 0], hand_R: [-4, 0, 0],
    },
    props: [],
    cam: { ...DEFAULT_CAM, theta: 22 },
  },

  /* ------------------------------------------------------------- cotidiano */
  {
    id: 'pierna_en_mesa',
    name: 'Pierna sobre la mesa (estiramiento)',
    cat: 'objeto',
    tags: ['estirar', 'mesa', 'pierna', 'inclinado'],
    root: { pos: [0, 0.95, -0.16], rot: [0, 0, 0] },
    snap: false,
    bones: {
      hips: [4, -3, 0], spine: [16, -2, 2], chest: [14, -2, 1],
      neck: [-8, 0, 0], head: [8, 0, 0],
      thigh_L: [-99, -7, 4], shin_L: [24, 0, 0], foot_L: [-24, 0, 0],
      thigh_R: [3, 3, -2], shin_R: [3, 0, 0], foot_R: [-2, 0, 0],
      shoulder_L: [4, 0, 0], shoulder_R: [4, 0, 0],
      upperArm_L: [-66, -1, 5], foreArm_L: [-40, 6, 0], hand_L: [-12, 0, 0],
      upperArm_R: [-68, -4, 15], foreArm_R: [-40, -6, 0], hand_R: [-12, 0, 0],
    },
    props: [{ id: 'table', pos: [0, 0, 0.62], rot: [0, 0, 0], scale: 1 }],
    cam: { theta: 42, phi: 4, dist: 3.4, targetY: 0.9, fov: 38 },
  },
  {
    id: 'acariciar_gato',
    name: 'Agachado acariciando un gato',
    cat: 'objeto',
    tags: ['gato', 'agachado', 'cuclillas', 'acariciar', 'ternura'],
    root: { pos: [0, 0.62, 0], rot: [0, 8, 0] },
    snap: true,
    bones: {
      hips: [14, 0, 0], spine: [28, -8, 2], chest: [20, -5, 1],
      neck: [-16, 6, 0], head: [30, 6, -2],
      thigh_L: [-102, 5, 13], shin_L: [118, 0, 0], foot_L: [-12, 0, 0],
      thigh_R: [-94, -7, 9], shin_R: [126, 0, 0], foot_R: [18, 0, 0],
      shoulder_R: [0, 0, -6], shoulder_L: [2, 0, 0],
      upperArm_R: [-57, 1, -4], foreArm_R: [-40, 10, 0], hand_R: [40, 0, 0],
      upperArm_L: [-18, 0, 7], foreArm_L: [-58, -12, 0], hand_L: [-8, 0, 0],
    },
    props: [{ id: 'cat', pos: [-0.30, 0, 0.45], rot: [0, -50, 0], scale: 1 }],
    cam: { theta: 34, phi: -4, dist: 2.6, targetY: 0.62, fov: 40 },
  },
  {
    id: 'caminando',
    name: 'Caminando (paso medio)',
    cat: 'cotidiano',
    tags: ['caminar', 'andar', 'paso', 'movimiento'],
    root: { pos: [0, 0.94, 0], rot: [0, 0, 0] },
    snap: true,
    bones: {
      hips: [0, -7, -2], spine: [4, 5, 1], chest: [2, 7, 1],
      neck: [-3, -3, 0], head: [1, -5, 0],
      thigh_L: [-26, -2, 3], shin_L: [8, 0, 0], foot_L: [-13, 0, 0],
      thigh_R: [17, 3, -3], shin_R: [27, 0, 0], foot_R: [27, 0, 0],
      upperArm_L: [19, 0, 8], foreArm_L: [-26, 10, 0], hand_L: [-8, 0, 0],
      upperArm_R: [-25, 0, -7], foreArm_R: [-33, -12, 0], hand_R: [-8, 0, 0],
    },
    props: [],
    cam: { theta: 55, phi: 3, dist: 3.4, targetY: 0.95, fov: 40 },
  },
  {
    id: 'corriendo',
    name: 'Corriendo (fase de vuelo)',
    cat: 'accion',
    tags: ['correr', 'carrera', 'sprint', 'movimiento', 'aire'],
    root: { pos: [0, 1.02, 0], rot: [0, 0, 0] },
    snap: false,
    bones: {
      hips: [7, -12, -3], spine: [10, 9, 2], chest: [7, 11, 1],
      neck: [-12, -4, 0], head: [-9, -7, 0],
      thigh_L: [-58, -3, 4], shin_L: [32, 0, 0], foot_L: [-14, 0, 0],
      thigh_R: [27, 4, -4], shin_R: [96, 0, 0], foot_R: [24, 0, 0],
      shoulder_L: [0, 0, 6], shoulder_R: [0, 0, -6],
      upperArm_L: [57, 0, 9], foreArm_L: [-74, 14, 0], hand_L: [-14, 0, 0],
      upperArm_R: [-66, 0, -9], foreArm_R: [-90, -14, 0], hand_R: [-14, 0, 0],
    },
    props: [],
    cam: { theta: 62, phi: -6, dist: 3.6, targetY: 1.0, fov: 34 },
  },
  {
    id: 'estirandose',
    name: 'Desperezándose al despertar',
    cat: 'cotidiano',
    tags: ['estirar', 'bostezo', 'mañana', 'arco', 'puntillas'],
    root: { pos: [0, 0.97, 0], rot: [0, 0, 0] },
    snap: true,
    bones: {
      hips: [-6, 0, 0], spine: [-14, 2, 0], chest: [-16, 3, 0],
      neck: [-14, 0, 0], head: [-19, -4, 0],
      thigh_L: [5, 0, 7], shin_L: [4, 0, 0], foot_L: [24, 0, 0],
      thigh_R: [4, 0, -6], shin_R: [3, 0, 0], foot_R: [22, 0, 0],
      shoulder_L: [-6, 0, 14], shoulder_R: [-6, 0, -14],
      upperArm_L: [-10, 0, 156], foreArm_L: [-28, 22, 0], hand_L: [14, 0, 0],
      upperArm_R: [-8, 0, -152], foreArm_R: [-24, -22, 0], hand_R: [14, 0, 0],
    },
    props: [],
    cam: { theta: 25, phi: -8, dist: 3.5, targetY: 1.15, fov: 38 },
  },
  {
    id: 'mirar_atras',
    name: 'Mirando atrás sobre el hombro',
    cat: 'cotidiano',
    tags: ['girar', 'hombro', 'torsión', 'volteando'],
    root: { pos: [0, 0.95, 0], rot: [0, 0, 0] },
    snap: true,
    bones: {
      hips: [0, -11, -3], spine: [1, -18, 2], chest: [0, -27, 2],
      neck: [-4, -33, 0], head: [-7, -44, 5],
      thigh_L: [-13, -3, 5], shin_L: [11, 0, 0], foot_L: [-6, 0, 0],
      thigh_R: [9, 3, -3], shin_R: [17, 0, 0], foot_R: [21, 0, 0],
      upperArm_L: [-15, 0, 9], foreArm_L: [-31, 12, 0], hand_L: [-6, 0, 0],
      upperArm_R: [11, 0, -8], foreArm_R: [-19, -14, 0], hand_R: [-6, 0, 0],
    },
    props: [],
    cam: { theta: 200, phi: 4, dist: 3.2, targetY: 1.1, fov: 40 },
  },
  {
    id: 'senalando',
    name: 'Señalando (dramático)',
    cat: 'accion',
    tags: ['señalar', 'apuntar', 'dramático', 'escorzo'],
    root: { pos: [0, 0.94, 0], rot: [0, 0, 0] },
    snap: true,
    bones: {
      hips: [0, 9, -4], spine: [4, -6, 3], chest: [9, -11, 2],
      neck: [-6, -4, 0], head: [-7, -8, -3],
      thigh_L: [-21, -4, 15], shin_L: [13, 0, 0], foot_L: [6, 0, 0],
      thigh_R: [11, 4, -9], shin_R: [9, 0, 0], foot_R: [11, 0, 0],
      shoulder_R: [-4, 0, -10], shoulder_L: [0, 0, 6],
      upperArm_R: [-95, 0, -13], foreArm_R: [-7, 0, 0], hand_R: [-19, 0, 0],
      upperArm_L: [17, 0, 21], foreArm_L: [-53, 16, 0], hand_L: [-10, 0, 0],
    },
    props: [],
    cam: { theta: 8, phi: -10, dist: 2.4, targetY: 1.1, fov: 26 },
  },
  {
    id: 'punetazo',
    name: 'Puñetazo hacia cámara (escorzo)',
    cat: 'accion',
    tags: ['pelea', 'golpe', 'escorzo', 'perspectiva', 'acción'],
    root: { pos: [0, 0.9, 0], rot: [0, 0, 0] },
    snap: true,
    bones: {
      hips: [0, -17, -3], spine: [10, -12, 3], chest: [12, -17, 2],
      neck: [-10, 10, 0], head: [-9, 13, -3],
      thigh_L: [-35, -5, 13], shin_L: [27, 0, 0], foot_L: [-7, 0, 0],
      thigh_R: [23, 5, -9], shin_R: [31, 0, 0], foot_R: [32, 0, 0],
      shoulder_R: [-8, 0, -12], shoulder_L: [4, 0, 8],
      upperArm_R: [-87, 0, -7], foreArm_R: [-5, 0, 0], hand_R: [0, 0, 0],
      upperArm_L: [-28, 0, 17], foreArm_L: [-117, 10, 0], hand_L: [-6, 0, 0],
    },
    props: [],
    cam: { theta: 4, phi: -4, dist: 2.1, targetY: 1.15, fov: 22 },
  },
  {
    id: 'salto_patada',
    name: 'Patada voladora',
    cat: 'accion',
    tags: ['salto', 'patada', 'aire', 'pelea', 'shonen'],
    root: { pos: [0, 1.18, 0], rot: [0, 0, 0] },
    snap: false,
    bones: {
      hips: [-9, -6, -4], spine: [9, 4, 2], chest: [7, -9, 2],
      neck: [-8, -4, 0], head: [-6, -7, 0],
      thigh_R: [-97, 4, -7], shin_R: [9, 0, 0], foot_R: [31, 0, 0],
      thigh_L: [-38, -6, 12], shin_L: [118, 0, 0], foot_L: [21, 0, 0],
      shoulder_L: [0, 0, 14], shoulder_R: [-6, 0, -8],
      upperArm_L: [-106, 0, 27], foreArm_L: [-48, 18, 0], hand_L: [-10, 0, 0],
      upperArm_R: [43, 0, -31], foreArm_R: [-57, -18, 0], hand_R: [-10, 0, 0],
    },
    props: [],
    cam: { theta: 48, phi: -22, dist: 3.6, targetY: 1.15, fov: 30 },
  },
  {
    id: 'sorpresa',
    name: 'Sobresalto (retrocediendo)',
    cat: 'accion',
    tags: ['susto', 'sorpresa', 'reacción', 'retroceder'],
    root: { pos: [0, 0.92, 0], rot: [0, 0, 0] },
    snap: true,
    bones: {
      hips: [-6, 11, -3], spine: [-12, -7, 2], chest: [-14, -9, 2],
      neck: [-6, 3, 0], head: [-15, 4, 0],
      thigh_L: [-33, -4, 16], shin_L: [31, 0, 0], foot_L: [-17, 0, 0],
      thigh_R: [19, 4, -9], shin_R: [35, 0, 0], foot_R: [27, 0, 0],
      shoulder_L: [-8, 0, 16], shoulder_R: [-8, 0, -16],
      upperArm_L: [-57, 0, 53], foreArm_L: [-92, -22, 0], hand_L: [-42, 0, 0],
      upperArm_R: [-53, 0, -49], foreArm_R: [-88, 22, 0], hand_R: [-42, 0, 0],
    },
    props: [],
    cam: { theta: 20, phi: -6, dist: 3.1, targetY: 1.1, fov: 36 },
  },
  {
    id: 'alcanzar_arriba',
    name: 'Alcanzando algo alto (de puntillas)',
    cat: 'cotidiano',
    tags: ['estirar', 'alcanzar', 'arriba', 'puntillas', 'estante'],
    root: { pos: [0, 0.99, 0], rot: [0, -6, 0] },
    snap: true,
    bones: {
      hips: [-3, 0, 3], spine: [-8, 5, -3], chest: [-10, 7, -4],
      neck: [-14, -3, 0], head: [-22, -3, 0],
      thigh_L: [-5, 0, 7], shin_L: [5, 0, 0], foot_L: [34, 0, 0],
      thigh_R: [-3, 0, -6], shin_R: [3, 0, 0], foot_R: [29, 0, 0],
      shoulder_R: [-10, 0, -20], shoulder_L: [-4, 0, 8],
      upperArm_R: [-16, 0, -166], foreArm_R: [-9, 0, 0], hand_R: [-16, 0, 0],
      upperArm_L: [-10, 0, 46], foreArm_L: [-26, 14, 0], hand_L: [-8, 0, 0],
    },
    props: [],
    cam: { theta: 30, phi: 10, dist: 3.6, targetY: 1.25, fov: 36 },
  },
  {
    id: 'recogiendo_suelo',
    name: 'Recogiendo algo del suelo (rodilla abajo)',
    cat: 'cotidiano',
    tags: ['recoger', 'rodilla', 'agachado', 'suelo'],
    root: { pos: [0, 0.63, 0.02], rot: [0, 10, 0] },
    snap: true,
    bones: {
      hips: [12, -4, 0], spine: [42, -6, 2], chest: [30, -4, 1],
      neck: [-24, 4, 0], head: [34, 5, 0],
      thigh_R: [-10, -4, -7], shin_R: [145, 0, 0], foot_R: [40, 0, 0],
      thigh_L: [-96, 3, 9], shin_L: [92, 0, 0], foot_L: [6, 0, 0],
      shoulder_R: [4, 0, -6],
      upperArm_R: [-73, -1, 5], foreArm_R: [-40, 8, 0], hand_R: [46, 0, 0],
      upperArm_L: [-15, 0, 9], foreArm_L: [-44, -10, 0], hand_L: [-6, 0, 0],
    },
    props: [],
    cam: { theta: 38, phi: -2, dist: 2.8, targetY: 0.7, fov: 40 },
  },
  {
    id: 'crouch_listo',
    name: 'En cuclillas, listo para saltar',
    cat: 'accion',
    tags: ['cuclillas', 'crouch', 'ninja', 'tensión', 'preparado'],
    root: { pos: [0, 0.6, 0], rot: [0, -8, 0] },
    snap: true,
    bones: {
      hips: [18, 5, 0], spine: [38, -10, 2], chest: [26, -7, 1],
      neck: [-30, 6, 0], head: [-16, 7, 0],
      thigh_L: [-108, 4, 15], shin_L: [116, 0, 0], foot_L: [-8, 0, 0],
      thigh_R: [-86, -6, -11], shin_R: [124, 0, 0], foot_R: [27, 0, 0],
      shoulder_R: [6, 0, -8],
      upperArm_R: [-70, -2, 6], foreArm_R: [-40, 6, 0], hand_R: [48, 0, 0],
      upperArm_L: [35, 0, 15], foreArm_L: [-37, -14, 0], hand_L: [-10, 0, 0],
    },
    props: [],
    cam: { theta: 44, phi: -14, dist: 2.7, targetY: 0.65, fov: 34 },
  },

  /* --------------------------------------------------------------- sentado */
  {
    id: 'silla_codos_rodillas',
    name: 'Sentado, codos en las rodillas',
    cat: 'sentado',
    tags: ['silla', 'sentado', 'pensando', 'inclinado'],
    root: { pos: [0, 0.56, -0.04], rot: [0, 0, 0] },
    snap: false,
    bones: {
      hips: [4, 0, 0], spine: [22, -3, 0], chest: [15, -2, 0],
      neck: [-12, 2, 0], head: [7, 3, 0],
      thigh_L: [-89, -2, 11], shin_L: [85, 0, 0], foot_L: [4, 0, 0],
      thigh_R: [-91, 2, -11], shin_R: [87, 0, 0], foot_R: [5, 0, 0],
      upperArm_L: [-38, 0, 15], foreArm_L: [-88, -14, 0], hand_L: [-22, 0, 0],
      upperArm_R: [-40, 0, -15], foreArm_R: [-86, 14, 0], hand_R: [-22, 0, 0],
    },
    props: [{ id: 'chair', pos: [0, 0, -0.14], rot: [0, 0, 0], scale: 1 }],
    cam: { theta: 34, phi: 0, dist: 2.9, targetY: 0.8, fov: 40 },
  },
  {
    id: 'bostezo_silla',
    name: 'Bostezando en la silla',
    cat: 'sentado',
    tags: ['bostezo', 'silla', 'cansado', 'estirar', 'aburrido'],
    root: { pos: [0, 0.51, -0.06], rot: [0, 0, 0] },
    snap: false,
    bones: {
      hips: [-14, 0, 0], spine: [-13, 3, -2], chest: [-12, 4, -2],
      neck: [-16, -2, 0], head: [-27, -3, 0],
      thigh_L: [-78, -3, 13], shin_L: [58, 0, 0], foot_L: [10, 0, 0],
      thigh_R: [-71, 3, -15], shin_R: [40, 0, 0], foot_R: [17, 0, 0],
      shoulder_L: [-6, 0, 12], shoulder_R: [-6, 0, -12],
      upperArm_L: [-14, 0, 144], foreArm_L: [-66, 26, 0], hand_L: [10, 0, 0],
      upperArm_R: [-10, 0, -138], foreArm_R: [-58, -26, 0], hand_R: [10, 0, 0],
    },
    props: [{ id: 'chair', pos: [0, 0, -0.16], rot: [0, 0, 0], scale: 1 }],
    cam: { theta: 40, phi: -6, dist: 3.0, targetY: 0.9, fov: 38 },
  },
  {
    id: 'borde_mesa',
    name: 'Sentado en el borde de la mesa',
    cat: 'sentado',
    tags: ['mesa', 'borde', 'colgando', 'casual'],
    root: { pos: [0, 0.81, 0.1], rot: [0, 0, 0] },
    snap: false,
    bones: {
      hips: [-4, 0, 0], spine: [6, -4, 0], chest: [4, -3, 0],
      neck: [-2, -4, 0], head: [3, -12, 0],
      thigh_L: [-84, -3, 9], shin_L: [72, 0, 0], foot_L: [23, 0, 0],
      thigh_R: [-84, 3, -9], shin_R: [58, 0, 0], foot_R: [18, 0, 0],
      shoulder_L: [-4, 0, 8], shoulder_R: [-4, 0, -8],
      upperArm_L: [32, 4, 7], foreArm_L: [-33, 0, 0], hand_L: [-58, 0, 0],
      upperArm_R: [22, -5, -9], foreArm_R: [-33, 0, 0], hand_R: [-58, 0, 0],
    },
    props: [{ id: 'table', pos: [0, 0, -0.06], rot: [0, 0, 0], scale: 1 }],
    cam: { theta: 28, phi: 2, dist: 3.2, targetY: 0.95, fov: 40 },
  },
  {
    id: 'perch_caja',
    name: 'En cuclillas sobre una caja',
    cat: 'objeto',
    tags: ['caja', 'encaramado', 'cuclillas', 'ninja', 'alto'],
    root: { pos: [0, 0.86, 0], rot: [0, 12, 0] },
    snap: false,
    bones: {
      hips: [11, -4, 0], spine: [16, -6, 2], chest: [10, -8, 1],
      neck: [-18, 5, 0], head: [-13, 7, 0],
      thigh_L: [-118, 4, 17], shin_L: [130, 0, 0], foot_L: [-6, 0, 0],
      thigh_R: [-112, -5, -13], shin_R: [128, 0, 0], foot_R: [-4, 0, 0],
      upperArm_L: [-24, 0, 21], foreArm_L: [-38, -10, 0], hand_L: [11, 0, 0],
      upperArm_R: [-46, 6, -15], foreArm_R: [-22, 8, 0], hand_R: [35, 0, 0],
    },
    props: [{ id: 'box', pos: [0, 0, 0], rot: [0, 8, 0], scale: 1 }],
    cam: { theta: 36, phi: -12, dist: 3.0, targetY: 1.0, fov: 34 },
  },

  /* ----------------------------------------------------------------- suelo */
  {
    id: 'abrazando_rodillas',
    name: 'En el suelo abrazando las rodillas',
    cat: 'suelo',
    tags: ['suelo', 'abrazo', 'rodillas', 'triste', 'encogido'],
    root: { pos: [0, 0.3, 0], rot: [0, 0, 0] },
    snap: true,
    bones: {
      hips: [22, 0, 0], spine: [8, -4, 0], chest: [9, -3, 0],
      neck: [-4, 3, 0], head: [12, 4, 0],
      thigh_L: [-116, -4, 13], shin_L: [128, 0, 0], foot_L: [-12, 0, 0],
      thigh_R: [-119, 4, -13], shin_R: [130, 0, 0], foot_R: [-12, 0, 0],
      shoulder_L: [4, 0, 10], shoulder_R: [4, 0, -10],
      upperArm_L: [-64, 0, 19], foreArm_L: [-96, -36, 0], hand_L: [-16, 0, 0],
      upperArm_R: [-62, 0, -19], foreArm_R: [-98, 36, 0], hand_R: [-16, 0, 0],
    },
    props: [],
    cam: { theta: 32, phi: -2, dist: 2.5, targetY: 0.55, fov: 40 },
  },
  {
    id: 'suelo_apoyado_atras',
    name: 'Sentado en el suelo, manos atrás',
    cat: 'suelo',
    tags: ['suelo', 'relajado', 'apoyado', 'pierna estirada'],
    root: { pos: [0, 0.28, 0], rot: [0, 0, 0] },
    snap: true,
    bones: {
      hips: [-26, -4, 0], spine: [-10, 5, 0], chest: [-6, 4, 0],
      neck: [-2, 5, 0], head: [7, 14, -2],
      thigh_L: [-72, -4, 17], shin_L: [104, 0, 0], foot_L: [-6, 0, 0],
      thigh_R: [-92, 4, -9], shin_R: [8, 0, 0], foot_R: [-18, 0, 0],
      shoulder_L: [8, 0, 6], shoulder_R: [8, 0, -6],
      upperArm_L: [46, 0, 27], foreArm_L: [-14, -10, 0], hand_L: [-68, 0, 0],
      upperArm_R: [46, 0, -27], foreArm_R: [-14, 10, 0], hand_R: [-68, 0, 0],
    },
    props: [],
    cam: { theta: 44, phi: 6, dist: 3.0, targetY: 0.5, fov: 40 },
  },
  {
    id: 'boca_abajo_leyendo',
    name: 'Boca abajo leyendo (piernas al aire)',
    cat: 'suelo',
    tags: ['tumbado', 'boca abajo', 'leer', 'piernas', 'relajado'],
    root: { pos: [0, 0.16, 0], rot: [90, 0, 0] },
    snap: true,
    bones: {
      hips: [-4, 0, 0], spine: [-22, 3, 0], chest: [-22, 4, 0],
      neck: [-12, -3, 0], head: [-24, -4, 0],
      thigh_L: [4, -3, 9], shin_L: [96, 0, 0], foot_L: [-16, 0, 0],
      thigh_R: [6, 3, -8], shin_R: [112, 0, 0], foot_R: [-10, 0, 0],
      shoulder_L: [0, 0, 12], shoulder_R: [0, 0, -12],
      upperArm_L: [-70, 0, 27], foreArm_L: [-94, -20, 0], hand_L: [-12, 0, 0],
      upperArm_R: [-68, 0, -27], foreArm_R: [-92, 20, 0], hand_R: [-12, 0, 0],
    },
    props: [{ id: 'floorMat', pos: [0, 0, 0], rot: [0, 0, 0], scale: 1 }],
    cam: { theta: 50, phi: -18, dist: 3.0, targetY: 0.4, fov: 38 },
  },
  {
    id: 'recostado_codo',
    name: 'Recostado de lado sobre el codo',
    cat: 'suelo',
    tags: ['tumbado', 'lado', 'codo', 'relajado', 'apoyado'],
    root: { pos: [0, 0.2, 0], rot: [0, 0, 86] },
    snap: true,
    bones: {
      hips: [-6, 0, 0], spine: [-6, 8, 0], chest: [-9, 10, 0],
      neck: [-6, 4, 0], head: [-14, 8, 0],
      thigh_L: [-25, -4, 11], shin_L: [43, 0, 0], foot_L: [-8, 0, 0],
      thigh_R: [-9, 4, -5], shin_R: [17, 0, 0], foot_R: [-6, 0, 0],
      shoulder_R: [0, 0, -18],
      upperArm_R: [-12, 0, -98], foreArm_R: [-88, 22, 0], hand_R: [-14, 0, 0],
      upperArm_L: [-30, 0, 24], foreArm_L: [-58, -18, 0], hand_L: [-8, 0, 0],
    },
    props: [{ id: 'floorMat', pos: [0, 0, 0], rot: [0, 0, 0], scale: 1 }],
    cam: { theta: 26, phi: -14, dist: 3.1, targetY: 0.45, fov: 38 },
  },

  /* -------------------------------------------------------------- con prop */
  {
    id: 'apoyado_pared',
    name: 'Apoyado en la pared, pierna doblada',
    cat: 'objeto',
    tags: ['pared', 'apoyado', 'casual', 'esperando', 'brazos cruzados'],
    root: { pos: [0, 0.94, 0.06], rot: [0, 0, 0] },
    snap: true,
    bones: {
      hips: [-5, 0, -3], spine: [-7, -4, 2], chest: [-5, -5, 2],
      neck: [4, 8, 0], head: [7, 15, -3],
      thigh_L: [-15, -3, 6], shin_L: [64, 0, 0], foot_L: [22, 0, 0],
      thigh_R: [11, 3, -3], shin_R: [5, 0, 0], foot_R: [-2, 0, 0],
      shoulder_L: [6, 0, 6], shoulder_R: [6, 0, -6],
      upperArm_L: [-30, 0, 17], foreArm_L: [-104, -32, 0], hand_L: [-16, 0, 0],
      upperArm_R: [-34, 0, -17], foreArm_R: [-100, 32, 0], hand_R: [-16, 0, 0],
    },
    props: [{ id: 'wall', pos: [0, 0, -0.16], rot: [0, 0, 0], scale: 1 }],
    cam: { theta: 46, phi: 2, dist: 3.3, targetY: 1.0, fov: 40 },
  },
  {
    id: 'codo_barandal',
    name: 'Codo apoyado en el barandal',
    cat: 'objeto',
    tags: ['barandal', 'barra', 'apoyado', 'casual', 'conversando'],
    root: { pos: [0, 0.94, 0], rot: [0, -10, 0] },
    snap: true,
    bones: {
      hips: [0, 4, -12], spine: [1, -4, -17], chest: [0, -6, -13],
      neck: [0, 14, 6], head: [3, 26, 7],
      thigh_L: [-2, 0, 11], shin_L: [4, 0, 0], foot_L: [2, 0, 0],
      thigh_R: [-5, 0, -5], shin_R: [7, 0, 0], foot_R: [4, 0, 0],
      shoulder_L: [0, 0, 18], shoulder_R: [0, 0, -4],
      upperArm_L: [-8, 0, 62], foreArm_L: [-84, 46, 0], hand_L: [-14, 0, 0],
      upperArm_R: [-8, 0, -9], foreArm_R: [-26, -12, 0], hand_R: [-6, 0, 0],
    },
    props: [{ id: 'railing', pos: [0.56, 0, 0.14], rot: [0, 90, 0], scale: 1 }],
    cam: { theta: 22, phi: 2, dist: 3.3, targetY: 1.05, fov: 40 },
  },
  {
    id: 'subiendo_escalon',
    name: 'Subiendo un escalón',
    cat: 'objeto',
    tags: ['escalera', 'escalón', 'subir', 'paso'],
    root: { pos: [0, 1.02, -0.16], rot: [0, 0, 0] },
    snap: false,
    bones: {
      hips: [4, -6, -3], spine: [10, 5, 2], chest: [6, 6, 1],
      neck: [-6, -3, 0], head: [-2, -5, 0],
      thigh_L: [-52, -3, 5], shin_L: [46, 0, 0], foot_L: [4, 0, 0],
      thigh_R: [7, 3, -3], shin_R: [12, 0, 0], foot_R: [19, 0, 0],
      upperArm_L: [23, 0, 8], foreArm_L: [-31, 10, 0], hand_L: [-8, 0, 0],
      upperArm_R: [-27, 0, -8], foreArm_R: [-43, -10, 0], hand_R: [-8, 0, 0],
    },
    props: [{ id: 'steps', pos: [0, 0, 0.35], rot: [0, 0, 0], scale: 1 }],
    cam: { theta: 52, phi: 0, dist: 3.4, targetY: 1.0, fov: 38 },
  },
  {
    id: 'cargando_caja',
    name: 'Cargando una caja',
    cat: 'objeto',
    tags: ['caja', 'cargar', 'peso', 'mudanza'],
    root: { pos: [0, 0.94, 0], rot: [0, 0, 0] },
    snap: true,
    bones: {
      hips: [-4, 0, 0], spine: [-9, 2, 0], chest: [-7, 2, 0],
      neck: [4, -3, 0], head: [6, -4, 0],
      thigh_L: [-7, -2, 7], shin_L: [11, 0, 0], foot_L: [-2, 0, 0],
      thigh_R: [-6, 2, -6], shin_R: [10, 0, 0], foot_R: [-2, 0, 0],
      shoulder_L: [-4, 0, 10], shoulder_R: [-4, 0, -10],
      upperArm_L: [1, -4, -9], foreArm_L: [-52, -26, 0], hand_L: [-14, 0, 0],
      upperArm_R: [4, 3, 6], foreArm_R: [-52, 26, 0], hand_R: [-14, 0, 0],
    },
    props: [{ id: 'box', pos: [0, 0.90, 0.34], rot: [0, 0, 0], scale: 0.62 }],
    cam: { theta: 30, phi: 0, dist: 3.2, targetY: 1.0, fov: 40 },
  },
  {
    id: 'gato_en_brazos',
    name: 'Con el gato en brazos',
    cat: 'objeto',
    tags: ['gato', 'cargar', 'ternura', 'abrazo'],
    root: { pos: [0, 0.94, 0], rot: [0, 6, 0] },
    snap: true,
    bones: {
      hips: [-2, 0, -3], spine: [-4, -3, 3], chest: [-2, -4, 2],
      neck: [8, 6, 0], head: [16, 8, -4],
      thigh_L: [-4, -2, 8], shin_L: [7, 0, 0], foot_L: [-2, 0, 0],
      thigh_R: [-2, 2, -5], shin_R: [5, 0, 0], foot_R: [-2, 0, 0],
      shoulder_L: [-2, 0, 8], shoulder_R: [-2, 0, -8],
      upperArm_L: [-6, -3, -9], foreArm_L: [-52, -34, 0], hand_L: [-18, 0, 0],
      upperArm_R: [-6, 2, 6], foreArm_R: [-52, 34, 0], hand_R: [-18, 0, 0],
    },
    props: [{ id: 'cat', pos: [0, 0.88, 0.30], rot: [-14, 34, 8], scale: 0.9 }],
    cam: { theta: 24, phi: -4, dist: 2.7, targetY: 1.15, fov: 38 },
  },
  {
    id: 'taburete_encogido',
    name: 'Encogido en el taburete',
    cat: 'sentado',
    tags: ['taburete', 'banco', 'encogido', 'pies en el travesaño', 'pensativo'],
    root: { pos: [0, 0.66, -0.02], rot: [0, 0, 0] },
    snap: false,
    bones: {
      hips: [10, 0, 0], spine: [16, -4, 0], chest: [10, -3, 0],
      neck: [-8, 3, 0], head: [8, 4, 0],
      thigh_L: [-102, -10, 5], shin_L: [116, 0, 0], foot_L: [6, 0, 0],
      thigh_R: [-101, 6, -4], shin_R: [118, 0, 0], foot_R: [6, 0, 0],
      shoulder_L: [4, 0, 8], shoulder_R: [4, 0, -8],
      upperArm_L: [-58, 0, 20], foreArm_L: [-98, -30, 0], hand_L: [-16, 0, 0],
      upperArm_R: [-56, 0, -20], foreArm_R: [-96, 30, 0], hand_R: [-16, 0, 0],
    },
    props: [{ id: 'stool', pos: [0, 0, -0.04], rot: [0, 0, 0], scale: 1 }],
    cam: { theta: 34, phi: -4, dist: 2.8, targetY: 0.9, fov: 38 },
  },
];

export const POSES_BY_ID = Object.fromEntries(POSES.map((p) => [p.id, p]));

/** Busca poses por texto libre (nombre + tags + categoría). */
export function searchPoses(list, query, category = 'todas') {
  const q = (query || '').trim().toLowerCase();
  return list.filter((p) => {
    if (category !== 'todas' && p.cat !== category) return false;
    if (!q) return true;
    const hay = [p.name, p.id, p.cat, ...(p.tags || [])].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

/** Devuelve una copia profunda de la pose (para no mutar la biblioteca). */
export function clonePose(pose) {
  return JSON.parse(JSON.stringify(pose));
}

/**
 * Refleja una pose en el eje X (izquierda <-> derecha).
 * @param {object} bones mapa hueso -> [x,y,z]
 * @param {object} boneByName definición del esqueleto (para leer `mirror`)
 */
export function mirrorBones(bones, boneByName) {
  const out = {};
  for (const [name, rot] of Object.entries(bones)) {
    const def = boneByName[name];
    const target = def?.mirror || name;
    out[target] = [rot[0], -rot[1], -rot[2]];
  }
  return out;
}

/**
 * "Naturalizar": rompe la simetría perfecta con micro-variaciones dentro de
 * rangos plausibles. Es lo que evita que la pose se vea de maniquí de tienda.
 * @param {object} bones
 * @param {number} amount 0..1
 * @param {() => number} rng generador (inyectable para los tests)
 */
export function naturalize(bones, amount = 0.5, rng = Math.random) {
  const k = Math.max(0, Math.min(1, amount));
  // Cuánto puede moverse cada zona, en grados, a intensidad 1.
  const JITTER = {
    torso: 4, head: 6, shoulder: 5, arm: 7, forearm: 8, hand: 10, thigh: 5, shin: 6, foot: 7,
  };
  const zoneOf = (n) => {
    if (n === 'head') return 'head';
    if (['hips', 'spine', 'chest', 'neck'].includes(n)) return 'torso';
    if (n.startsWith('shoulder')) return 'shoulder';
    if (n.startsWith('upperArm')) return 'arm';
    if (n.startsWith('foreArm')) return 'forearm';
    if (n.startsWith('hand')) return 'hand';
    if (n.startsWith('thigh')) return 'thigh';
    if (n.startsWith('shin')) return 'shin';
    if (n.startsWith('foot')) return 'foot';
    return 'torso';
  };
  const out = {};
  for (const [name, rot] of Object.entries(bones)) {
    const j = JITTER[zoneOf(name)] * k;
    out[name] = rot.map((v) => v + (rng() * 2 - 1) * j);
  }
  return out;
}
