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
    this.zoomSpeed = 0.0012;

    /**
     * Se invoca cada vez que la cámara cambia. El bucle de render es "bajo
     * demanda" (solo pinta cuando algo se movió), así que sin esto la cámara
     * se movía de verdad pero la pantalla no se repintaba nunca: el arrastre
     * parecía no hacer nada en absoluto.
     * @type {null | (() => void)}
     */
    this.onChange = null;

    this._dragging = null;   // 'orbit' | 'pan'
    this._pointerId = null;  // puntero que inició el arrastre
    this._last = { x: 0, y: 0 };
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._fwd = new THREE.Vector3();

    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onContext = (e) => e.preventDefault();
    // Si la ventana pierde el foco mientras arrastras, el pointerup nunca
    // llega: sin esto la cámara se queda girando sola.
    this._onBlur = () => this._stop();

    this.dom.addEventListener('pointerdown', this._onDown);
    this.dom.addEventListener('pointermove', this._onMove);
    this.dom.addEventListener('pointerup', this._onUp);
    this.dom.addEventListener('pointercancel', this._onUp);
    this.dom.addEventListener('lostpointercapture', this._onUp);
    this.dom.addEventListener('wheel', this._onWheel, { passive: false });
    this.dom.addEventListener('contextmenu', this._onContext);
    window.addEventListener('blur', this._onBlur);

    this.update();
  }

  dispose() {
    this.dom.removeEventListener('pointerdown', this._onDown);
    this.dom.removeEventListener('pointermove', this._onMove);
    this.dom.removeEventListener('pointerup', this._onUp);
    this.dom.removeEventListener('pointercancel', this._onUp);
    this.dom.removeEventListener('lostpointercapture', this._onUp);
    this.dom.removeEventListener('wheel', this._onWheel);
    this.dom.removeEventListener('contextmenu', this._onContext);
    window.removeEventListener('blur', this._onBlur);
  }

  /** Corta cualquier arrastre en curso y suelta la captura del puntero. */
  _stop() {
    if (this._pointerId !== null) {
      try { this.dom.releasePointerCapture(this._pointerId); } catch { /* noop */ }
    }
    this._dragging = null;
    this._pointerId = null;
  }

  _onDown(e) {
    if (!this.enabled) return;
    if (this._dragging) return;            // ya hay un botón pulsado

    if (e.button === 0) this._dragging = e.shiftKey ? 'pan' : 'orbit';
    else if (e.button === 1 || e.button === 2) this._dragging = 'pan';
    else return;

    this._pointerId = e.pointerId;
    this._last = { x: e.clientX, y: e.clientY };
    // Evita el autoscroll del botón central y el drag nativo de selección.
    e.preventDefault();
    try { this.dom.setPointerCapture(e.pointerId); } catch { /* noop */ }
  }

  _onMove(e) {
    if (!this._dragging || e.pointerId !== this._pointerId) return;
    if (!this.enabled) { this._stop(); return; }

    const dx = e.clientX - this._last.x;
    const dy = e.clientY - this._last.y;
    if (dx === 0 && dy === 0) return;
    this._last = { x: e.clientX, y: e.clientY };

    if (this._dragging === 'orbit') {
      this.theta -= dx * this.rotateSpeed;
      // Mantiene theta acotado para que no crezca sin límite.
      this.theta = ((this.theta % 360) + 360) % 360;
      this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi - dy * this.rotateSpeed));
    } else {
      // Unidades de mundo por píxel: así el desplazamiento sigue al cursor
      // con exactitud sea cual sea la distancia o el ángulo de lente.
      const h = this.dom.clientHeight || 1;
      const scale = (2 * this.dist * Math.tan((this.camera.fov * D2R) / 2)) / h;
      this.camera.matrixWorld.extractBasis(this._right, this._up, this._fwd);
      this.target.addScaledVector(this._right, -dx * scale);
      this.target.addScaledVector(this._up, dy * scale);
    }
    this.update();
  }

  _onUp(e) {
    if (e && e.pointerId !== undefined && e.pointerId !== this._pointerId) return;
    this._stop();
  }

  _onWheel(e) {
    if (!this.enabled) return;
    e.preventDefault();
    // deltaMode: 0 = píxeles, 1 = líneas, 2 = páginas. Algunos ratones de
    // Windows reportan líneas (deltaY ≈ 3) y sin normalizar el zoom no se nota.
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? (this.dom.clientHeight || 800) : 1;
    // Acotado para que un golpe de rueda o un trackpad brusco no dispare el zoom.
    const delta = Math.max(-240, Math.min(240, e.deltaY * unit));
    const factor = Math.exp(delta * this.zoomSpeed);
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
    if (this.onChange) this.onChange();
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
