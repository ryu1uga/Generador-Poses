const {
  app, BrowserWindow, ipcMain, dialog, shell, nativeImage, clipboard, screen,
} = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev = process.argv.includes('--dev');

/** Archivo donde se guardan las poses personalizadas del usuario. */
function posesFile() {
  return path.join(app.getPath('userData'), 'poses-usuario.json');
}

function readUserPoses() {
  try {
    const raw = fs.readFileSync(posesFile(), 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeUserPoses(list) {
  fs.mkdirSync(path.dirname(posesFile()), { recursive: true });
  fs.writeFileSync(posesFile(), JSON.stringify(list, null, 2), 'utf8');
}

let win = null;

function createWindow() {
  // El tamaño ideal es 1500x940, pero en pantallas de 1080p con escalado de
  // Windows al 125/150 % el área útil en DIP es mucho menor y la ventana
  // quedaba más alta que el escritorio: la parte de abajo se salía.
  const { workAreaSize } = screen.getPrimaryDisplay();
  const width = Math.min(1500, workAreaSize.width - 40);
  const height = Math.min(940, workAreaSize.height - 40);

  win = new BrowserWindow({
    width,
    height,
    minWidth: Math.min(960, width),
    minHeight: Math.min(600, height),
    center: true,
    backgroundColor: '#14161c',
    title: 'Manga Pose Studio',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      zoomFactor: 1,
    },
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => {
    // Si aun así no cabe (varios monitores, barra de tareas ancha), maximiza.
    const bounds = win.getBounds();
    const area = screen.getDisplayMatching(bounds).workArea;
    if (bounds.height > area.height || bounds.width > area.width) win.maximize();
    win.show();
  });
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });

  /* Zoom de la interfaz: Ctrl + / Ctrl - / Ctrl 0 */
  const setZoom = (z) => win.webContents.setZoomFactor(Math.max(0.6, Math.min(1.6, z)));
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown' || !input.control) return;
    const z = win.webContents.getZoomFactor();
    if (input.key === '0') { setZoom(1); e.preventDefault(); }
    else if (input.key === '+' || input.key === '=') { setZoom(z + 0.1); e.preventDefault(); }
    else if (input.key === '-') { setZoom(z - 0.1); e.preventDefault(); }
  });

  // Los links externos se abren en el navegador, no dentro de la app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* ------------------------------- IPC ---------------------------------- */

ipcMain.handle('poses:list', () => readUserPoses());

ipcMain.handle('poses:save', (_e, pose) => {
  if (!pose || typeof pose.name !== 'string' || !pose.name.trim()) {
    return { ok: false, error: 'La pose necesita un nombre.' };
  }
  const list = readUserPoses();
  const idx = list.findIndex((p) => p.name === pose.name);
  const record = { ...pose, savedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  writeUserPoses(list);
  return { ok: true, count: list.length };
});

ipcMain.handle('poses:delete', (_e, name) => {
  const list = readUserPoses().filter((p) => p.name !== name);
  writeUserPoses(list);
  return { ok: true, count: list.length };
});

ipcMain.handle('poses:exportFile', async (_e, list) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Exportar poses',
    defaultPath: 'mis-poses.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8');
  return { ok: true, filePath };
});

ipcMain.handle('poses:importFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Importar poses',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePaths?.length) return { ok: false, canceled: true };
  try {
    const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    if (!Array.isArray(data)) return { ok: false, error: 'El archivo no contiene una lista de poses.' };
    const list = readUserPoses();
    for (const pose of data) {
      if (!pose?.name) continue;
      const idx = list.findIndex((p) => p.name === pose.name);
      if (idx >= 0) list[idx] = pose;
      else list.push(pose);
    }
    writeUserPoses(list);
    return { ok: true, count: list.length };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle('image:save', async (_e, { dataUrl, suggestedName }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Guardar referencia',
    defaultPath: suggestedName || 'pose.png',
    filters: [{ name: 'PNG', extensions: ['png'] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return { ok: true, filePath };
});

ipcMain.handle('image:clipboard', (_e, dataUrl) => {
  clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
  return { ok: true };
});

ipcMain.handle('app:revealPosesFolder', () => {
  const file = posesFile();
  if (!fs.existsSync(file)) writeUserPoses(readUserPoses());
  shell.showItemInFolder(file);
  return { ok: true, path: file };
});
