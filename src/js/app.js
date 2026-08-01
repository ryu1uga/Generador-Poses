import * as THREE from '../vendor/three.module.js';
import { createScene } from './scene.js';
import { OrbitCamera, CAMERA_PRESETS } from './orbit.js';
import { createProp, setPropGizmosVisible, highlightPropGizmo } from './props.js';
import {
  POSES, POSES_BY_ID, CATEGORIES, PROP_IDS, PROP_LABELS,
  searchPoses, clonePose, mirrorBones, naturalize,
} from './poses.js';
import {
  BONES, BONE_BY_NAME, GROUPS, IK_CHAINS, BODY_TYPES, PROPORTION_RANGES,
} from './skeleton-def.js';
import {
  buildMannequin, applyPose, readPose, applyIK, snapToGround, setShading,
  setHandlesVisible, clampBone, measureHeight, SHADING, SHADING_LABELS,
  DEFAULT_PROPORTIONS,
} from './mannequin.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const $ = (sel) => document.querySelector(sel);

/* ========================================================== estado global */

const state = {
  poseId: 'reposo_natural',
  poseName: '',
  selectedBone: 'chest',
  symmetry: false,
  limits: true,
  twist: 0,
  bodyType: 'shonen',
  proportions: { ...BODY_TYPES.shonen },
  shading: 'madera',
  props: [],
  selectedProp: null,
  userPoses: [],
  category: 'todas',
  query: '',
  undo: [],
  redo: [],
  natAmount: 0.45,
};
delete state.proportions.label;

/* ============================================================ escena 3D */

const canvas = $('#canvas');
const viewport = $('#viewport');
const view = createScene(canvas);
const orbit = new OrbitCamera(view.camera, viewport);

let man = buildMannequin(state.proportions, state.shading);
view.scene.add(man.root);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let needsRender = true;
const invalidate = () => { needsRender = true; };

// Sin esto la cámara se movía pero el lienzo no se repintaba.
orbit.onChange = invalidate;

function loop() {
  if (needsRender) {
    view.render();
    needsRender = false;
  }
  requestAnimationFrame(loop);
}
loop();

// ResizeObserver en vez de solo 'resize': el visor también cambia de tamaño
// cuando la barra de herramientas pasa a dos líneas o cambia el zoom de la UI,
// y en esos casos no hay evento de ventana.
const ro = new ResizeObserver(() => { view.resize(); invalidate(); });
ro.observe(viewport);
window.addEventListener('resize', () => { view.resize(); invalidate(); });

/* ================================================== utilidades de pose */

/** Rotaciones actuales de TODOS los huesos (incluidos los que están en 0). */
function currentBonesFull() {
  const out = {};
  for (const def of BONES) {
    const b = man.bones[def.name];
    out[def.name] = [b.rotation.x * R2D, b.rotation.y * R2D, b.rotation.z * R2D];
  }
  return out;
}

function setBoneRotation(name, rotDeg, { mirror = true } = {}) {
  const bone = man.bones[name];
  if (!bone) return;
  const r = state.limits ? clampBone(name, rotDeg) : rotDeg;
  bone.rotation.set(r[0] * D2R, r[1] * D2R, r[2] * D2R);

  if (mirror && state.symmetry) {
    const twin = BONE_BY_NAME[name]?.mirror;
    if (twin) {
      const m = state.limits ? clampBone(twin, [r[0], -r[1], -r[2]]) : [r[0], -r[1], -r[2]];
      man.bones[twin].rotation.set(m[0] * D2R, m[1] * D2R, m[2] * D2R);
    }
  }
  invalidate();
}

function snapshotState() {
  return { pose: readPose(man), props: state.props.map((p) => serializeProp(p)) };
}

function pushUndo() {
  state.undo.push(snapshotState());
  if (state.undo.length > 60) state.undo.shift();
  state.redo.length = 0;
}

function restoreState(snap) {
  applyPose(man, { ...snap.pose, snap: false });
  setProps(snap.props);
  syncBoneSliders();
  updateHud();
  invalidate();
}

function undo() {
  if (!state.undo.length) return toast('Nada que deshacer');
  state.redo.push(snapshotState());
  restoreState(state.undo.pop());
}

