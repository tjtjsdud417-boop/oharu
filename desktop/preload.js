const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopBridge", {
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  onAuthCode: (cb) => ipcRenderer.on("auth-code", (_e, code) => cb(code)),
  getPrefs: () => ipcRenderer.invoke("get-prefs"),
  syncReminders: (items) => ipcRenderer.invoke("sync-reminders", items),
  getNotificationStatus: () => ipcRenderer.invoke("notification-status"),
  setAlwaysOnTop: (val) => ipcRenderer.invoke("set-always-on-top", val),
  setAutoLaunch: (val) => ipcRenderer.invoke("set-auto-launch", val),
  quitApp: () => ipcRenderer.invoke("quit-app"),
  onPrefs: (cb) => ipcRenderer.on("prefs-changed", (_e, prefs) => cb(prefs)),
});
