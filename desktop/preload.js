const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopBridge", {
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  onAuthCode: (cb) => ipcRenderer.on("auth-code", (_e, code) => cb(code)),
});
