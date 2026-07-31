/**
 * Pruebas del maniquí "sin pantalla": construyen el esqueleto real con three.js
 * y comprueban la geometría. No se crea ningún WebGLRenderer, así que corren en
 * Node normal.
 *
 * Requieren src/vendor/three.module.js  (npm install  o  npm run vendor).
 * Si no está, las pruebas se saltan en lugar de fallar.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const vendor = fileURLToPath(new URL('../src/vendor/three.module.js', import.meta.url));
const hayThree = existsSync(vendor);

const skip = hayThree ? false : 'falta src/vendor/three.module.js (ejecuta: npm run vendor)';

describe('Maniquí 3D', { skip }, async () => {
  if (!hayThree) return;

  const { POSES } = await import('../src/js/poses.js');
  const { BODY_TYPES, IK_CHAINS } = await import('../src/js/skeleton-def.js');
  const {
    buildMannequin, applyPose, readPose, applyIK, snapToGround,
    measureHeight, chainLengths, DEFAULT_PROPORTIONS,
  } = await import('../src/js/mannequin.js');
  const THREE = await import('../src/vendor/three.module.js');

  const nuevo = (props) => buildMannequin({ ...DEFAULT_PROPORTIONS, ...props });

  test('el esqueleto se construye con todos sus huesos', () => {
    const m = nuevo();
    assert.equal(Object.keys(m.bones).length, 19);
    assert.equal(m.handles.length, 19);
    assert.ok(m.bodyMeshes.length > 19, 'debería haber al menos una malla por hueso');
  });

  test('la estatura base ronda 1.75 m', () => {
    const h = measureHeight(nuevo());
    assert.ok(h > 1.6 && h < 1.9, `estatura medida: ${h.toFixed(3)} m`);
  });

  test('cada tipo de cuerpo da una estatura coherente con su factor', () => {
    const base = measureHeight(nuevo());
    for (const [key, body] of Object.entries(BODY_TYPES)) {
      const { label, ...p } = body;
      const h = measureHeight(nuevo(p));
      assert.ok(h > 0.4, `${key}: estatura degenerada (${h})`);
      if (key !== 'chibi' && key !== 'nino') {
        assert.ok(Math.abs(h - base * p.height) < 0.25,
          `${key}: ${h.toFixed(2)} m no encaja con el factor ${p.height}`);
      }
    }
    // El chibi debe tener la cabeza proporcionalmente enorme
    const { label, ...chibi } = BODY_TYPES.chibi;
    assert.ok(measureHeight(nuevo(chibi)) < base, 'el chibi debe ser más bajo');
  });

  test('todas las poses de la biblioteca se aplican sin NaN', () => {
    const m = nuevo();
    for (const pose of POSES) {
      applyPose(m, pose);
      m.root.updateMatrixWorld(true);
      for (const [name, bone] of Object.entries(m.bones)) {
        const p = bone.getWorldPosition(new THREE.Vector3());
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z),
          `${pose.id}: posición inválida en ${name}`);
      }
    }
  });

  test('ninguna pose deja el cuerpo hundido bajo el suelo', () => {
    const m = nuevo();
    const problemas = [];
    for (const pose of POSES) {
      applyPose(m, pose);
      m.root.updateMatrixWorld(true);
      const caja = new THREE.Box3();
      const tmp = new THREE.Box3();
      let first = true;
      for (const mesh of m.bodyMeshes) {
        tmp.setFromObject(mesh);
        if (first) { caja.copy(tmp); first = false; } else caja.union(tmp);
      }
      if (caja.min.y < -0.02) problemas.push(`${pose.id}: ${caja.min.y.toFixed(3)} m`);
    }
    assert.deepEqual(problemas, [],
      `Poses que atraviesan el suelo:\n${problemas.join('\n')}`);
  });

  test('las poses "de pie" mantienen la cabeza por encima de la cadera', () => {
    const m = nuevo();
    const dePie = ['neutral', 'reposo_natural', 'caminando', 'senalando', 'cargando_caja'];
    for (const id of dePie) {
      applyPose(m, POSES.find((p) => p.id === id));
      m.root.updateMatrixWorld(true);
      const cabeza = m.bones.head.getWorldPosition(new THREE.Vector3());
      const cadera = m.bones.hips.getWorldPosition(new THREE.Vector3());
      assert.ok(cabeza.y > cadera.y + 0.35, `${id}: la cabeza queda demasiado baja`);
    }
  });

  test('apoyar en el suelo deja el punto más bajo en y = 0', () => {
    const m = nuevo();
    applyPose(m, { root: { pos: [0, 2.4, 0], rot: [0, 0, 0] }, bones: {}, snap: false });
    snapToGround(m);
    m.root.updateMatrixWorld(true);
    const caja = new THREE.Box3();
    const tmp = new THREE.Box3();
    let first = true;
    for (const mesh of m.bodyMeshes) {
      tmp.setFromObject(mesh);
      if (first) { caja.copy(tmp); first = false; } else caja.union(tmp);
    }
    assert.ok(Math.abs(caja.min.y) < 1e-6, `punto más bajo en ${caja.min.y}`);
  });

  test('la IK lleva la mano o el pie al objetivo pedido', () => {
    const m = nuevo();
    applyPose(m, { root: { pos: [0, 0.95, 0], rot: [0, 0, 0] }, bones: {}, snap: false });
    for (const efector of Object.keys(IK_CHAINS)) {
      const { total } = chainLengths(m, efector);
      const raiz = m.bones[IK_CHAINS[efector].root].getWorldPosition(new THREE.Vector3());
      // Varios objetivos dentro del alcance, en distintas direcciones
      const objetivos = [
        raiz.clone().add(new THREE.Vector3(0, -total * 0.7, total * 0.3)),
        raiz.clone().add(new THREE.Vector3(total * 0.4, 0.1, total * 0.4)),
        raiz.clone().add(new THREE.Vector3(-total * 0.3, total * 0.5, 0.05)),
        raiz.clone().add(new THREE.Vector3(0.02, -total * 0.35, -total * 0.2)),
      ];
      for (const objetivo of objetivos) {
        const alcanzable = applyIK(m, efector, objetivo, 0);
        assert.equal(alcanzable, true, `${efector}: debería alcanzar`);
        m.root.updateMatrixWorld(true);
        const logrado = m.bones[efector].getWorldPosition(new THREE.Vector3());
        const err = logrado.distanceTo(objetivo);
        assert.ok(err < 0.004, `${efector}: error de ${(err * 1000).toFixed(1)} mm`);
      }
    }
  });

  test('la IK no rompe nada cuando el objetivo está fuera de alcance', () => {
    const m = nuevo();
    applyPose(m, { root: { pos: [0, 0.95, 0], rot: [0, 0, 0] }, bones: {}, snap: false });
    const alcanzable = applyIK(m, 'hand_L', new THREE.Vector3(9, 9, 9), 0);
    assert.equal(alcanzable, false);
    m.root.updateMatrixWorld(true);
    const p = m.bones.hand_L.getWorldPosition(new THREE.Vector3());
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
  });

  test('el giro de codo/rodilla cambia la pose pero no la posición de la mano', () => {
    const m = nuevo();
    applyPose(m, { root: { pos: [0, 0.95, 0], rot: [0, 0, 0] }, bones: {}, snap: false });
    const raiz = m.bones.upperArm_L.getWorldPosition(new THREE.Vector3());
    const objetivo = raiz.clone().add(new THREE.Vector3(0.1, -0.3, 0.25));

    applyIK(m, 'hand_L', objetivo, 0);
    m.root.updateMatrixWorld(true);
    const codoA = m.bones.foreArm_L.getWorldPosition(new THREE.Vector3());

    applyIK(m, 'hand_L', objetivo, 70);
    m.root.updateMatrixWorld(true);
    const codoB = m.bones.foreArm_L.getWorldPosition(new THREE.Vector3());
    const mano = m.bones.hand_L.getWorldPosition(new THREE.Vector3());

    assert.ok(codoA.distanceTo(codoB) > 0.03, 'el codo debería haberse movido');
    assert.ok(mano.distanceTo(objetivo) < 0.004, 'la mano no debería moverse');
  });

  test('readPose y applyPose son reversibles', () => {
    const m = nuevo();
    const original = POSES.find((p) => p.id === 'acariciar_gato');
    applyPose(m, original);
    const leida = readPose(m, { name: 'ida y vuelta' });

    const m2 = nuevo();
    applyPose(m2, leida);
    m.root.updateMatrixWorld(true);
    m2.root.updateMatrixWorld(true);

    for (const name of Object.keys(m.bones)) {
      const a = m.bones[name].getWorldPosition(new THREE.Vector3());
      const b = m2.bones[name].getWorldPosition(new THREE.Vector3());
      assert.ok(a.distanceTo(b) < 0.002, `${name} no coincide tras el ida y vuelta`);
    }
  });

  test('las poses con silla o taburete apoyan la cadera sobre el asiento', () => {
    const m = nuevo();
    const casos = { silla_codos_rodillas: 0.45, bostezo_silla: 0.45, taburete_encogido: 0.6 };
    for (const [id, alturaAsiento] of Object.entries(casos)) {
      applyPose(m, POSES.find((p) => p.id === id));
      m.root.updateMatrixWorld(true);
      const cadera = m.bones.hips.getWorldPosition(new THREE.Vector3());
      assert.ok(Math.abs(cadera.y - (alturaAsiento + 0.06)) < 0.12,
        `${id}: cadera a ${cadera.y.toFixed(2)} m, asiento a ${alturaAsiento} m`);
    }
  });
});
