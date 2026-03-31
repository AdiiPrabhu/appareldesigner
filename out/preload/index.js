"use strict";
const electron = require("electron");
const electronAPI = {
  openFileDialog: (options) => electron.ipcRenderer.invoke("open-file-dialog", options),
  saveFileDialog: (options) => electron.ipcRenderer.invoke("save-file-dialog", options),
  openFolderDialog: () => electron.ipcRenderer.invoke("open-folder-dialog"),
  getAppPath: (name) => electron.ipcRenderer.invoke("get-app-path", name),
  getBackendStatus: () => electron.ipcRenderer.invoke("backend-status"),
  platform: process.platform,
  onBackendReady: (callback) => {
    electron.ipcRenderer.on("backend-ready", () => callback());
  },
  onBackendError: (callback) => {
    electron.ipcRenderer.on("backend-error", (_event, error) => callback(error));
  },
  removeAllListeners: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
