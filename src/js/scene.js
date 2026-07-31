import * as THREE from '../vendor/three.module.js';

/**
 * Escena, luces, suelo y render. Todo lo que no es ni el maniquí ni la UI.
 */
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true, // necesario para exportar PNG
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1b1e26);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);

  /* ------------------------------------------------------------- luces */
  const ambient = new THREE.AmbientLight(0xffffff, 0.42);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xfff2e0, 1.55);
  key.position.set(2.6, 4.2, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 18;
  const s = 2.6;
  key.shadow.camera.left = -s;
  key.shadow.camera.right = s;
  key.shadow.camera.top = s;
  key.shadow.camera.bottom = -s;
  key.shadow.bias = -0.0012;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  scene.add(key.target);

  const fill = new THREE.DirectionalLight(0xc8dcff, 0.45);
  fill.position.set(-3.2, 1.8, 1.4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.85);
  rim.position.set(-1.4, 2.4, -3.6);
  scene.add(rim);

  /* -------------------------------------------------------- suelo/grid */
  const groundGeo = new THREE.PlaneGeometry(40, 40);
  const ground = new THREE.Mesh(groundGeo, new THREE.ShadowMaterial({ opacity: 0.34 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(20, 40, 0x4a5568, 0x2b3038);
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  scene.add(grid);

  // Ejes de referencia sutiles (rojo = X, azul = Z hacia el frente)
  const axes = new THREE.Group();
  const mkLine = (from, to, color) => {
    const g = new THREE.BufferGeometry().setFromPoints([from, to]);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 }));
  };
  axes.add(mkLine(new THREE.Vector3(-2, 0.002, 0), new THREE.Vector3(2, 0.002, 0), 0xd76a6a));
  axes.add(mkLine(new THREE.Vector3(0, 0.002, -2), new THREE.Vector3(0, 0.002, 2), 0x6a97d7));
  scene.add(axes);

  const propsGroup = new THREE.Group();
  propsGroup.name = 'props';
  scene.add(propsGroup);

  /* ------------------------------------------------------------ tamaño */
  function resize() {
    const parent = canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /** Ángulo de la luz principal en grados alrededor del personaje. */
  function setLightAngle(azDeg, elevDeg = 46) {
    const a = (azDeg * Math.PI) / 180;
    const e = (elevDeg * Math.PI) / 180;
    const r = 5;
    key.position.set(r * Math.cos(e) * Math.sin(a), r * Math.sin(e), r * Math.cos(e) * Math.cos(a));
    key.target.position.set(0, 0.9, 0);
    key.target.updateMatrixWorld();
  }

  function setBackground(mode) {
    if (mode === 'transparente') scene.background = null;
    else if (mode === 'blanco') scene.background = new THREE.Color(0xf2f2f2);
    else scene.background = new THREE.Color(0x1b1e26);
  }

  function setGridVisible(v) {
    grid.visible = v;
    axes.visible = v;
  }

  function setShadowsEnabled(v) {
    renderer.shadowMap.enabled = v;
    ground.visible = v;
    key.castShadow = v;
  }

  function render() {
    renderer.render(scene, camera);
  }

  /**
   * Captura la vista como PNG.
   * @param {{transparent?:boolean, scale?:number}} opts
   */
  function snapshot({ transparent = false, scale = 2 } = {}) {
    const prevBg = scene.background;
    const prevGrid = grid.visible;
    const prevAxes = axes.visible;
    const prevSize = new THREE.Vector2();
    renderer.getSize(prevSize);
    const prevRatio = renderer.getPixelRatio();

    if (transparent) {
      scene.background = null;
      grid.visible = false;
      axes.visible = false;
      ground.visible = false;
    }
    renderer.setPixelRatio(scale);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');

    scene.background = prevBg;
    grid.visible = prevGrid;
    axes.visible = prevAxes;
    ground.visible = renderer.shadowMap.enabled;
    renderer.setPixelRatio(prevRatio);
    renderer.setSize(prevSize.x, prevSize.y, false);
    renderer.render(scene, camera);
    return url;
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    renderer, scene, camera, propsGroup, ground, grid, axes,
    lights: { ambient, key, fill, rim },
    resize, render, snapshot, setLightAngle, setBackground, setGridVisible, setShadowsEnabled,
  };
}
