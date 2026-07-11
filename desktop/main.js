const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");

const APP_URL = "https://oharu.today/?desktop=1";
const DEFAULT_BOUNDS = { width: 420, height: 640 };

const DRAG_CSS = `
  body::before { content:""; position:fixed; top:0; left:0; right:110px; height:26px;
    -webkit-app-region:drag; z-index:99999; }
  .head { -webkit-app-region: drag; }
  .head .topbtns, .head .topbtns * { -webkit-app-region: no-drag; }
  .auth input, .auth button, .auth a { -webkit-app-region: no-drag; }
`;

let win = null;
let tray = null;
let isQuitting = false;
let STATE_FILE = "";
let state = {
  width: DEFAULT_BOUNDS.width,
  height: DEFAULT_BOUNDS.height,
  alwaysOnTop: false,
  openAtLogin: false,
};

function initState() {
  STATE_FILE = path.join(app.getPath("userData"), "window-state.json");
  state = loadState();
}

function getFallbackHtmlPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "web", "index.html");
  }
  return path.join(__dirname, "..", "web", "index.html");
}

function loadState() {
  const defaults = {
    x: undefined,
    y: undefined,
    width: DEFAULT_BOUNDS.width,
    height: DEFAULT_BOUNDS.height,
    alwaysOnTop: false,
    openAtLogin: false,
  };
  try {
    if (fs.existsSync(STATE_FILE)) {
      return { ...defaults, ...JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) };
    }
  } catch (e) {
    console.error("window-state.json 읽기 실패:", e);
  }
  return defaults;
}

function saveState() {
  if (!win || !STATE_FILE) return;
  const [x, y] = win.getPosition();
  const [width, height] = win.getSize();
  state = {
    x,
    y,
    width,
    height,
    alwaysOnTop: win.isAlwaysOnTop(),
    openAtLogin: state.openAtLogin,
  };
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    console.error("window-state.json 저장 실패:", e);
  }
}

function applyLoginItemSettings(openAtLogin) {
  app.setLoginItemSettings({
    openAtLogin,
    path: process.execPath,
    args: [],
  });
}

function createTrayIcon() {
  const iconPath = path.join(__dirname, "build", "tray.png");
  const img = nativeImage.createFromPath(iconPath);
  if (img.isEmpty()) {
    console.error("트레이 아이콘 로드 실패:", iconPath);
    return nativeImage.createEmpty();
  }
  return img.resize({ width: 16, height: 16 });
}

function showMainWindow() {
  if (!win) return;
  win.show();
  win.focus();
}

function extractAuthCode(argv) {
  const item = argv.find((a) => typeof a === "string" && a.startsWith("oharu://"));
  if (!item) return null;
  try {
    return new URL(item).searchParams.get("code");
  } catch {
    return null;
  }
}

function handleAuthCallback(code) {
  if (!code || !win) return;
  showMainWindow();
  win.webContents.send("auth-code", code);
}

function isAllowedExternalUrl(url) {
  if (typeof url !== "string") return false;
  if (url.startsWith("https://accounts.google.com")) return true;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

function getPrefs() {
  return {
    alwaysOnTop: win ? win.isAlwaysOnTop() : state.alwaysOnTop,
    autoLaunch: state.openAtLogin,
  };
}

function broadcastPrefs() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("prefs-changed", getPrefs());
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: "열기",
      click: showMainWindow,
    },
    {
      label: "새로고침",
      click: () => {
        if (!win) return;
        win.webContents.reloadIgnoringCache();
      },
    },
    {
      label: "항상 위 고정",
      type: "checkbox",
      checked: win ? win.isAlwaysOnTop() : state.alwaysOnTop,
      click: (item) => {
        if (!win) return;
        win.setAlwaysOnTop(item.checked);
        state.alwaysOnTop = item.checked;
        saveState();
        buildTray();
        broadcastPrefs();
      },
    },
    {
      label: "시작 시 자동 실행",
      type: "checkbox",
      checked: state.openAtLogin,
      click: (item) => {
        state.openAtLogin = item.checked;
        applyLoginItemSettings(item.checked);
        saveState();
        buildTray();
        broadcastPrefs();
      },
    },
    { type: "separator" },
    {
      label: "종료",
      click: () => {
        isQuitting = true;
        saveState();
        app.quit();
      },
    },
  ]);
}

function buildTray() {
  if (!tray) return;
  tray.setContextMenu(buildTrayMenu());
}

async function clearWebCache() {
  const ses = win.webContents.session;
  await ses.clearCache();
  await ses.clearStorageData({ storages: ["serviceworkers", "cachestorage"] });
}

async function loadAppContents() {
  await clearWebCache();
  try {
    await win.loadURL(APP_URL);
  } catch (e) {
    console.error("원격 URL 로드 실패, 로컬 폴백:", e);
    await win.loadFile(getFallbackHtmlPath(), { query: { desktop: "1" } });
  }
}

function createWindow() {
  const { width, height, x, y, alwaysOnTop } = state;
  const winOpts = {
    width,
    height,
    minWidth: 340,
    minHeight: 480,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    skipTaskbar: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  };

  if (typeof x === "number" && typeof y === "number") {
    winOpts.x = x;
    winOpts.y = y;
  }

  win = new BrowserWindow(winOpts);

  win.once("ready-to-show", () => {
    win.setAlwaysOnTop(alwaysOnTop);
    win.show();
  });

  win.webContents.on("did-finish-load", () => {
    win.webContents.insertCSS(DRAG_CSS).catch((e) => {
      console.error("드래그 CSS 주입 실패:", e);
    });
  });

  win.webContents.on("did-fail-load", (_event, _code, _desc, validatedURL) => {
    if (validatedURL === APP_URL) {
      win.loadFile(getFallbackHtmlPath(), { query: { desktop: "1" } }).catch(console.error);
    }
  });

  win.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      saveState();
      win.hide();
    }
  });

  loadAppContents();
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip("오하루");
  buildTray();
  tray.on("double-click", showMainWindow);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient("oharu");
  } else {
    app.setAsDefaultProtocolClient("oharu", process.execPath, [path.resolve(process.argv[1])]);
  }

  ipcMain.handle("open-external", async (_event, url) => {
    if (!isAllowedExternalUrl(url)) return false;
    await shell.openExternal(url);
    return true;
  });

  ipcMain.handle("get-prefs", () => getPrefs());

  ipcMain.handle("set-always-on-top", (_event, val) => {
    if (!win) return false;
    const on = !!val;
    win.setAlwaysOnTop(on);
    state.alwaysOnTop = on;
    saveState();
    buildTray();
    broadcastPrefs();
    return true;
  });

  ipcMain.handle("set-auto-launch", (_event, val) => {
    const on = !!val;
    state.openAtLogin = on;
    applyLoginItemSettings(on);
    saveState();
    buildTray();
    broadcastPrefs();
    return true;
  });

  ipcMain.handle("quit-app", () => {
    isQuitting = true;
    saveState();
    app.quit();
  });

  app.on("second-instance", (_event, argv) => {
    const code = extractAuthCode(argv);
    if (code) handleAuthCallback(code);
    else showMainWindow();
  });

  app.whenReady().then(() => {
    initState();
    applyLoginItemSettings(state.openAtLogin);
    createWindow();
    createTray();
    const code = extractAuthCode(process.argv);
    if (code) handleAuthCallback(code);
  });

  app.on("before-quit", () => {
    isQuitting = true;
    saveState();
  });

  app.on("window-all-closed", (e) => {
    e.preventDefault();
  });
}