function redo() {
  if (!state.redo.length) return toast('Nada que rehacer');
  state.undo.push(snapshotState());
  restoreState(state.redo.pop());
}

/* ==================================================== props de escena */

let propUid = 1;

function serializeProp(p) {
  return { id: p.id, pos: [...p.pos], rot: [...p.rot], scale: p.scale };
}

function addProp(spec) {
  const obj = createProp(spec.id);
  if (!obj) return null;
  const pos = spec.pos || [0, 0, 0];
  const rot = spec.rot || [0, 0, 0];
  const scale = spec.scale ?? 1;
  obj.position.set(pos[0], pos[1], pos[2]);
  obj.rotation.set(rot[0] * D2R, rot[1] * D2R, rot[2] * D2R);
  obj.scale.setScalar(scale);
  view.propsGroup.add(obj);
  const rec = { uid: propUid++, id: spec.id, pos: [...pos], rot: [...rot], scale, obj };
  obj.userData.uid = rec.uid;
  state.props.push(rec);
  if (obj.userData.gizmo) obj.userData.gizmo.visible = propGizmosOn();
  return rec;
}

/** Los manipuladores de objeto comparten la casilla de "Controles". */
function propGizmosOn() {
  const c = $('#showHandles');
  return c ? c.checked : true;
}

/** Vuelca la transformación real del objeto 3D al registro serializable. */
function syncPropRecord(rec) {
  rec.pos = [rec.obj.position.x, rec.obj.position.y, rec.obj.position.z];
  rec.rot = [rec.obj.rotation.x * R2D, rec.obj.rotation.y * R2D, rec.obj.rotation.z * R2D];
}

function selectProp(uid) {
  state.selectedProp = uid;
  highlightPropGizmo(view.propsGroup, uid);
  invalidate();
}

function removeProp(uid) {
  const i = state.props.findIndex((p) => p.uid === uid);
  if (i < 0) return;
  view.propsGroup.remove(state.props[i].obj);
  state.props.splice(i, 1);
  if (state.selectedProp === uid) state.selectedProp = null;
  renderPropList();
  invalidate();
}

function setProps(list = []) {
  for (const p of state.props) view.propsGroup.remove(p.obj);
  state.props.length = 0;
  state.selectedProp = null;
  for (const spec of list) addProp(spec);
  renderPropList();
  invalidate();
}

/* ========================================================= aplicar pose */

function applyPoseById(id, { record = true } = {}) {
  const pose = POSES_BY_ID[id] || state.userPoses.find((p) => p.id === id || p.name === id);
  if (!pose) return;
  if (record) pushUndo();
  state.poseId = pose.id || pose.name;
  state.poseName = pose.name;
  applyPose(man, pose);
  setProps(pose.props || []);
  if (pose.cam) {
    orbit.set(pose.cam);
    $('#fov').value = Math.round(view.camera.fov);
    $('#fovOut').textContent = `${Math.round(view.camera.fov)}°`;
  }
  $('#poseName').value = pose.name || '';
  syncBoneSliders();
  updateHud();
  renderPoseList();
  renderUserPoses();
  invalidate();
}

/* ================================================ interacción con el 3D */

let drag = null;
const dragPlane = new THREE.Plane();
const groundPlane = new THREE.Plane();
const UP = new THREE.Vector3(0, 1, 0);
const hitPoint = new THREE.Vector3();
const grabOffset = new THREE.Vector3();

function updatePointer(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
}

function pickHandle(e) {
  updatePointer(e);
  raycaster.setFromCamera(pointer, view.camera);
  const visible = man.handles.filter((h) => h.visible);
  const hits = raycaster.intersectObjects(visible, false);
  return hits.length ? hits[0].object : null;
}

