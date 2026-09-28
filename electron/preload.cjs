const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dezigloUpdater', {
  getVersion: () => ipcRenderer.invoke('deziglo-updater:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('deziglo-updater:check'),
  openReleases: () => ipcRenderer.invoke('deziglo-updater:open-releases'),
  onStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('deziglo-updater-status', listener);
    return () => ipcRenderer.removeListener('deziglo-updater-status', listener);
  },
});
