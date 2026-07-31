const { contextBridge, ipcRenderer } = require('electron');

/**
 * Puente seguro entre el proceso principal y la interfaz.
 * El renderer NO tiene acceso a Node; solo a estas funciones.
 */
contextBridge.exposeInMainWorld('api', {
  poses: {
    list: () => ipcRenderer.invoke('poses:list'),
    save: (pose) => ipcRenderer.invoke('poses:save', pose),
    remove: (name) => ipcRenderer.invoke('poses:delete', name),
    exportFile: (list) => ipcRenderer.invoke('poses:exportFile', list),
    importFile: () => ipcRenderer.invoke('poses:importFile'),
  },
  image: {
    save: (dataUrl, suggestedName) => ipcRenderer.invoke('image:save', { dataUrl, suggestedName }),
    toClipboard: (dataUrl) => ipcRenderer.invoke('image:clipboard', dataUrl),
  },
  revealPosesFolder: () => ipcRenderer.invoke('app:revealPosesFolder'),
});