/** Manipulador de objeto bajo el cursor: {rec, kind:'move'|'rotate'} o null. */
function pickPropHandle(e) {
  if (!propGizmosOn()) return null;
  updatePointer(e);
  raycaster.setFromCamera(pointer, view.camera);
  const targets = [];
  for (const rec of state.props) {
    const gz = rec.obj.userData.gizmo;
    if (gz && gz.visible) targets.push(...gz.children);
  }
  if (!targets.length) return null;
  const hits = raycaster.intersectObjects(targets, false);
  if (!hits.length) return null;
  const obj = hits[0].object;
  // El grupo del prop es el abuelo del manipulador (prop > gizmo > disco).
  const rec = state.props.find((p) => p.obj === obj.parent?.parent);
  if (!rec) return null;
  return { rec, kind: obj.userData.propHandle };
}

/** Punto donde el rayo del cursor corta el plano horizontal a la altura y. */
function groundPoint(e, y) {
  updatePointer(e);
  raycaster.setFromCamera(pointer, view.camera);
  groundPlane.set(UP, -y);
  return raycaster.ray.intersectPlane(groundPlane, hitPoint) ? hitPoint.clone() : null;
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || drag) return;

  // Los manipuladores del maniquí tienen prioridad; si no hay ninguno bajo el
  // cursor, se prueban los de los objetos de escena.
  const handle = pickHandle(e);
  if (!handle) {
    const grip = pickPropHandle(e);
    if (!grip) return; // deja que la cámara orbite

    const { rec, kind } = grip;
    const p = groundPoint(e, rec.obj.position.y);
    if (!p) return;

    orbit.enabled = false;
    canvas.classList.add('dragging');
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* noop */ }
    pushUndo();
    selectProp(rec.uid);

    if (kind === 'rotate') {
      const c = rec.obj.position;
      drag = {
        mode: 'propRotate',
        rec,
        pointerId: e.pointerId,
        startAngle: Math.atan2(p.x - c.x, p.z - c.z),
        startRotY: rec.obj.rotation.y,
      };
    } else {
      drag = {
        mode: 'propMove',
        rec,
        pointerId: e.pointerId,
        offset: new THREE.Vector3().subVectors(rec.obj.position, p),
      };
    }
    e.stopPropagation();
    return;
  }

  orbit.enabled = false;
  canvas.classList.add('dragging');
  e.preventDefault();
  try { canvas.setPointerCapture(e.pointerId); } catch { /* noop */ }
  pushUndo();

  const boneName = handle.userData.boneName;
  selectBone(boneName);

  if (handle.userData.isIK && IK_CHAINS[boneName]) {
    const world = handle.getWorldPosition(new THREE.Vector3());
    const camDir = view.camera.getWorldDirection(new THREE.Vector3());
    dragPlane.setFromNormalAndCoplanarPoint(camDir, world);
    raycaster.setFromCamera(pointer, view.camera);
    raycaster.ray.intersectPlane(dragPlane, hitPoint);
    grabOffset.copy(world).sub(hitPoint);
    drag = { mode: 'ik', boneName, pointerId: e.pointerId };
  } else {
    drag = { mode: 'fk', boneName, pointerId: e.pointerId, last: { x: e.clientX, y: e.clientY } };
  }
  e.stopPropagation();
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) {
    // Cursor de "agarrable" cuando el puntero está sobre un manipulador.
    canvas.classList.toggle('over-handle', !!pickHandle(e) || !!pickPropHandle(e));
    return;
  }
  if (e.pointerId !== drag.pointerId) return;

  if (drag.mode === 'propMove' || drag.mode === 'propRotate') {
    const p = groundPoint(e, drag.rec.obj.position.y);
    if (!p) return;
    if (drag.mode === 'propMove') {
      drag.rec.obj.position.x = p.x + drag.offset.x;
      drag.rec.obj.position.z = p.z + drag.offset.z;
    } else {
      const c = drag.rec.obj.position;
      const angle = Math.atan2(p.x - c.x, p.z - c.z);
      let rot = drag.startRotY + (angle - drag.startAngle);
      // Con Shift el giro se engancha de 15 en 15 grados.
      if (e.shiftKey) rot = Math.round(rot / (15 * D2R)) * (15 * D2R);
      drag.rec.obj.rotation.y = rot;
    }
    syncPropRecord(drag.rec);
    updateHud();
    invalidate();
    return;
  }

  if (drag.mode === 'ik') {
    updatePointer(e);
    raycaster.setFromCamera(pointer, view.camera);
    if (!raycaster.ray.intersectPlane(dragPlane, hitPoint)) return;
    const target = hitPoint.clone().add(grabOffset);
    applyIK(man, drag.boneName, target, state.twist);
    if (state.symmetry) {
      const twin = BONE_BY_NAME[drag.boneName]?.mirror;
      if (twin && IK_CHAINS[twin]) {
        const chain = IK_CHAINS[drag.boneName];
        const twinChain = IK_CHAINS[twin];
        const src = man.bones[chain.root];
        const dstRoot = man.bones[twinChain.root];
        const dstMid = man.bones[twinChain.mid];
        dstRoot.rotation.set(src.rotation.x, -src.rotation.y, -src.rotation.z);
        dstMid.rotation.x = man.bones[chain.mid].rotation.x;
      }
    }
  } else {
    const dx = e.clientX - drag.last.x;
    const dy = e.clientY - drag.last.y;
    drag.last = { x: e.clientX, y: e.clientY };
    rotateBoneScreen(drag.boneName, dx, dy);
  }
  syncBoneSliders();
  updateHud();
  invalidate();
});

