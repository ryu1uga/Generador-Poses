/**
 * Se carga ANTES que app.js.
 *
 * Si algo falla durante el arranque —WebGL no disponible, un módulo que no
 * resuelve, la CSP bloqueando un recurso— app.js deja de ejecutarse y con él
 * se pierden todos los listeners: la ventana se ve bien (el HTML es estático)
 * pero el ratón no hace absolutamente nada. Eso es indistinguible de un bug
 * de controles, así que aquí lo sacamos a la vista.
 */

let box = null;

function panel() {
  if (box) return box;
  box = document.createElement('div');
  box.setAttribute('style', [
    'position:fixed', 'inset:auto 16px 16px 16px', 'z-index:9999',
    'max-height:44vh', 'overflow:auto',
    'background:#2b1d1f', 'border:1px solid #a05252', 'border-radius:8px',
    'padding:12px 14px', 'color:#ffd9d9',
    'font:12px/1.5 Consolas,monospace', 'white-space:pre-wrap',
    'user-select:text', 'box-shadow:0 8px 28px #0009',
  ].join(';'));
  const close = document.createElement('button');
  close.textContent = '✕';
  close.setAttribute('style', 'float:right;background:transparent;border:0;color:#ffd9d9;cursor:pointer;font-size:14px');
  close.onclick = () => box.remove();
  box.appendChild(close);
  (document.body || document.documentElement).appendChild(box);
  return box;
}

function show(title, detail) {
  const el = panel();
  const p = document.createElement('div');
  const h = document.createElement('b');
  h.textContent = title;
  h.setAttribute('style', 'color:#ff9a9a');
  p.appendChild(h);
  p.appendChild(document.createTextNode(`\n${detail}\n`));
  el.appendChild(p);
  // También al terminal de `npm start`.
  console.error(`[boot] ${title}\n${detail}`);
}

window.addEventListener('error', (e) => {
  const where = e.filename ? `${e.filename.split('/').pop()}:${e.lineno}:${e.colno}` : '';
  show('Error al iniciar', `${e.message}\n${where}\n${e.error?.stack || ''}`.trim());
});

window.addEventListener('unhandledrejection', (e) => {
  show('Promesa rechazada', String(e.reason?.stack || e.reason));
});

/* WebGL es la causa más habitual de que la vista 3D quede en blanco y los
   controles parezcan muertos: sin contexto, el renderer de three.js lanza una
   excepción y app.js muere en su primera línea útil. */
try {
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2') || probe.getContext('webgl');
  if (!gl) {
    show(
      'WebGL no disponible',
      'El proceso de renderizado no ha podido crear un contexto WebGL, así que\n'
      + 'la escena 3D no arranca y ningún control del visor responde.\n\n'
      + 'Prueba a lanzar la app con la aceleración por software:\n'
      + '  npx electron . --use-angle=swiftshader\n'
      + 'o actualiza los controladores de la tarjeta gráfica.',
    );
  }
} catch (err) {
  show('No se pudo comprobar WebGL', String(err));
}

/* Si app.js no llega al final del arranque, avisamos: sin esto el síntoma es
   simplemente "el ratón no hace nada". */
window.setTimeout(() => {
  if (!window.__studio) {
    show(
      'La interfaz 3D no terminó de arrancar',
      'app.js no llegó a registrarse. Mira los errores de arriba o abre las\n'
      + 'herramientas de desarrollo con `npm run dev` para ver la consola.',
    );
  }
}, 4000);
