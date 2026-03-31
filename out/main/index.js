"use strict";
const electron = require("electron");
const path = require("path");
const child_process = require("child_process");
const fs = require("fs");
const http = require("http");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const http__namespace = /* @__PURE__ */ _interopNamespaceDefault(http);
const isDev = process.env.NODE_ENV === "development" || !electron.app.isPackaged;
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || "8765", 10);
const isWin = process.platform === "win32";
const isMac = process.platform === "darwin";
let mainWindow = null;
let backendProcess = null;
let backendReady = false;
function getPythonPath() {
  const venvBin = isWin ? "Scripts" : "bin";
  const pythonExe = isWin ? "python.exe" : "python3";
  const fallback = isWin ? "python" : "python3";
  if (electron.app.isPackaged) {
    const bundledPython = path.join(process.resourcesPath, "backend", "venv", venvBin, pythonExe);
    if (fs__namespace.existsSync(bundledPython)) return bundledPython;
    return fallback;
  }
  const devVenv = path.join(__dirname, "..", "..", "backend", "venv", venvBin, pythonExe);
  if (fs__namespace.existsSync(devVenv)) return devVenv;
  return fallback;
}
function getBackendPath() {
  if (electron.app.isPackaged) {
    return path.join(process.resourcesPath, "backend", "main.py");
  }
  return path.join(__dirname, "..", "..", "backend", "main.py");
}
function startBackend() {
  const pythonPath = getPythonPath();
  const backendPath = getBackendPath();
  const backendDir = path.join(backendPath, "..");
  console.log(`[Main] Starting backend: ${pythonPath} ${backendPath}`);
  backendProcess = child_process.spawn(pythonPath, [backendPath], {
    cwd: backendDir,
    env: {
      ...process.env,
      BACKEND_PORT: String(BACKEND_PORT),
      PYTHONUNBUFFERED: "1"
    },
    // On Windows use 'pipe'; on Unix we can also use 'pipe'
    stdio: ["ignore", "pipe", "pipe"]
  });
  const isReadyLine = (text) => text.includes("Application startup complete") || text.includes("Uvicorn running");
  backendProcess.stdout?.on("data", (data) => {
    const text = data.toString();
    process.stdout.write(`[Backend] ${text}`);
    if (isReadyLine(text)) signalBackendReady();
  });
  backendProcess.stderr?.on("data", (data) => {
    const text = data.toString();
    process.stderr.write(`[Backend] ${text}`);
    if (isReadyLine(text)) signalBackendReady();
  });
  backendProcess.on("close", (code) => {
    console.log(`[Main] Backend exited with code ${code}`);
    backendReady = false;
    backendProcess = null;
  });
  backendProcess.on("error", (err) => {
    console.error("[Main] Failed to start backend process:", err.message);
    mainWindow?.webContents.send("backend-error", err.message);
  });
}
function signalBackendReady() {
  if (!backendReady) {
    backendReady = true;
    console.log("[Main] Backend is ready");
    mainWindow?.webContents.send("backend-ready");
  }
}
function pollBackendReady(retries = 40) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http__namespace.get(`http://localhost:${BACKEND_PORT}/health`, (res) => {
        if (res.statusCode === 200) {
          signalBackendReady();
          resolve();
        } else {
          scheduleRetry();
        }
      });
      req.on("error", scheduleRetry);
      req.setTimeout(2e3, () => req.destroy());
      function scheduleRetry() {
        if (attempts < retries) {
          setTimeout(check, 1e3);
        } else {
          reject(new Error("Backend did not respond after 40 seconds"));
        }
      }
    };
    setTimeout(check, 2e3);
  });
}
function createMainWindow() {
  const windowOptions = {
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#0f0f13",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: !isDev
    }
  };
  if (isWin) {
    windowOptions.titleBarStyle = "hidden";
    windowOptions.titleBarOverlay = {
      color: "#1a1a24",
      symbolColor: "#e8e8f0",
      height: 32
    };
  } else if (isMac) {
    windowOptions.titleBarStyle = "hiddenInset";
    windowOptions.trafficLightPosition = { x: 12, y: 12 };
  } else {
    windowOptions.titleBarStyle = "default";
  }
  mainWindow = new electron.BrowserWindow(windowOptions);
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
    if (isDev) mainWindow?.webContents.openDevTools();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.ipcMain.handle("open-file-dialog", async (_event, options) => {
  return electron.dialog.showOpenDialog(mainWindow, {
    properties: options?.multiSelect ? ["openFile", "multiSelections"] : ["openFile"],
    filters: options?.filters || [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }]
  });
});
electron.ipcMain.handle("save-file-dialog", async (_event, options) => {
  return electron.dialog.showSaveDialog(mainWindow, {
    defaultPath: options?.defaultPath,
    filters: options?.filters || [{ name: "PNG Image", extensions: ["png"] }]
  });
});
electron.ipcMain.handle("open-folder-dialog", async () => {
  return electron.dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"]
  });
});
electron.ipcMain.handle("get-app-path", async (_event, name) => {
  const paths = {
    userData: electron.app.getPath("userData"),
    documents: electron.app.getPath("documents"),
    downloads: electron.app.getPath("downloads"),
    pictures: electron.app.getPath("pictures"),
    home: electron.app.getPath("home"),
    temp: electron.app.getPath("temp"),
    exe: electron.app.getPath("exe"),
    appData: electron.app.getPath("appData")
  };
  return paths[name] ?? "";
});
electron.ipcMain.handle("get-platform", () => process.platform);
electron.ipcMain.handle("backend-status", () => ({ ready: backendReady, port: BACKEND_PORT }));
electron.app.whenReady().then(async () => {
  startBackend();
  createMainWindow();
  try {
    await pollBackendReady();
  } catch (err) {
    console.error("[Main] Backend startup timeout:", err);
    mainWindow?.webContents.send("backend-error", "Backend failed to start. Check that Python is installed.");
  }
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (!isMac) electron.app.quit();
});
electron.app.on("before-quit", () => {
  if (backendProcess) {
    console.log("[Main] Sending SIGTERM to backend...");
    backendProcess.kill("SIGTERM");
    backendProcess = null;
  }
});
electron.app.on("will-quit", () => {
  if (backendProcess) backendProcess.kill("SIGKILL");
});