function endDrag(e) {
  if (!drag) return;
  if (e && e.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
  const id = drag.pointerId;
  drag = null;
  orbit.enabled = true;
  canvas.classList.remove('dragging');
  try { canvas.releasePointerCapture(id); } catch { /* noop */ }
}

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('lostpointercapture', endDrag);
// Si la ventana pierde el foco a mitad de un arrastre no llega el pointerup.
window.addEventListener('blur', () => endDrag());

const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3();
const _camFwd = new THREE.Vector3();
const _pq = new THREE.Quaternion();
const _dq = new THREE.Quaternion();
const _axis = new THREE.Vector3();

/** Rotación tipo trackball: el arrastre en pantalla gira el hueso. */
function rotateBoneScreen(boneName, dx, dy) {
  const bone = man.bones[boneName];
  if (!bone) return;
  view.camera.matrixWorld.extractBasis(_camRight, _camUp, _camFwd);
  bone.parent.getWorldQuaternion(_pq).invert();

  const speed = 0.0085;
  if (dx) {
    _axis.copy(_camUp).applyQuaternion(_pq).normalize();
    _dq.setFromAxisAngle(_axis, -dx * speed);
    bone.quaternion.premultiply(_dq);
  }
  if (dy) {
    _axis.copy(_camRight).applyQuaternion(_pq).normalize();
    _dq.setFromAxisAngle(_axis, -dy * speed);
    bone.quaternion.premultiply(_dq);
  }

  if (state.limits) {
    const e = bone.rotation;
    const c = clampBone(boneName, [e.x * R2D, e.y * R2D, e.z * R2D]);
    bone.rotation.set(c[0] * D2R, c[1] * D2R, c[2] * D2R);
  }
  if (state.symmetry) {
    const twin = BONE_BY_NAME[boneName]?.mirror;
    if (twin) {
      const e = bone.rotation;
      man.bones[twin].rotation.set(e.x, -e.y, -e.z);
    }
  }
}

/* ============================================================ interfaz */

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('on'), 1900);
}

function updateHud() {
  $('#hudPose').textContent = state.poseName || 'Pose libre';
  $('#hudBone').textContent = BONE_BY_NAME[state.selectedBone]?.label || '';
  $('#hudHeight').textContent = `${measureHeight(man).toFixed(2)} m`;
}

/* ------------------------------------------------- biblioteca de poses */

function renderCategoryChips() {
  const box = $('#catChips');
  box.innerHTML = '';
  for (const c of CATEGORIES) {
    const b = document.createElement('button');
    b.className = `chip${state.category === c.id ? ' on' : ''}`;
    b.textContent = c.label;
    b.onclick = () => { state.category = c.id; renderCategoryChips(); renderPoseList(); };
    box.appendChild(b);
  }
}

