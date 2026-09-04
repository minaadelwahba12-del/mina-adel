const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('storage', {
  get: (key, useCloud) => ipcRenderer.invoke('storage-get', key),
  set: (key, value, useCloud) => ipcRenderer.invoke('storage-set', key, value),
  remove: (key, useCloud) => ipcRenderer.invoke('storage-remove', key),
});

contextBridge.exposeInMainWorld('electronAPI', {
  appVersion: process.env.npm_package_version,
});
