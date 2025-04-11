const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onScreenshotCaptured: (callback) =>
    ipcRenderer.on("screenshot-captured", callback),
  onScreenshotError: (callback) => ipcRenderer.on("screenshot-error", callback),
  // API key handling
  getOpenAIKey: () => ipcRenderer.invoke("get-openai-key"),
  // User preferences handling
  getUserPreferences: () => ipcRenderer.invoke("get-user-preferences"),
  saveUserPreferences: (preferences) =>
    ipcRenderer.invoke("save-user-preferences", preferences),
  // WebSocket relay handling
  sendGptResponse: (response) =>
    ipcRenderer.invoke("send-gpt-response", response),
  onConnectionStatusChange: (callback) =>
    ipcRenderer.on("connection-status-change", callback),
  // Stealth mode functions
  toggleStealthMode: (enabled) =>
    ipcRenderer.invoke("toggle-stealth-mode", enabled),
  onStealthModeChanged: (callback) =>
    ipcRenderer.on("stealth-mode-changed", callback),
  // Voice recording function
  onStartVoiceRecording: (callback) =>
    ipcRenderer.on("start-voice-recording", callback),
  onStopVoiceRecording: (callback) =>
    ipcRenderer.on("stop-voice-recording", callback),
  onToggleVoiceRecording: (callback) =>
    ipcRenderer.on("toggle-voice-recording", callback),
  startRecording: () => ipcRenderer.invoke("start-recording"),
  stopRecording: () => ipcRenderer.invoke("stop-recording"),
  // Window control functions for frameless window
  windowControl: (action) => ipcRenderer.invoke("window-control", action),
});