function renderPoseList() {
  const list = $('#poseList');
  const found = searchPoses(POSES, state.query, state.category);
  $('#poseCount').textContent = String(found.length);
  list.innerHTML = '';
  if (!found.length) {
    list.innerHTML = '<div class="empty">Sin resultados.</div>';
    return;
  }
  for (const p of found) {
    const el = document.createElement('div');
    el.className = `pose-item${state.poseId === p.id ? ' on' : ''}`;
    el.innerHTML = `<span class="nm"></span><span class="ct"></span>`;
    el.querySelector('.nm').textContent = p.name;
    el.querySelector('.ct').textContent = p.cat;
    el.onclick = () => applyPoseById(p.id);
    list.appendChild(el);
  }
}

async function loadUserPoses() {
  state.userPoses = await window.api.poses.list();
  renderUserPoses();
}

function renderUserPoses() {
  const list = $('#userPoseList');
  list.innerHTML = '';
  if (!state.userPoses.length) {
    list.innerHTML = '<div class="empty">Aún no has guardado poses.</div>';
    return;
  }
  for (const p of state.userPoses) {
    const el = document.createElement('div');
    el.className = `pose-item${state.poseName === p.name ? ' on' : ''}`;
    el.innerHTML = `<span class="nm"></span><span class="del" title="Borrar">✕</span>`;
    el.querySelector('.nm').textContent = p.name;
    el.querySelector('.nm').onclick = () => {
      pushUndo();
      state.poseName = p.name;
      state.poseId = p.name;
      applyPose(man, { ...p, snap: false });
      setProps(p.props || []);
      if (p.cam) orbit.set(p.cam);
      $('#poseName').value = p.name;
      syncBoneSliders();
      updateHud();
      renderUserPoses();
      renderPoseList();
      invalidate();
    };
    el.querySelector('.del').onclick = async (ev) => {
      ev.stopPropagation();
      await window.api.poses.remove(p.name);
      toast(`"${p.name}" eliminada`);
      loadUserPoses();
    };
    list.appendChild(el);
  }
}

/* ------------------------------------------------- selector de huesos */

function buildBoneSelect() {
  const sel = $('#boneSelect');
  sel.innerHTML = '';
  for (const g of GROUPS) {
    const og = document.createElement('optgroup');
    og.label = g.label;
    for (const b of BONES.filter((x) => x.group === g.id)) {
      const o = document.createElement('option');
      o.value = b.name;
      o.textContent = b.label;
      og.appendChild(o);
    }
    sel.appendChild(og);
  }
  sel.value = state.selectedBone;
  sel.onchange = () => selectBone(sel.value);
}

const AXES = [
  { key: 'x', label: 'Inclinar (adelante / atrás)', cls: 'axis-x' },
  { key: 'y', label: 'Girar (torsión)', cls: 'axis-y' },
  { key: 'z', label: 'Ladear (izq. / der.)', cls: 'axis-z' },
];

function buildBoneSliders() {
  const box = $('#boneSliders');
  box.innerHTML = '';
  const def = BONE_BY_NAME[state.selectedBone];
  AXES.forEach((ax, i) => {
    const lim = def.limits?.[ax.key] || [-180, 180];
    const wrap = document.createElement('label');
    wrap.className = 'field';
    wrap.innerHTML = `
      <span>${ax.label}</span>
      <input type="range" class="${ax.cls}" data-axis="${i}" min="${lim[0]}" max="${lim[1]}" step="0.5" value="0" />
      <output>0°</output>`;
    const input = wrap.querySelector('input');
    const out = wrap.querySelector('output');
    input.oninput = () => {
      const bone = man.bones[state.selectedBone];
      const cur = [bone.rotation.x * R2D, bone.rotation.y * R2D, bone.rotation.z * R2D];
      cur[i] = parseFloat(input.value);
      setBoneRotation(state.selectedBone, cur);
      out.textContent = `${Math.round(cur[i])}°`;
      updateHud();
    };
    input.onpointerdown = () => pushUndo();
    box.appendChild(wrap);
  });
  syncBoneSliders();
}

function syncBoneSliders() {
  const bone = man.bones[state.selectedBone];
  if (!bone) return;
  const vals = [bone.rotation.x * R2D, bone.rotation.y * R2D, bone.rotation.z * R2D];
  $('#boneSliders').querySelectorAll('input[data-axis]').forEach((inp) => {
    const i = +inp.dataset.axis;
    inp.value = String(vals[i]);
    inp.nextElementSibling.textContent = `${Math.round(vals[i])}°`;
  });
}

