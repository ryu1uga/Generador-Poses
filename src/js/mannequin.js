import * as THREE from '../vendor/three.module.js';
import {
  BONES, BONE_BY_NAME, IK_CHAINS, DEFAULT_ROOT_Y, SPINE_BONES,
} from './skeleton-def.js';
import { solveTwoBone, localChainDirection, clamp } from './ik.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/* ------------------------------------------------------------- materiales */

function gradientMap() {
  const data = new Uint8Array([70, 120, 175, 230, 255]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

export const SHADING = {
  madera: () => new THREE.MeshStandardMaterial({ color: 0xd8b98c, roughness: 0.72, metalness: 0.0 }),
  arcilla: () => new THREE.MeshStandardMaterial({ color: 0xe8e4dd, roughness: 0.95, metalness: 0.0 }),
  toon: () => new THREE.MeshToonMaterial({ color: 0xe9e2d6, gradientMap: gradientMap() }),
  silueta: () => new THREE.MeshBasicMaterial({ color: 0x14161c }),
};

export const SHADING_LABELS = {
  madera: 'Maniquí de madera',
  arcilla: 'Arcilla (volumen)',
  toon: 'Toon (manga)',
  silueta: 'Silueta',
};

/* ------------------------------------------------------- proporciones */

export const DEFAULT_PROPORTIONS = {
  height: 1, head: 1, shoulders: 1, hips: 1, limbs: 1, torso: 1,
};

function scaleDef(def, p) {
  const S = p.height;
  const off = def.offset.map((v) => v * S);
  const isSpine = SPINE_BONES.includes(def.name);

  // Ancho de hombros y de cadera
  if (def.name.startsWith('shoulder')) off[0] *= p.shoulders;
  if (def.name.startsWith('thigh')) off[0] *= p.hips;
  if (def.name.startsWith('upperArm')) off[0] *= p.shoulders;
  // Largo del torso
  if (isSpine && def.name !== 'hips') off[1] *= p.torso;

  const geo = { ...def.geo };
  for (const k of ['r0', 'r1', 'len', 'w', 'd', 'drop']) {
    if (typeof geo[k] === 'number') geo[k] *= S;
  }
  // Grosor de extremidades
  if (!isSpine) {
    for (const k of ['r0', 'r1', 'w', 'd']) {
      if (typeof geo[k] === 'number') geo[k] *= p.limbs;
    }
  }
  // Ancho de caja torácica / pelvis
  if (def.name === 'chest') { geo.r1 *= p.shoulders; geo.r0 *= (1 + (p.shoulders - 1) * 0.4); }
  if (def.name === 'hips') { geo.r0 *= p.hips; geo.r1 *= p.hips; }
  if (def.name === 'spine') { geo.r0 *= (1 + (p.hips - 1) * 0.4); }
  // Cabeza
  if (def.name === 'head') { geo.r0 *= p.head; geo.len *= p.head; }

  return { off, geo };
}

/* --------------------------------------------------------- construcción */

function buildGeometry(geo, material) {
  const meshes = [];
  const dir = geo.dir || 'down';

  if (geo.shape === 'cyl') {
    const up = dir === 'up';
    const g = new THREE.CylinderGeometry(
      up ? geo.r1 : geo.r0,
      up ? geo.r0 : geo.r1,
      geo.len,
      20, 1,
    );
    const m = new THREE.Mesh(g, material);
    m.position.y = up ? geo.len / 2 : -geo.len / 2;
    if (geo.flatZ) m.scale.z = geo.flatZ;
    meshes.push(m);
  } else if (geo.shape === 'sphere') {
    meshes.push(new THREE.Mesh(new THREE.SphereGeometry(geo.r0, 18, 14), material));
  } else if (geo.shape === 'egg') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(geo.r0, 24, 18), material);
    m.scale.set(0.88, geo.len / (2 * geo.r0), 0.95);
    m.position.y = geo.len / 2;
    meshes.push(m);
  } else if (geo.shape === 'box') {
    if (dir === 'fwd') {
      const m = new THREE.Mesh(new THREE.BoxGeometry(geo.w, geo.d, geo.len), material);
      m.position.set(0, -(geo.drop || 0) - geo.d / 2, geo.len / 2 - geo.w * 0.35);
      meshes.push(m);
    } else {
      const m = new THREE.Mesh(new THREE.BoxGeometry(geo.w, geo.len, geo.d), material);
      m.position.y = -geo.len / 2;
      meshes.push(m);
    }
  }

  for (const m of meshes) { m.castShadow = true; m.receiveShadow = true; }
  return meshes;
}

