import * as THREE from '../vendor/three.module.js';
import { PROP_IDS } from './poses.js';

/**
 * Objetos de escena. Sirven de referencia de escala y dan contexto a la pose
 * (una pierna sobre "nada" no se lee; sobre una mesa sí).
 */

const MAT_WOOD = () => new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 0.85, metalness: 0.0 });
const MAT_LIGHT = () => new THREE.MeshStandardMaterial({ color: 0x8f8579, roughness: 0.9 });
const MAT_METAL = () => new THREE.MeshStandardMaterial({ color: 0x9aa2ad, roughness: 0.35, metalness: 0.6 });
const MAT_FUR = () => new THREE.MeshStandardMaterial({ color: 0x8a7f74, roughness: 1.0 });
const MAT_CLOTH = () => new THREE.MeshStandardMaterial({ color: 0x5d6674, roughness: 1.0 });

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const BUILDERS = {
  /** Mesa de 75 cm de alto, 1.4 x 0.7 */
  table() {
    const g = new THREE.Group();
    const mat = MAT_WOOD();
    g.add(box(1.4, 0.045, 0.72, mat, 0, 0.7275, 0));
    const legY = 0.35;
    for (const [x, z] of [[0.63, 0.3], [-0.63, 0.3], [0.63, -0.3], [-0.63, -0.3]]) {
      g.add(box(0.055, 0.705, 0.055, mat, x, legY, z));
    }
    return g;
  },

  /** Silla con asiento a 45 cm */
  chair() {
    const g = new THREE.Group();
    const mat = MAT_WOOD();
    g.add(box(0.44, 0.04, 0.44, mat, 0, 0.45, 0));
    for (const [x, z] of [[0.18, 0.18], [-0.18, 0.18], [0.18, -0.18], [-0.18, -0.18]]) {
      g.add(box(0.04, 0.43, 0.04, mat, x, 0.215, z));
    }
    g.add(box(0.44, 0.46, 0.035, mat, 0, 0.7, -0.2));
    return g;
  },

  /** Taburete redondo a 60 cm */
  stool() {
    const g = new THREE.Group();
    const mat = MAT_WOOD();
    g.add(cyl(0.19, 0.19, 0.05, mat, 0, 0.6, 0, 24));
    for (const [x, z] of [[0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13]]) {
      g.add(cyl(0.022, 0.026, 0.575, mat, x, 0.2875, z, 10));
    }
    g.add(cyl(0.14, 0.14, 0.02, mat, 0, 0.18, 0, 20));
    return g;
  },

  /** Caja de 50 cm */
  box() {
    const g = new THREE.Group();
    const mat = MAT_LIGHT();
    g.add(box(0.5, 0.5, 0.5, mat, 0, 0.25, 0));
    const line = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.502, 0.502, 0.502)),
      new THREE.LineBasicMaterial({ color: 0x3a352e }),
    );
    line.position.y = 0.25;
    g.add(line);
    return g;
  },

  /** Tres escalones de 18 cm */
  steps() {
    const g = new THREE.Group();
    const mat = MAT_LIGHT();
    for (let i = 0; i < 3; i++) {
      g.add(box(1.5, 0.18, 0.32, mat, 0, 0.09 + i * 0.18, i * 0.32));
    }
    return g;
  },

  /** Pared de 2.6 m */
  wall() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x7d8087, roughness: 0.95, side: THREE.DoubleSide });
    g.add(box(3.0, 2.6, 0.08, mat, 0, 1.3, 0));
    return g;
  },

  /** Barandal / barra de bar a 105 cm (orientado a lo largo de X) */
  railing() {
    const g = new THREE.Group();
    const mat = MAT_METAL();
    g.add(cyl(0.032, 0.032, 2.0, mat, 0, 1.05, 0, 16));
    g.children[0].rotation.z = Math.PI / 2;
    for (const x of [-0.8, 0.8]) {
      g.add(cyl(0.026, 0.03, 1.05, mat, x, 0.525, 0, 12));
    }
    return g;
  },

  /** Gato sentado, ~28 cm al lomo */
  cat() {
    const g = new THREE.Group();
    const mat = MAT_FUR();
    // cuerpo
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), mat);
    body.scale.set(0.9, 1.05, 1.25);
    body.position.set(0, 0.16, 0);
    g.add(body);
    // cabeza
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.082, 16, 14), mat);
    head.scale.set(1, 0.95, 0.95);
    head.position.set(0, 0.33, 0.06);
    g.add(head);
    // orejas
    for (const x of [-0.045, 0.045]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.06, 4), mat);
      ear.position.set(x, 0.395, 0.05);
      ear.rotation.x = -0.15;
      g.add(ear);
    }
    // hocico
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), mat);
    snout.scale.set(1.1, 0.8, 0.9);
    snout.position.set(0, 0.305, 0.125);
    g.add(snout);
    // patas delanteras
    for (const x of [-0.055, 0.055]) {
      g.add(cyl(0.028, 0.03, 0.16, mat, x, 0.08, 0.1, 10));
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.033, 10, 8), mat);
      paw.scale.set(1, 0.7, 1.3);
      paw.position.set(x, 0.025, 0.125);
      g.add(paw);
    }
    // ancas
    for (const x of [-0.085, 0.085]) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), mat);
      h.scale.set(0.75, 1, 1.05);
      h.position.set(x, 0.09, -0.055);
      g.add(h);
    }
    // cola
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.06, -0.14),
      new THREE.Vector3(0.05, 0.03, -0.24),
      new THREE.Vector3(0.16, 0.06, -0.24),
      new THREE.Vector3(0.2, 0.16, -0.15),
    ]);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.021, 8, false), mat);
    g.add(tail);
    g.traverse((o) => { o.castShadow = true; });
    return g;
  },

  /** Tapete / futón fino, referencia para poses tumbadas */
  floorMat() {
    const g = new THREE.Group();
    const m = box(1.9, 0.045, 1.0, MAT_CLOTH(), 0, 0.0225, 0);
    m.castShadow = false;
    g.add(m);
    return g;
  },
};

