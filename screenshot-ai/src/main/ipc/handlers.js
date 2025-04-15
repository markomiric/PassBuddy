/**
 * IPC handlers
 *
 * Handles IPC communication between main and renderer processes
 */
const { ipcMain, globalShortcut, dialog } = require("electron");
const fs = require("fs").promises;
const {
  loadUserPreferences,
  saveUserPreferences,
} = require("../services/preferences");
const { takeScreenshot } = require("../services/screenshot");
const { sendToRelayServer } = require("../services/websocket");
// Stealth mode is always enabled, no need to toggle

/**
 * Register IPC handlers
 * @param {BrowserWindow} mainWindow - The main application window
 * @param {Object} userPrefs - User preferences
 */
function registerIpcHandlers(mainWindow, userPrefs) {
  // Get OpenAI API key - first try user preferences, then fallback to .env file
  ipcMain.handle("get-openai-key", () => {
    // First check if the user has set an API key in preferences
    if (userPrefs.openaiApiKey && userPrefs.openaiApiKey.trim() !== "") {
      return userPrefs.openaiApiKey;
    }
    // Fallback to the .env file
    return process.env.OPENAI_API_KEY || "";
  });

  // Save OpenAI API key
  ipcMain.handle("save-openai-key", (event, apiKey) => {
    userPrefs.openaiApiKey = apiKey;
    userPrefs.showApiKeyPrompt = false; // Don't show the prompt again
    return saveUserPreferences(userPrefs);
  });

  // Get DeepSeek API key
  ipcMain.handle("get-deepseek-key", () => {
    // First check if the user has set an API key in preferences
    if (userPrefs.deepseekApiKey && userPrefs.deepseekApiKey.trim() !== "") {
      return userPrefs.deepseekApiKey;
    }
    // Fallback to the .env file
    return process.env.DEEPSEEK_API_KEY || "";
  });

  // Save DeepSeek API key
  ipcMain.handle("save-deepseek-key", (event, apiKey) => {
    userPrefs.deepseekApiKey = apiKey;
    return saveUserPreferences(userPrefs);
  });

  // Get Gemini API key
  ipcMain.handle("get-gemini-key", () => {
    // First check if the user has set an API key in preferences
    if (userPrefs.geminiApiKey && userPrefs.geminiApiKey.trim() !== "") {
      return userPrefs.geminiApiKey;
    }
    // Fallback to the .env file
    return process.env.GEMINI_API_KEY || "";
  });

  // Save Gemini API key
  ipcMain.handle("save-gemini-key", (event, apiKey) => {
    userPrefs.geminiApiKey = apiKey;
    return saveUserPreferences(userPrefs);
  });

  // Get selected model
  ipcMain.handle("get-selected-model", () => {
    return userPrefs.selectedModel || "gpt-4o";
  });

  // Save selected model
  ipcMain.handle("save-selected-model", (event, model) => {
    userPrefs.selectedModel = model;
    return saveUserPreferences(userPrefs);
  });

  // Get language setting
  ipcMain.handle("get-language", () => {
    return userPrefs.language || "en";
  });

  // Save language setting
  ipcMain.handle("save-language", (event, language) => {
    userPrefs.language = language;
    return saveUserPreferences(userPrefs);
  });

  // Get model configuration
  ipcMain.handle("get-model-config", () => {
    // Default model configurations
    const defaultModelConfig = {
      "gpt-4o": {
        baseURL: "https://api.openai.com",
        temperature: 0.3,
        provider: "openai",
      },
      "deepseek-chat": {
        baseURL: "https://api.deepseek.com",
        temperature: 0.3,
        provider: "deepseek",
      },
      "gemini-2.0-flash": {
        baseURL: "https://generativelanguage.googleapis.com",
        temperature: 1.0, // Default temperature for Gemini 2.0 Flash is 1.0 (range 0.0-2.0)
        provider: "google",
        apiVersion: "v1", // API version for Gemini
      },
    };

    // Merge with user preferences, ensuring all models are included
    const modelConfig = userPrefs.modelConfig || {};
    const mergedConfig = { ...defaultModelConfig, ...modelConfig };

    // Log the model configuration for debugging
    console.log(
      "Sending model configuration to renderer:",
      JSON.stringify(mergedConfig, null, 2)
    );

    return mergedConfig;
  });

  // Get user preferences
  ipcMain.handle("get-user-preferences", () => {
    return userPrefs;
  });

  // Save user preferences
  ipcMain.handle("save-user-preferences", (event, newPrefs) => {
    // Unregister the old hotkey before setting a new one
    if (newPrefs.hotkey && newPrefs.hotkey !== userPrefs.hotkey) {
      globalShortcut.unregister(userPrefs.hotkey);
      globalShortcut.register(newPrefs.hotkey, () =>
        takeScreenshot(mainWindow)
      );
    }

    // Handle always on top change
    if (newPrefs.alwaysOnTop !== userPrefs.alwaysOnTop) {
      // In stealth mode, we still respect the alwaysOnTop setting
      // but combine it with the stealth mode settings
      mainWindow.setAlwaysOnTop(newPrefs.alwaysOnTop);
    }

    // Stealth mode is always enabled, no need to handle changes

    // Update preferences and save
    Object.assign(userPrefs, newPrefs);
    return saveUserPreferences(userPrefs);
  });

  // Stealth mode is always enabled, no need for a toggle handler

  // Send GPT response to relay server
  ipcMain.handle("send-gpt-response", (event, response) => {
    console.log("📤 Sending GPT response to relay server");
    return sendToRelayServer({
      type: "gpt_response",
      data: response,
    });
  });

  // Window control (minimize, maximize, close, open-url)
  ipcMain.handle("window-control", (event, action, param) => {
    if (!mainWindow) return false;

    switch (action) {
      case "minimize":
        mainWindow.minimize();
        break;
      case "maximize":
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        break;
      case "close":
        mainWindow.close();
        break;
      case "open-url":
        // Open URL in default browser
        if (param && typeof param === "string") {
          const { shell } = require("electron");
          shell.openExternal(param);
        } else {
          console.warn("Invalid URL parameter for open-url action");
          return false;
        }
        break;
      default:
        console.warn(`Unknown window control action: ${action}`);
        return false;
    }

    return true;
  });

  // Voice recording handlers
  ipcMain.handle("start-recording", () => {
    if (mainWindow) {
      mainWindow.webContents.send("start-voice-recording");
      console.log("Voice recording started via press-and-hold");
    }
    return true;
  });

  ipcMain.handle("stop-recording", () => {
    if (mainWindow) {
      mainWindow.webContents.send("stop-voice-recording");
      console.log("Voice recording stopped via press-and-hold");
    }
    return true;
  });

  // File operations
  ipcMain.handle("open-file-dialog", async () => {
    if (!mainWindow) return { canceled: true };

    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openFile"],
        filters: [
          {
            name: "Text Files",
            extensions: ["txt", "md", "js", "py", "html", "css", "json"],
          },
          { name: "All Files", extensions: ["*"] },
        ],
        title: "Select a file to use as context",
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const fileContent = await fs.readFile(filePath, "utf8");
        return {
          canceled: false,
          filePath,
          fileName: filePath.split(/[\\\/]/).pop(), // Extract filename from path
          fileContent,
        };
      }

      return result;
    } catch (error) {
      console.error("Error opening file:", error);
      return {
        canceled: true,
        error: error.message,
      };
    }
  });
}

module.exports = {
  registerIpcHandlers,
};