function selectBone(name) {
  if (!BONE_BY_NAME[name]) return;
  state.selectedBone = name;
  $('#boneSelect').value = name;
  for (const h of man.handles) {
    const on = h.userData.boneName === name;
    h.material.opacity = on ? 0.95 : (h.userData.isIK ? 0.7 : 0.5);
    h.scale.setScalar(on ? 1.35 : 1);
  }
  buildBoneSliders();
  updateHud();
  invalidate();
}

/* ------------------------------------------------------- proporciones */

function buildBodyTypeSelect() {
  const sel = $('#bodyType');
  sel.innerHTML = '';
  for (const [k, v] of Object.entries(BODY_TYPES)) {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = v.label;
    sel.appendChild(o);
  }
  sel.value = state.bodyType;
  sel.onchange = () => {
    state.bodyType = sel.value;
    const { label, ...rest } = BODY_TYPES[sel.value];
    state.proportions = { ...rest };
    rebuildMannequin();
    buildProportionSliders();
  };
}

const PROP_LABELS_ES = {
  height: 'Estatura',
  head: 'Tamaño de cabeza',
  shoulders: 'Ancho de hombros',
  hips: 'Ancho de cadera',
  limbs: 'Grosor de extremidades',
  torso: 'Largo del torso',
};

function buildProportionSliders() {
  const box = $('#propSliders');
  box.innerHTML = '';
  for (const [key, [lo, hi]] of Object.entries(PROPORTION_RANGES)) {
    const v = state.proportions[key] ?? 1;
    const wrap = document.createElement('label');
    wrap.className = 'field';
    wrap.innerHTML = `
      <span>${PROP_LABELS_ES[key]}</span>
      <input type="range" min="${lo}" max="${hi}" step="0.01" value="${v}" />
      <output>${v.toFixed(2)}×</output>`;
    const input = wrap.querySelector('input');
    const out = wrap.querySelector('output');
    input.oninput = () => {
      state.proportions[key] = parseFloat(input.value);
      out.textContent = `${parseFloat(input.value).toFixed(2)}×`;
      rebuildMannequin();
    };
    box.appendChild(wrap);
  }
}

/** Reconstruye la malla conservando la pose actual. */
function rebuildMannequin() {
  const pose = readPose(man);
  view.scene.remove(man.root);
  man.root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
  man = buildMannequin(state.proportions, state.shading);
  view.scene.add(man.root);
  applyPose(man, { ...pose, snap: false });
  setHandlesVisible(man, $('#showHandles').checked);
  selectBone(state.selectedBone);
  updateHud();
  invalidate();
}

/* -------------------------------------------------------- props de escena */

function buildPropPicker() {
  const sel = $('#propPicker');
  sel.innerHTML = '';
  for (const id of PROP_IDS) {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = PROP_LABELS[id] || id;
    sel.appendChild(o);
  }
}

function renderPropList() {
  const box = $('#propList');
  box.innerHTML = '';
  if (!state.props.length) {
    box.innerHTML = '<div class="empty">Sin objetos en escena.</div>';
    return;
  }
  for (const p of state.props) {
    const el = document.createElement('div');
    el.className = `mini-item${state.selectedProp === p.uid ? ' on' : ''}`;
    el.innerHTML = `<span class="nm"></span><button class="tiny ghost" data-a="c" title="Centrar en el origen">⌖</button><button class="tiny ghost" data-a="z" title="Girar 45°">↺</button><button class="tiny ghost" data-a="x" title="Quitar">✕</button>`;
    el.querySelector('.nm').textContent = PROP_LABELS[p.id] || p.id;
    el.querySelector('.nm').onclick = () => { selectProp(p.uid); renderPropList(); };
    el.querySelector('[data-a="c"]').onclick = () => {
      pushUndo();
      p.obj.position.x = 0;
      p.obj.position.z = 0;
      syncPropRecord(p);
      invalidate();
    };
    el.querySelector('[data-a="z"]').onclick = () => {
      pushUndo();
      p.obj.rotation.y += 45 * D2R;
      syncPropRecord(p);
      invalidate();
    };
    el.querySelector('[data-a="x"]').onclick = () => removeProp(p.uid);
    box.appendChild(el);
  }
}

