# Manga Pose Studio

Maniquí 3D articulado para sacar referencias de dibujo manga. Está pensado para
poses **fuera de lo convencional** — una pierna sobre la mesa, agacharse a
acariciar un gato, encaramarse en una caja — con objetos de escena que dan
contexto y escala, para que la referencia no se vea flotando ni artificial.

---

## Índice

1. [Qué necesitas instalar](#1-qué-necesitas-instalar)
2. [Poner en marcha el proyecto](#2-poner-en-marcha-el-proyecto)
3. [Cómo ejecutar los tests](#3-cómo-ejecutar-los-tests)
4. [Generar el instalable .exe](#4-generar-el-instalable-exe)
5. [Cómo se usa la app](#5-cómo-se-usa-la-app)
6. [Estructura del código](#6-estructura-del-código)
7. [Añadir tus propias poses al código](#7-añadir-tus-propias-poses-al-código)
8. [Problemas frecuentes](#8-problemas-frecuentes)

---

## 1. Qué necesitas instalar

Solo una cosa: **Node.js 20 o superior** (trae `npm` incluido).

1. Entra en <https://nodejs.org> y descarga la versión **LTS** para Windows (`.msi`).
2. Instálala con las opciones por defecto (deja marcada la casilla de "Add to PATH").
3. Cierra VS Code **por completo** y vuelve a abrirlo, para que reconozca el nuevo PATH.
4. Comprueba que funcionó: en VS Code abre la terminal con `Ctrl + ñ`
   (o menú **Terminal → New Terminal**) y escribe:

   ```powershell
   node --version
   npm --version
   ```

   Debe responder algo como `v22.x.x` y `10.x.x`. Si dice *"no se reconoce el
   comando"*, no se añadió al PATH: reinstala marcando esa casilla, o reinicia
   Windows.

> No hace falta Git, ni Python, ni Visual Studio Build Tools. El proyecto no
> compila nada nativo.

---

## 2. Poner en marcha el proyecto

Abre la carpeta del proyecto en VS Code (**Archivo → Abrir carpeta…** y elige
`Generador de poses`). Después, en la terminal integrada:

```powershell
npm install     # solo la primera vez (tarda 1-3 min, descarga Electron)
npm start       # abre la app
```

`npm install` hace tres cosas: descarga Electron, descarga three.js y copia
`three.module.js` a `src/vendor/` (eso último lo hace el script `postinstall`).

### Si prefieres no escribir comandos

El proyecto trae tareas listas en VS Code:

- `Ctrl + Shift + P` → escribe **Run Task** → Enter
- Aparece la lista numerada:
  1. Instalar dependencias
  2. Ejecutar la app
  3. Pasar los tests
  4. Generar el instalable .exe

### Depurar con puntos de interrupción

Pulsa **F5** (o pestaña *Run and Debug* → **Electron: main + renderer**). Se
abre la app con DevTools y puedes poner breakpoints tanto en `main.cjs` como en
los archivos de `src/js/`.

### Todos los comandos disponibles

| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias y prepara `src/vendor/` |
| `npm start` | Abre la app |
| `npm run dev` | Abre la app con DevTools desplegadas |
| `npm test` | Ejecuta toda la batería de pruebas |
| `npm run test:watch` | Repite los tests al guardar cualquier archivo |
| `npm run vendor` | Vuelve a copiar three.js a `src/vendor/` |
| `npm run fix:electron` | Repara una instalación de Electron a medias |
| `npm run fix:electron:manual` | Igual, pero descargando el binario a mano (plan B) |
| `npm run pack` | Empaqueta sin instalador (para probar rápido) |
| `npm run dist` | Genera el instalador `.exe` **y** la versión portable |
| `npm run dist:portable` | Genera solo el `.exe` portable |

---

## 3. Cómo ejecutar los tests

```powershell
npm test
```

Debe terminar con algo así:

```
# tests 73
# pass 73
# fail 0
```

**No necesitas instalar ningún framework de testing.** Se usa `node:test`, el
runner que viene dentro de Node.js.

### Qué comprueba cada archivo

| Archivo | Qué valida |
|---|---|
| `test/ik.test.mjs` | La matemática de cinemática inversa: que la extremidad llegue al punto pedido con menos de 1 mm de error, que no devuelva `NaN` en los extremos, que el codo doble hacia adelante y la rodilla hacia atrás. |
| `test/skeleton.test.mjs` | Que la jerarquía de huesos sea coherente, que izquierda y derecha sean simétricas (offsets y límites), que las cadenas de IK estén bien encadenadas. |
| `test/poses.test.mjs` | Que las 26 poses tengan datos válidos, que **ninguna rotación viole los límites anatómicos**, que los objetos de escena referenciados existan, y que reflejar una pose dos veces devuelva la original. |
| `test/mannequin.test.mjs` | Construye el esqueleto real con three.js (sin abrir ventana) y comprueba geometría: estatura ≈ 1.75 m, que **ninguna pose atraviese el suelo**, que la IK acierte el objetivo, que guardar y recargar una pose la deje idéntica. |
| `test/sources.test.mjs` | Que ningún módulo tenga errores de sintaxis, que el HTML declare todos los `id` que la interfaz busca, y que cada canal IPC del `preload` exista en el proceso principal. |

`test/mannequin.test.mjs` necesita `src/vendor/three.module.js`. Si falta, esas
pruebas se **saltan** en vez de fallar; ejecuta `npm run vendor` para tenerlas.

### Ejecutar un solo archivo

```powershell
node --test test/ik.test.mjs
```

### Ver el detalle de un fallo

```powershell
npm test 2>&1 | Select-String -Pattern "not ok" -Context 0,12
```

---

## 4. Generar el instalable .exe

```powershell
npm run dist
```

Cuando termine, en la carpeta `dist/` tendrás:

- `Manga Pose Studio-1.0.0-x64.exe` → **instalador** (NSIS). Deja elegir carpeta
  y crea accesos directos en el escritorio y el menú Inicio.
- `Manga Pose Studio-1.0.0-x64.exe` (variante *portable*) → se ejecuta sin
  instalar nada.

La primera compilación descarga los binarios de Electron (~100 MB) y tarda
varios minutos; las siguientes son mucho más rápidas porque quedan en caché.

**Icono personalizado (opcional):** crea `build/icon.ico` (256×256, formato ICO)
y `electron-builder` lo usará automáticamente. Sin él usa el icono de Electron.

---

## 5. Cómo se usa la app

### Manejar la vista

| Acción | Resultado |
|---|---|
| Clic izquierdo y arrastrar en vacío | Orbitar la cámara |
| Clic derecho y arrastrar | Desplazar el encuadre |
| Rueda del ratón | Acercar / alejar |
| Botones de la barra superior | Encuadres típicos de viñeta: contrapicado, picado, ojo de gusano, escorzo extremo… |
| Deslizador **Lente** | Distancia focal. Valores bajos (16–24°) exageran el escorzo, que es justo lo que hace que un puñetazo hacia cámara se lea como manga. |

### Posar el maniquí

Hay dos formas, y conviene combinarlas:

- **Puntos naranjas** (manos y pies): arrástralos y el brazo o la pierna entera
  se resuelve sola por cinemática inversa. Es lo rápido.
- **Puntos azules** (resto de articulaciones): arrástralos para girar *esa*
  articulación. Es lo preciso.
- El deslizador **Giro de codo / rodilla** rota el codo o la rodilla alrededor
  del eje mano–hombro sin mover la mano. Sirve para elegir si el codo apunta
  hacia afuera o hacia el cuerpo.
- **Límites** activado impide ángulos imposibles. Desactívalo si quieres
  deformaciones expresivas o poses de acción exageradas.
- **Simetría** aplica cada cambio también al lado contrario.

### Lo que evita el aspecto de maniquí de escaparate

- **Naturalizar** (botón o tecla `N`): mete micro-variaciones aleatorias dentro
  de rangos plausibles en todas las articulaciones. Rompe la simetría perfecta,
  que es lo que delata a las poses hechas a mano. Ajusta la intensidad con el
  deslizador de abajo.
- **Apoyar en suelo** (`F`): baja o sube la figura hasta que el punto más bajo
  toque el suelo. Evita las poses flotando.
- **Objetos de escena**: mesa, silla, taburete, caja, escalones, pared,
  barandal, gato y tapete. Una pierna sobre una mesa se lee; una pierna en el
  aire, no.
- **Tipos de cuerpo**: shōnen, shōjo, seinen, bishōnen, chibi y niño, más
  deslizadores finos de estatura, cabeza, hombros, cadera, grosor y torso.
- **Estilos de render**: maniquí de madera, arcilla (para leer el volumen),
  toon (sombras planas tipo manga) y silueta (para comprobar si la pose se lee
  a contraluz — es el mejor test de una pose).

### Guardar y exportar

- Escribe un nombre y pulsa **Guardar**: la pose queda en tu lista personal,
  con sus objetos de escena y su cámara. Se guarda en
  `%APPDATA%\Manga Pose Studio\poses-usuario.json` (el botón **Carpeta** te
  lleva ahí).
- **Importar / Exportar** mueven esa lista como `.json`, por si quieres pasarla
  a otro equipo.
- **Exportar PNG** (`E`) guarda la vista a doble resolución. Con *fondo
  transparente* marcado, sale sin rejilla ni suelo, lista para poner de capa
  debajo de tu dibujo en Clip Studio, Krita o Photoshop.
- **Copiar imagen** la manda directo al portapapeles.

### Atajos

| Tecla | Acción |
|---|---|
| `Ctrl+Z` / `Ctrl+Y` | Deshacer / rehacer |
| `H` | Mostrar u ocultar los puntos de control |
| `G` | Rejilla |
| `N` | Naturalizar |
| `M` | Reflejar la pose |
| `F` | Apoyar en el suelo |
| `E` | Exportar PNG |

---

## 6. Estructura del código

```
main.cjs                 Proceso principal de Electron: ventana, guardado, diálogos
preload.cjs              Puente seguro renderer <-> main (sin acceso a Node desde la UI)
src/
  index.html             Estructura de la interfaz
  styles.css             Estilos
  vendor/three.module.js Copia de three.js (la genera npm run vendor)
  js/
    skeleton-def.js      Definición del esqueleto: huesos, offsets, límites, cuerpos   [puro]
    ik.js                Cinemática inversa de dos huesos y utilidades vectoriales     [puro]
    poses.js             Las 26 poses, objetos de escena, espejo y "naturalizar"       [puro]
    mannequin.js         Construye la malla, aplica poses, resuelve IK, apoya en suelo
    props.js             Geometría de mesa, silla, caja, gato, pared…
    scene.js             Escena, luces, sombras, suelo y captura PNG
    orbit.js             Cámara orbital y encuadres predefinidos
    app.js               Estado, interfaz y toda la interacción con el ratón
scripts/copy-vendor.mjs  Copia three.js de node_modules a src/vendor
test/                    Pruebas
.vscode/                 Tareas y configuraciones de depuración
```

Los tres módulos marcados **[puro]** no dependen de three.js ni del DOM: por eso
se pueden testear directamente en Node. Es intencional, y hay un test que lo
vigila para que no se rompa.

### Convención de rotaciones

Está documentada arriba de `src/js/skeleton-def.js` y es lo primero que hay que
leer si vas a tocar poses. En resumen: los huesos de extremidades apuntan hacia
`-Y` y los de la columna hacia `+Y`, así que **los signos se invierten entre
unos y otros**.

| Movimiento | Valor |
|---|---|
| Brazo horizontal al frente | `upperArm.x = -90` |
| Brazo horizontal al costado | `upperArm.z = +90` (izq.) / `-90` (der.) |
| Codo flexionado 90° | `foreArm.x = -90` |
| Cadera flexionada 90° | `thigh.x = -90` |
| Rodilla flexionada 90° | `shin.x = +90` |
| Inclinar el torso adelante | `spine.x = +20` |

---

## 7. Añadir tus propias poses al código

Lo más cómodo es posarla en la app, guardarla y exportarla — pero si quieres que
venga de fábrica, añade un objeto al array `POSES` de `src/js/poses.js`:

```js
{
  id: 'mi_pose',
  name: 'Mi pose',
  cat: 'accion',                 // base | cotidiano | accion | sentado | suelo | objeto
  tags: ['salto', 'espada'],
  root: { pos: [0, 0.95, 0], rot: [0, 0, 0] },
  snap: true,                    // false si está sentada sobre un objeto o en el aire
  bones: {
    spine: [10, 0, 0],
    upperArm_R: [-90, 0, -10], foreArm_R: [-20, 0, 0],
  },
  props: [{ id: 'box', pos: [0, 0, 0.4], rot: [0, 0, 0], scale: 1 }],
  cam: { theta: 30, phi: -10, dist: 3.2, targetY: 1.0, fov: 34 },
}
```

Después ejecuta `npm test`: los tests te avisarán si algún ángulo se sale de los
límites anatómicos, si la pose atraviesa el suelo o si el objeto de escena que
referenciaste no existe.

---

## 8. Problemas frecuentes

**`Electron failed to install correctly, please delete node_modules/electron`**

Es el fallo más común, y casi siempre por el mismo motivo.

El paquete `electron` de npm pesa solo ~1.5 MB. El ejecutable de verdad (~200 MB)
lo descarga su script `postinstall`. **npm 10 y posteriores bloquean por defecto
los scripts de instalación de las dependencias**, así que ese paso se salta en
silencio y queda `node_modules/electron/dist/` casi vacío y sin `path.txt` — que
es justo lo que comprueba el error.

Lo delata este aviso durante `npm install`, fácil de pasar por alto:

```
npm warn allow-scripts 1 package has install scripts not yet covered by allowScripts:
npm warn allow-scripts   electron@32.2.0 (postinstall: node install.js)
```

Otra pista: si `npm install` termina en pocos segundos, el binario no se
descargó (una descarga real tarda minutos).

Arréglalo con:

```powershell
npm run fix:electron
```

El script llama al descargador de Electron directamente, saltándose la política
de npm. Después, para que los futuros `npm install` no vuelvan a saltarse el
paso, autoriza el script una sola vez:

```powershell
npm approve-scripts electron
```

**Si aun así no descarga: plan B**

```powershell
npm run fix:electron:manual
```

El descargador oficial usa `@electron/get`, que tiene su propia caché, su propio
manejo de proxy y varias variables de entorno que pueden hacerlo fallar o
saltarse la descarga en silencio (`ELECTRON_SKIP_BINARY_DOWNLOAD`,
`ELECTRON_MIRROR`, `ELECTRON_CACHE`). Este otro script se salta todo eso: baja el
zip oficial de GitHub con `fetch`, muestra el progreso, lo extrae y escribe
`path.txt`. Comprueba el tamaño del archivo, así que si un proxy o el antivirus
cortan la descarga te lo dice en vez de dejar una instalación rota.

Si aparte falla a mitad de la descarga, entonces sí mira estos tres:

- **Antivirus.** Defender y otros ponen `electron.exe` en cuarentena mientras se
  extrae. Añade a las exclusiones la carpeta del proyecto y
  `%LOCALAPPDATA%\electron\Cache`.
- **Proxy o red corporativa.**
  ```powershell
  npm config set https-proxy http://usuario:clave@proxy:puerto
  ```
- **Caché corrupta.** Borra `%LOCALAPPDATA%\electron\Cache` y reintenta.

**Instalación manual (plan B, sin depender del descargador)**

1. Mira qué versión pide el proyecto: `node -p "require('./node_modules/electron/package.json').version"`
   (o usa la del `package.json`: rama 32.x).
2. Descarga a mano `electron-v<versión>-win32-x64.zip` desde
   <https://github.com/electron/electron/releases>.
3. Descomprime **todo el contenido del zip** dentro de
   `node_modules\electron\dist\` (debe quedar `dist\electron.exe` junto a sus
   `.dll`, `resources\` y `locales\`).
4. Crea el archivo `node_modules\electron\path.txt` con una sola línea:
   ```
   electron.exe
   ```
5. `npm start`.

**`npm no se reconoce como un comando`**
Node.js no está instalado o VS Code no ha recargado el PATH. Cierra VS Code por
completo (no solo la ventana) y vuelve a abrirlo. Si sigue, reinstala Node.js.

**La ventana se abre en negro**
Falta three.js en `src/vendor/`. Ejecuta `npm run vendor`. Si sigue negro, abre
con `npm run dev` y mira los errores en la pestaña *Console* de DevTools.

**`Cannot find module '.../three.module.js'`**
Igual que el anterior: `npm install` o `npm run vendor`.

**`npm run dist` falla descargando Electron**
Suele ser el antivirus, el proxy o la red corporativa. Reintenta; los binarios
quedan cacheados en `%LOCALAPPDATA%\electron-builder\Cache`.

**Windows SmartScreen avisa al abrir el .exe**
Es normal en ejecutables sin firma digital: *Más información → Ejecutar de todas
formas*. Firmarlo requiere un certificado de code signing de pago.

**Una pose se ve rara al cambiar el tipo de cuerpo**
Las rotaciones se conservan, pero los contactos (mano en la mesa, pie en la
caja) están calculados para las proporciones por defecto. Arrastra el punto
naranja correspondiente y la IK lo recoloca en un segundo.

---

MIT · Hecho para referencia de dibujo, no para animación.