/**
 * Construye el maniquí completo.
 * @param {object} proportions
 * @param {string} shading clave de SHADING
 * @returns {{root:THREE.Group, bones:Object<string,THREE.Object3D>, handles:THREE.Mesh[], material:THREE.Material, bodyMeshes:THREE.Mesh[]}}
 */
export function buildMannequin(proportions = DEFAULT_PROPORTIONS, shading = 'madera') {
  const p = { ...DEFAULT_PROPORTIONS, ...proportions };
  const material = (SHADING[shading] || SHADING.madera)();

  const root = new THREE.Group();
  root.name = 'mannequinRoot';
  root.position.y = DEFAULT_ROOT_Y * p.height;

  const bones = {};
  const handles = [];
  const bodyMeshes = [];

  const handleMat = new THREE.MeshBasicMaterial({
    color: 0x4fc3f7, transparent: true, opacity: 0.55, depthTest: false,
  });
  const ikHandleMat = new THREE.MeshBasicMaterial({
    color: 0xffb74d, transparent: true, opacity: 0.7, depthTest: false,
  });

  for (const def of BONES) {
    const { off, geo } = scaleDef(def, p);
    const bone = new THREE.Object3D();
    bone.name = def.name;
    bone.position.set(off[0], off[1], off[2]);
    bone.userData.boneName = def.name;
    bone.userData.restPosition = bone.position.clone();

    const parent = def.parent ? bones[def.parent] : root;
    parent.add(bone);
    bones[def.name] = bone;

    for (const mesh of buildGeometry(geo, material)) {
      mesh.userData.boneName = def.name;
      bone.add(mesh);
      bodyMeshes.push(mesh);
    }

    // Esfera de articulación (look de maniquí de madera)
    if (!['head', 'hips'].includes(def.name) && geo.shape !== 'sphere') {
      const r = (geo.r0 || 0.04) * 0.92;
      const joint = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), material);
      joint.castShadow = true;
      joint.userData.boneName = def.name;
      bone.add(joint);
      bodyMeshes.push(joint);
    }

    // Manipulador clicable
    const isIK = def.handle === 'ik';
    const hr = (isIK ? 0.048 : 0.036) * p.height * (def.group === 'torso' ? 1.15 : 1);
    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(hr, 14, 10),
      (isIK ? ikHandleMat : handleMat).clone(),
    );
    handle.name = `handle:${def.name}`;
    handle.userData = { boneName: def.name, isHandle: true, isIK };
    handle.renderOrder = 999;
    bone.add(handle);
    handles.push(handle);
  }

  return { root, bones, handles, material, bodyMeshes, proportions: p };
}

/* ------------------------------------------------------------ aplicar pose */

/** Aplica un mapa {hueso:[gx,gy,gz]} (grados) al esqueleto. */
export function applyBoneRotations(bones, rotations = {}) {
  for (const def of BONES) {
    const r = rotations[def.name];
    const b = bones[def.name];
    if (!b) continue;
    if (r) b.rotation.set(r[0] * D2R, r[1] * D2R, r[2] * D2R);
    else b.rotation.set(0, 0, 0);
  }
}

/** Aplica una pose completa (raíz + huesos). No coloca props. */
export function applyPose(mannequin, pose) {
  const { root, bones } = mannequin;
  const h = mannequin.proportions?.height ?? 1;
  const rp = pose.root?.pos ?? [0, DEFAULT_ROOT_Y, 0];
  const rr = pose.root?.rot ?? [0, 0, 0];
  root.position.set(rp[0] * h, rp[1] * h, rp[2] * h);
  root.rotation.set(rr[0] * D2R, rr[1] * D2R, rr[2] * D2R);
  applyBoneRotations(bones, pose.bones || {});
  if (pose.snap !== false) snapToGround(mannequin);
}

/** Lee el estado actual como objeto pose serializable. */
export function readPose(mannequin, meta = {}) {
  const { root, bones } = mannequin;
  const h = mannequin.proportions?.height ?? 1;
  const out = {
    ...meta,
    root: {
      pos: [root.position.x / h, root.position.y / h, root.position.z / h],
      rot: [root.rotation.x * R2D, root.rotation.y * R2D, root.rotation.z * R2D],
    },
    snap: false,
    bones: {},
  };
  for (const def of BONES) {
    const b = bones[def.name];
    const r = [b.rotation.x * R2D, b.rotation.y * R2D, b.rotation.z * R2D];
    if (r.some((v) => Math.abs(v) > 0.01)) out.bones[def.name] = r.map((v) => +v.toFixed(2));
  }
  return out;
}