/* ------------------------------------------------------------- toolbar */

function buildCameraPresets() {
  const box = $('#camPresets');
  box.innerHTML = '';
  for (const p of CAMERA_PRESETS) {
    const b = document.createElement('button');
    b.className = 'tiny ghost';
    b.textContent = p.label;
    b.onclick = () => {
      orbit.set({ theta: p.theta, phi: p.phi, fov: p.fov });
      $('#fov').value = String(p.fov);
      $('#fovOut').textContent = `${p.fov}°`;
      invalidate();
    };
    box.appendChild(b);
  }
}

function buildShadingSelect() {
  const sel = $('#shading');
  sel.innerHTML = '';
  for (const k of Object.keys(SHADING)) {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = SHADING_LABELS[k] || k;
    sel.appendChild(o);
  }
  sel.value = state.shading;
  sel.onchange = () => {
    state.shading = sel.value;
    setShading(man, sel.value);
    invalidate();
  };
}

/* ============================================================ acciones */

function actionMirror() {
  pushUndo();
  const mirrored = mirrorBones(currentBonesFull(), BONE_BY_NAME);
  for (const [name, rot] of Object.entries(mirrored)) {
    setBoneRotation(name, rot, { mirror: false });
  }
  man.root.rotation.y *= -1;
  man.root.position.x *= -1;
  syncBoneSliders();
  invalidate();
  toast('Pose reflejada');
}

function actionNaturalize() {
  pushUndo();
  const jittered = naturalize(currentBonesFull(), state.natAmount);
  for (const [name, rot] of Object.entries(jittered)) {
    setBoneRotation(name, rot, { mirror: false });
  }
  snapToGround(man);
  syncBoneSliders();
  invalidate();
  toast('Micro-variaciones aplicadas');
}

function actionGround() {
  pushUndo();
  snapToGround(man);
  invalidate();
  toast('Apoyado en el suelo');
}

async function actionSavePose() {
  const name = $('#poseName').value.trim();
  if (!name) return toast('Escribe un nombre para la pose');
  const pose = readPose(man, { name, id: name, cat: 'mis', tags: ['personalizada'] });
  pose.props = state.props.map(serializeProp);
  pose.cam = orbit.state;
  const res = await window.api.poses.save(pose);
  if (!res.ok) return toast(res.error || 'No se pudo guardar');
  state.poseName = name;
  toast(`Guardada: ${name}`);
  loadUserPoses();
}

/**
 * Captura sin manipuladores. Los puntos de color son ayudas de edición: en una
 * lámina de referencia sobran, y antes salían impresos en el PNG.
 */
function snapshotClean(opts) {
  const wereOn = propGizmosOn();
  setHandlesVisible(man, false);
  setPropGizmosVisible(view.propsGroup, false);
  try {
    return view.snapshot(opts);
  } finally {
    setHandlesVisible(man, wereOn);
    setPropGizmosVisible(view.propsGroup, wereOn);
    invalidate();
  }
}

async function actionExportPng() {
  const url = snapshotClean({ transparent: $('#pngTransparent').checked, scale: 2 });
  const base = (state.poseName || 'pose').replace(/[^\w\-áéíóúñü ]+/gi, '').trim() || 'pose';
  const res = await window.api.image.save(url, `${base}.png`);
  if (res.ok) toast('PNG guardado');
  else if (!res.canceled) toast('No se pudo guardar el PNG');
}

async function actionCopyImage() {
  const url = snapshotClean({ transparent: false, scale: 2 });
  await window.api.image.toClipboard(url);
  toast('Imagen copiada al portapapeles');
}

/* ======================================================== cableado UI */