/* --------------------------------------------------- manipuladores de prop */

/**
 * Cada objeto lleva dos manipuladores en su base:
 *   · un disco verde  -> arrastrar por el suelo (X/Z)
 *   · un anillo verde -> girar sobre el eje vertical
 *
 * Van en un grupo aparte para poder ocultarlos al exportar el PNG y para que
 * el raycast los distinga de la geometría del objeto.
 */
export function buildGizmo(radius, { moveColor = 0x7bdc8b, ringColor = 0x4fc3f7 } = {}) {
  const g = new THREE.Group();
  g.name = 'propGizmo';
  g.userData.isPropGizmo = true;

  const mkMat = (color) => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.75, depthTest: false, side: THREE.DoubleSide,
  });

  // Disco de desplazamiento
  const move = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.46, 28), mkMat(moveColor));
  move.rotation.x = -Math.PI / 2;
  move.position.y = 0.006;
  move.renderOrder = 998;
  move.userData = { propHandle: 'move' };
  g.add(move);

  // Anillo de giro
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.74, radius * 0.96, 40), mkMat(ringColor));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.005;
  ring.renderOrder = 998;
  ring.userData = { propHandle: 'rotate' };
  g.add(ring);

  // Muesca que indica hacia dónde mira el objeto
  const notch = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.09, 12), mkMat(ringColor));
  notch.rotation.x = -Math.PI / 2;
  notch.position.set(0, 0.007, radius * 0.85);
  notch.renderOrder = 999;
  notch.userData = { propHandle: 'rotate' };
  g.add(notch);

  return g;
}

/** Crea el objeto 3D de un prop por id. Devuelve null si el id no existe. */
export function createProp(id) {
  const build = BUILDERS[id];
  if (!build) return null;
  const g = build();
  g.name = `prop:${id}`;
  g.userData.propId = id;

  // El radio del gizmo se saca de la huella real del objeto, así el de una
  // pared no queda del mismo tamaño que el de un gato.
  const bb = new THREE.Box3().setFromObject(g);
  const size = bb.getSize(new THREE.Vector3());
  const radius = Math.max(0.34, Math.min(1.3, Math.max(size.x, size.z) * 0.62));

  const gizmo = buildGizmo(radius);
  // Centrado en la huella del objeto, no en su origen, para que caiga debajo.
  gizmo.position.set((bb.min.x + bb.max.x) / 2, 0, (bb.min.z + bb.max.z) / 2);
  g.add(gizmo);
  g.userData.gizmo = gizmo;
  g.userData.gizmoHandles = gizmo.children;

  return g;
}

/** Muestra u oculta los manipuladores de todos los props de un grupo. */
export function setPropGizmosVisible(propsGroup, visible) {
  for (const obj of propsGroup.children) {
    if (obj.userData.gizmo) obj.userData.gizmo.visible = visible;
  }
}

/** Resalta el manipulador del prop seleccionado. */
export function highlightPropGizmo(propsGroup, uid) {
  for (const obj of propsGroup.children) {
    const gz = obj.userData.gizmo;
    if (!gz) continue;
    const on = obj.userData.uid === uid;
    for (const child of gz.children) {
      child.material.opacity = on ? 0.95 : 0.42;
    }
    gz.scale.setScalar(on ? 1.08 : 1);
  }
}

/** Ids con constructor disponible (se usa en los tests). */
export const BUILDABLE_PROPS = Object.keys(BUILDERS);

/** Comprueba que todo id declarado tenga constructor. */
export function assertPropsComplete() {
  const missing = PROP_IDS.filter((id) => !BUILDERS[id]);
  if (missing.length) throw new Error(`Props sin constructor: ${missing.join(', ')}`);
  return true;
}
