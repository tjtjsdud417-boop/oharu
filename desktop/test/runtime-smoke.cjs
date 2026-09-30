// Runs the production main/preload code with a real, hidden Electron renderer.
// Only OS side effects (tray, notification delivery, browser launching, protocol
// registration and login startup) are replaced. No user profile or network used.
const electron = require("electron");
const {EventEmitter, once} = require("node:events");
const {Module, createRequire} = require("node:module");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const root = path.resolve(__dirname, "..");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "oharu-runtime-test-"));
electron.app.setPath("userData", profile);
electron.app.setPath("sessionData", profile);
let win, appId, failToast = true;
const opened = [];
class HiddenWindow extends electron.BrowserWindow {
  constructor(options) { super(options); win = this; }
  show() {}
  focus() {}
}
class SilentTray extends EventEmitter { setToolTip() {} setContextMenu() {} }
class TestNotification extends EventEmitter {
  static isSupported() { return true; }
  show() { this.emit(failToast ? "failed" : "show"); }
}
const appProxy = new Proxy(electron.app, {get(target, key) {
  if (key === "setAsDefaultProtocolClient") return () => false;
  if (key === "setLoginItemSettings") return () => {};
  if (key === "setAppUserModelId") return value => { appId = value; };
  const value = Reflect.get(target, key);
  return typeof value === "function" ? value.bind(target) : value;
}});
const timeout = setTimeout(() => { console.error("Runtime smoke timed out"); electron.app.exit(1); }, 30000);

electron.app.whenReady().then(async () => {
  await electron.session.defaultSession.protocol.handle("https", () => new Response(
    '<!doctype html><html><head><meta charset="utf-8"></head><body><h1>Runtime fixture</h1></body></html>',
    {headers: {"content-type": "text/html; charset=utf-8"}}
  ));
  const filename = path.join(root, "main.js");
  const host = new Module(filename, module);
  host.filename = filename;
  host.paths = Module._nodeModulePaths(root);
  const nativeRequire = createRequire(filename);
  host.require = id => id === "electron" ? {
    ...electron, app: appProxy, BrowserWindow: HiddenWindow,
    Tray: SilentTray, Notification: TestNotification,
    shell: {...electron.shell, openExternal: async url => { opened.push(url); }},
  } : nativeRequire(id);
  host._compile(fs.readFileSync(filename, "utf8"), filename);
  // Production initialization is registered on the already-resolved ready promise.
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(win, "main created BrowserWindow");
  if (win.webContents.isLoading()) await once(win.webContents, "did-finish-load");
  const run = source => win.webContents.executeJavaScript(source);
  assert.equal(appId, "com.moodweb.oharu");
  assert.equal(electron.app.getPath("userData"), profile);
  assert.equal(win.isVisible(), false);
  const prefs = win.webContents.getLastWebPreferences();
  assert.equal(prefs.nodeIntegration, false);
  assert.equal(prefs.contextIsolation, true);
  assert.equal(prefs.sandbox, true);
  assert.equal(await run("typeof require"), "undefined");
  assert.equal((await run("desktopBridge.getPrefs()")).autoLaunch, false);
  assert.equal(await run("desktopBridge.setAlwaysOnTop(true)"), true);
  assert.equal((await run("desktopBridge.getPrefs()")).alwaysOnTop, true);
  await run("desktopBridge.setAlwaysOnTop(false)");
  const first = {id: "runtime-failure", title: "test", dueAt: new Date().toISOString()};
  assert.ok((await run(`desktopBridge.syncReminders(${JSON.stringify([first])})`)).error);
  assert.ok((await run("desktopBridge.getNotificationStatus()")).error);
  failToast = false;
  const second = {...first, id: "runtime-success", dueAt: new Date().toISOString()};
  assert.equal((await run(`desktopBridge.syncReminders(${JSON.stringify([second])})`)).error, null);
  assert.equal((await run("desktopBridge.syncReminders([])")).scheduled, 0);
  assert.equal(await run("desktopBridge.openExternal('https://chatgpt.com/')"), true);
  assert.equal(await run("desktopBridge.openExternal('https://chatgpt.com.evil.test/')"), false);
  await run("window.open('https://claude.ai/new'); undefined");
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.deepEqual(opened, ["https://chatgpt.com/", "https://claude.ai/new"]);
  console.log(JSON.stringify({status: "PASS", electron: process.versions.electron, chromium: process.versions.chrome,
    checks: ["production-main", "sandboxed-preload", "trusted-ipc", "prefs", "notification-error-and-recovery", "clear", "external-links"],
    osNotificationDelivery: "mocked", trayVisual: "mocked", profile: "isolated-temp"}));
  clearTimeout(timeout);
  electron.app.exit(0);
}).catch(error => { console.error(error); clearTimeout(timeout); electron.app.exit(1); });
