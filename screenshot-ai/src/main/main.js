/**
 * Main entry point for the Electron application
 */
const {
  app,
  globalShortcut,
  BrowserWindow,
  Menu,
  session,
} = require("electron");
const path = require("path");

// Load environment variables from .env file
require("dotenv").config();

// Import services and utilities
const {
  loadUserPreferences,
  saveUserPreferences,
} = require("./services/preferences");
const { takeScreenshot } = require("./services/screenshot");
const {
  initWebSocketService,
  closeWebSocketConnection,
} = require("./services/websocket");
const { enableStealthMode } = require("./utils/stealth");
const { registerIpcHandlers } = require("./ipc/handlers");

let mainWindow;

/**
 * Create application menu
 * @param {Object} userPrefs - User preferences
 */
function createAppMenu(userPrefs) {
  const isMac = process.platform === "darwin";

  const template = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),

    // File menu
    {
      label: "File",
      submenu: [
        {
          label: "Take Screenshot",
          accelerator: "CmdOrCtrl+Shift+S",
          click: async () => {
            await takeScreenshot(mainWindow);
          },
        },
        { type: "separator" },
        {
          label: "Show Window",
          accelerator: "CmdOrCtrl+Alt+S",
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          },
        },
        // Stealth mode is always enabled
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },

    // Edit menu
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...(isMac
          ? [{ role: "delete" }, { role: "selectAll" }]
          : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
        { type: "separator" },
        {
          label: "Update API Key",
          click: () => {
            // Send a message to the renderer to show the API key dialog
            if (mainWindow) {
              mainWindow.webContents.send("show-api-key-dialog");
            }
          },
        },
      ],
    },

    // View menu
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },

    // Help menu
    {
      label: "Help",
      submenu: [
        {
          label: "About Screenshot AI",
          click: async () => {
            const { shell } = require("electron");
            await shell.openExternal(
              "https://github.com/username/screenshot-ai"
            );
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Create the main application window
 * @param {Object} userPrefs - User preferences
 */
function createMainWindow(userPrefs) {
  // Force specific window size regardless of saved preferences
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    x: userPrefs.windowPosition.x,
    y: userPrefs.windowPosition.y,
    minWidth: 600,
    minHeight: 500,
    icon: path.join(__dirname, "../../assets/icons/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      // Explicitly allow microphone access
      permissions: ["microphone"],
    },
    backgroundColor: "#00000000", // Transparent background
    show: false, // Don't show until ready-to-show
    alwaysOnTop: userPrefs.alwaysOnTop, // Use user preference for alwaysOnTop
    // Additional options to help prevent screen capture
    paintWhenInitiallyHidden: true,
    titleBarStyle: "hidden",
    frame: false, // Frameless window is harder to identify in screen sharing
    transparent: true, // Enable transparency for stealth mode
    // Set content protection from the start (always in stealth mode)
    contentProtection: true,
    // Type of window affects how it's treated by the OS
    type: "toolbar",
    // Additional stealth options
    skipTaskbar: false, // Show in taskbar
    autoHideMenuBar: false, // Show menu bar
    enableLargerThanScreen: false, // Prevent window from being larger than screen
    fullscreenable: true, // Allow fullscreen mode
  });

  // Wait until content is loaded before showing window - prevents white flash
  mainWindow.once("ready-to-show", () => {
    // Always show the window
    mainWindow.show();

    // Enable stealth mode
    enableStealthMode(mainWindow);
  });

  // Save window position and size when closed
  mainWindow.on("close", () => {
    const bounds = mainWindow.getBounds();
    userPrefs.windowBounds = {
      width: bounds.width,
      height: bounds.height,
    };
    userPrefs.windowPosition = {
      x: bounds.x,
      y: bounds.y,
    };
    saveUserPreferences(userPrefs);

    // Close WebSocket connection
    closeWebSocketConnection();
  });

  // Load the HTML file
  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  return mainWindow;
}

/**
 * Register global shortcuts
 * @param {Object} userPrefs - User preferences
 */
function registerGlobalShortcuts(userPrefs) {
  // Register screenshot shortcut
  globalShortcut.register(userPrefs.hotkey, () => takeScreenshot(mainWindow));

  // Register window visibility shortcut
  globalShortcut.register("CommandOrControl+Alt+S", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        // Hide window if it's currently visible
        mainWindow.hide();
      } else {
        // Show and focus window if it's currently hidden
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Register voice recording shortcut
  globalShortcut.register("Control+Shift+M", () => {
    if (mainWindow) {
      // Toggle recording state
      mainWindow.webContents.send("toggle-voice-recording");
      console.log("Voice recording toggled via hotkey Control+Shift+M");
    }
  });

  // Register application reset shortcut (Ctrl+Alt+R)
  globalShortcut.register("Control+Alt+R", () => {
    if (mainWindow) {
      mainWindow.webContents.send("reset-application");
      console.log("Application reset triggered via hotkey Control+Alt+R");
    }
  });
}

// App initialization
app.whenReady().then(() => {
  // Load user preferences
  const userPrefs = loadUserPreferences();

  // Set permission handler to automatically approve microphone access
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "media") {
        // Grant permission for microphone
        return callback(true);
      }
      // Deny other permission requests
      callback(false);
    }
  );

  // Create application menu
  createAppMenu(userPrefs);

  // Create main window
  createMainWindow(userPrefs);

  // Initialize WebSocket service
  initWebSocketService(mainWindow);

  // Register IPC handlers
  registerIpcHandlers(mainWindow, userPrefs);

  // Register global shortcuts
  registerGlobalShortcuts(userPrefs);
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS, re-create a window when the dock icon is clicked and no other windows are open
  if (BrowserWindow.getAllWindows().length === 0) {
    const userPrefs = loadUserPreferences();
    createMainWindow(userPrefs);
  }
});

app.on("will-quit", () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();

  // Close WebSocket connection
  closeWebSocketConnection();
});
