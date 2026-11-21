const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bridge', { invoke: (p, b) => ipcRenderer.invoke('api', p, b), onPad: cb => ipcRenderer.on('pad', (e, m) => cb(m)) });
