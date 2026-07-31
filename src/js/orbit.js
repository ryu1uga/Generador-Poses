import * as THREE from '../vendor/three.module.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/**
 * Cámara orbital mínima, escrita a mano para no depender de los addons de
 * three.js (que complicarían el empaquetado sin bundler).
 *
 *   theta = azimut en grados (0 = frente del personaje)
 *   phi   = elevación en grados (positivo = cámara arriba / picado,
 *                                negativo = cámara abajo / contrapicado)
 */
export class OrbitCamera {
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;

    this.target = new THREE.Vector3(0, 0.95, 0);
    this.theta = 18;
    this.phi = 6;
    this.dist = 3.3;

    this.minDist = 0.5;
    this.maxDist = 14;
    this.minPhi = -85;
    this.maxPhi = 85;

    this.enabled = true;
    this.rotateSpeed = 0.42;
    this.panSpeed = 0.0022;

    this._dragging = null; // 'orbit' | 'pan'
    this._last = { x: 0, y: 0 };

    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onContext = (e) => e.preventDefault();

    this.dom.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
    this.dom.addEventListener('wheel', this._onWheel, { passive: false });
    this.dom.addEventListener('contextmenu', this._onContext);

    this.update();
  }

  dispose() {
    this.dom.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    this.dom.removeEventListener('wheel', this._onWheel);
    this.dom.removeEventListener('contextmenu', this._onContext);
  }

  _onDown(e) {
    if (!this.enabled) return;
    if (e.button === 0) this._dragging = 'orbit';
    else if (e.button === 1 || e.button === 2) this._dragging = 'pan';
    this._last = { x: e.clientX, y: e.clientY };
  }

  _onMove(e) {
    if (!this._dragging) return;
    const dx = e.clientX - this._last.x;
    const dy = e.clientY - this._last.y;
    this._last = { x: e.clientX, y: e.clientY };

    if (this._dragging === 'orbit') {
      this.theta -= dx * this.rotateSpeed;
      this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi - dy * this.rotateSpeed));
    } else {
      const scale = this.dist * this.panSpeed;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      this.camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
      this.target.addScaledVector(right, -dx * scale);
      this.target.addScaledVector(up, dy * scale);
    }
    this.update();
  }

  _onUp() { this._dragging = null; }

  _onWheel(e) {
    if (!this.enabled) return;
    e.preventDefault();
    const factor = Math.exp(e.deltaY * 0.0012);
    this.dist = Math.max(this.minDist, Math.min(this.maxDist, this.dist * factor));
    this.update();
  }

  /** Recalcula la posición de la cámara a partir de theta/phi/dist. */
  update() {
    const t = this.theta * D2R;
    const p = this.phi * D2R;
    const cp = Math.cos(p);
    this.camera.position.set(
      this.target.x + this.dist * cp * Math.sin(t),
      this.target.y + this.dist * Math.sin(p),
      this.target.z + this.dist * cp * Math.cos(t),
    );
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }

  /** Aplica un preset de cámara (el que trae cada pose). */
  set({ theta, phi, dist, targetY, target, fov }) {
    if (theta !== undefined) this.theta = theta;
    if (phi !== undefined) this.phi = phi;
    if (dist !== undefined) this.dist = dist;
    if (targetY !== undefined) this.target.set(0, targetY, 0);
    if (target) this.target.set(target[0], target[1], target[2]);
    if (fov !== undefined && this.camera.isPerspectiveCamera) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.update();
  }

  get state() {
    return {
      theta: +this.theta.toFixed(1),
      phi: +this.phi.toFixed(1),
      dist: +this.dist.toFixed(2),
      target: [this.target.x, this.target.y, this.target.z],
      fov: this.camera.fov,
    };
  }
}

/** Encuadres típicos de viñeta de manga. */
export const CAMERA_PRESETS = [
  { id: 'frente', label: 'Frente', theta: 0, phi: 4, fov: 40 },
  { id: 'tresCuartos', label: '3/4', theta: 35, phi: 4, fov: 40 },
  { id: 'perfil', label: 'Perfil', theta: 90, phi: 2, fov: 40 },
  { id: 'espalda', label: 'Espalda', theta: 180, phi: 4, fov: 40 },
  { id: 'contrapicado', label: 'Contrapicado', theta: 22, phi: -32, fov: 30 },
  { id: 'picado', label: 'Picado', theta: 22, phi: 40, fov: 34 },
  { id: 'gusano', label: 'Ojo de gusano', theta: 14, phi: -68, fov: 22 },
  { id: 'cenital', label: 'Cenital', theta: 0, phi: 78, fov: 34 },
  { id: 'escorzoExtremo', label: 'Escorzo extremo', theta: 8, phi: -14, fov: 16 },
  { id: 'isometrico', label: 'Ortográfico-ish', theta: 35, phi: 20, fov: 78 },
];

export { D2R, R2D };
