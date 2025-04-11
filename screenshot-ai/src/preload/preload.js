/**
 * Preload script
 *
 * Exposes Electron APIs to the renderer process
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Screenshot handling
  onScreenshotCaptured: (callback) =>
    ipcRenderer.on("screenshot-captured", callback),
  onScreenshotError: (callback) => ipcRenderer.on("screenshot-error", callback),

  // API key handling
  getOpenAIKey: () => ipcRenderer.invoke("get-openai-key"),
  saveOpenAIKey: (apiKey) => ipcRenderer.invoke("save-openai-key", apiKey),
  getDeepSeekKey: () => ipcRenderer.invoke("get-deepseek-key"),
  saveDeepSeekKey: (apiKey) => ipcRenderer.invoke("save-deepseek-key", apiKey),

  // Model selection
  getSelectedModel: () => ipcRenderer.invoke("get-selected-model"),
  saveSelectedModel: (model) =>
    ipcRenderer.invoke("save-selected-model", model),
  getModelConfig: () => ipcRenderer.invoke("get-model-config"),
  onShowApiKeyDialog: (callback) =>
    ipcRenderer.on("show-api-key-dialog", callback),

  // User preferences handling
  getUserPreferences: () => ipcRenderer.invoke("get-user-preferences"),
  saveUserPreferences: (preferences) =>
    ipcRenderer.invoke("save-user-preferences", preferences),

  // WebSocket relay handling
  sendGptResponse: (response) =>
    ipcRenderer.invoke("send-gpt-response", response),
  onConnectionStatusChange: (callback) =>
    ipcRenderer.on("connection-status-change", callback),

  // Stealth mode is always enabled, no toggle needed

  // Voice recording function
  onStartVoiceRecording: (callback) =>
    ipcRenderer.on("start-voice-recording", callback),
  onStopVoiceRecording: (callback) =>
    ipcRenderer.on("stop-voice-recording", callback),
  onToggleVoiceRecording: (callback) =>
    ipcRenderer.on("toggle-voice-recording", callback),
  startRecording: () => ipcRenderer.invoke("start-recording"),
  stopRecording: () => ipcRenderer.invoke("stop-recording"),

  // Application reset
  onResetApplication: (callback) =>
    ipcRenderer.on("reset-application", callback),

  // Window control functions for frameless window
  windowControl: (action, param) =>
    ipcRenderer.invoke("window-control", action, param),

  // File operations
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
});