function wire() {
  $('#poseSearch').oninput = (e) => { state.query = e.target.value; renderPoseList(); };

  $('#fov').oninput = (e) => {
    const v = +e.target.value;
    view.camera.fov = v;
    view.camera.updateProjectionMatrix();
    $('#fovOut').textContent = `${v}°`;
    invalidate();
  };

  $('#background').onchange = (e) => { view.setBackground(e.target.value); invalidate(); };
  $('#showGrid').onchange = (e) => { view.setGridVisible(e.target.checked); invalidate(); };
  $('#showShadow').onchange = (e) => { view.setShadowsEnabled(e.target.checked); invalidate(); };
  $('#showHandles').onchange = (e) => {
    setHandlesVisible(man, e.target.checked);
    setPropGizmosVisible(view.propsGroup, e.target.checked);
    invalidate();
  };

  $('#lightAngle').oninput = (e) => {
    view.setLightAngle(+e.target.value);
    $('#lightOut').textContent = `${e.target.value}°`;
    invalidate();
  };

  $('#symmetry').onchange = (e) => { state.symmetry = e.target.checked; };
  $('#limits').onchange = (e) => { state.limits = e.target.checked; };

  $('#twist').oninput = (e) => {
    state.twist = +e.target.value;
    $('#twistOut').textContent = `${e.target.value}°`;
  };

  $('#natAmount').oninput = (e) => {
    state.natAmount = e.target.value / 100;
    $('#natOut').textContent = `${e.target.value}%`;
  };

  $('#btnBoneReset').onclick = () => {
    pushUndo();
    setBoneRotation(state.selectedBone, [0, 0, 0]);
    syncBoneSliders();
  };

  $('#btnAddProp').onclick = () => {
    pushUndo();
    addProp({ id: $('#propPicker').value, pos: [0, 0, 0.55], rot: [0, 0, 0], scale: 1 });
    renderPropList();
    invalidate();
  };

  $('#btnMirror').onclick = actionMirror;
  $('#btnNaturalize').onclick = actionNaturalize;
  $('#btnGround').onclick = actionGround;
  $('#btnReset').onclick = () => applyPoseById('neutral');
  $('#btnUndo').onclick = undo;
  $('#btnRedo').onclick = redo;
  $('#btnSavePose').onclick = actionSavePose;
  $('#btnPng').onclick = actionExportPng;
  $('#btnCopy').onclick = actionCopyImage;
  $('#btnFolder').onclick = () => window.api.revealPosesFolder();

  $('#btnExportAll').onclick = async () => {
    if (!state.userPoses.length) return toast('No hay poses propias que exportar');
    const res = await window.api.poses.exportFile(state.userPoses);
    if (res.ok) toast('Poses exportadas');
  };

  $('#btnImport').onclick = async () => {
    const res = await window.api.poses.importFile();
    if (res.ok) { toast(`Importadas (${res.count} en total)`); loadUserPoses(); }
    else if (res.error) toast(res.error);
  };

  window.addEventListener('keydown', (e) => {
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    if (typing) return;
    const k = e.key.toLowerCase();
    if (e.ctrlKey && k === 'z') { e.preventDefault(); undo(); return; }
    if (e.ctrlKey && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
    if (k === 'h') { const c = $('#showHandles'); c.checked = !c.checked; c.onchange({ target: c }); }
    if (k === 'g') { const c = $('#showGrid'); c.checked = !c.checked; c.onchange({ target: c }); }
    if (k === 'n') actionNaturalize();
    if (k === 'm') actionMirror();
    if (k === 'f') actionGround();
    if (k === 'e') actionExportPng();
  });
}

/* =============================================================== inicio */

function init() {
  renderCategoryChips();
  renderPoseList();
  buildBoneSelect();
  buildBoneSliders();
  buildBodyTypeSelect();
  buildProportionSliders();
  buildPropPicker();
  buildCameraPresets();
  buildShadingSelect();
  renderPropList();
  wire();

  view.setLightAngle(40);
  applyPoseById('reposo_natural', { record: false });
  // Sincroniza los manipuladores con la casilla: si no, el estado visible del
  // maniquí y el de la interfaz pueden salir desalineados al arrancar.
  setHandlesVisible(man, $('#showHandles').checked);
  setPropGizmosVisible(view.propsGroup, $('#showHandles').checked);
  selectBone('chest');
  loadUserPoses();
  view.resize();
  invalidate();
}

init();

// Expuesto para depuración manual desde DevTools (npm run dev)
window.__studio = { state, man, view, orbit, applyPoseById, THREE };