/** Baja o sube el maniquí hasta que su punto más bajo toque y = 0. */
export function snapToGround(mannequin) {
  const { root, bodyMeshes } = mannequin;
  root.updateMatrixWorld(true);
  const boxAll = new THREE.Box3();
  const tmp = new THREE.Box3();
  let first = true;
  for (const m of bodyMeshes) {
    tmp.setFromObject(m);
    if (first) { boxAll.copy(tmp); first = false; } else boxAll.union(tmp);
  }
  if (first) return;
  root.position.y -= boxAll.min.y;
  root.updateMatrixWorld(true);
}

/* ------------------------------------------------------------------- IK */

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qt = new THREE.Quaternion();

/**
 * Resuelve la cadena de 2 huesos para que el efector alcance `worldTarget`.
 * @returns {boolean} true si el objetivo era alcanzable
 */
export function applyIK(mannequin, effectorName, worldTarget, twistDeg = 0) {
  const chain = IK_CHAINS[effectorName];
  if (!chain) return false;
  const { bones } = mannequin;
  const rootBone = bones[chain.root];
  const midBone = bones[chain.mid];
  const endBone = bones[chain.end];
  if (!rootBone || !midBone || !endBone) return false;

  const l1 = midBone.position.length();
  const l2 = endBone.position.length();

  rootBone.updateWorldMatrix(true, false);
  const rootWorld = rootBone.getWorldPosition(_v);
  const dist = rootWorld.distanceTo(worldTarget);

  const { bendAngle, reachable } = solveTwoBone(l1, l2, dist);

  // 1. Flexión de la articulación media (solo eje X local).
  midBone.rotation.x = bendAngle * chain.bendSign;

  // 2. Orientar el hueso raíz para apuntar al objetivo.
  const parent = rootBone.parent;
  parent.updateWorldMatrix(true, false);
  const targetLocal = _v2.copy(worldTarget);
  parent.worldToLocal(targetLocal);
  targetLocal.sub(rootBone.position);
  if (targetLocal.lengthSq() < 1e-10) return false;
  targetLocal.normalize();

  const ld = localChainDirection(l1, l2, bendAngle, chain.bendSign);
  const localDir = new THREE.Vector3(ld.x, ld.y, ld.z).normalize();

  _q.setFromUnitVectors(localDir, targetLocal);
  if (twistDeg) {
    _qt.setFromAxisAngle(targetLocal, twistDeg * D2R);
    _q.premultiply(_qt);
  }
  rootBone.quaternion.copy(_q);

  return reachable;
}

/** Longitudes de la cadena, útil para la UI y los tests. */
export function chainLengths(mannequin, effectorName) {
  const chain = IK_CHAINS[effectorName];
  if (!chain) return null;
  const { bones } = mannequin;
  return {
    l1: bones[chain.mid].position.length(),
    l2: bones[chain.end].position.length(),
    total: bones[chain.mid].position.length() + bones[chain.end].position.length(),
  };
}

/* --------------------------------------------------------------- utilidad */

/** Aplica los límites articulares definidos en el esqueleto. */
export function clampBone(boneName, rotDeg) {
  const def = BONE_BY_NAME[boneName];
  if (!def?.limits) return rotDeg;
  return [
    clamp(rotDeg[0], def.limits.x[0], def.limits.x[1]),
    clamp(rotDeg[1], def.limits.y[0], def.limits.y[1]),
    clamp(rotDeg[2], def.limits.z[0], def.limits.z[1]),
  ];
}

/** Cambia el material de todo el cuerpo sin reconstruir la geometría. */
export function setShading(mannequin, key) {
  const mat = (SHADING[key] || SHADING.madera)();
  for (const m of mannequin.bodyMeshes) m.material = mat;
  mannequin.material = mat;
  return mat;
}

/** Muestra u oculta los manipuladores. */
export function setHandlesVisible(mannequin, visible) {
  for (const h of mannequin.handles) h.visible = visible;
}

/** Altura total actual del maniquí en metros (para el HUD de escala). */
export function measureHeight(mannequin) {
  mannequin.root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  let first = true;
  for (const m of mannequin.bodyMeshes) {
    tmp.setFromObject(m);
    if (first) { box.copy(tmp); first = false; } else box.union(tmp);
  }
  return first ? 0 : box.max.y - box.min.y;
}
