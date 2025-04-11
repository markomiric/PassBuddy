const {
  app,
  globalShortcut,
  BrowserWindow,
  ipcMain,
  Menu,
  session,
} = require("electron");
const WebSocket = require("ws");
const screenshot = require("screenshot-desktop");
const path = require("path");
const fs = require("fs");

// Load environment variables from .env file
require("dotenv").config();

let mainWindow;
let wsClient; // WebSocket client connection to relay server
let stealthModeCSSKey = null; // Key for stealth mode CSS

// Configuration
const RELAY_SERVER_URL = process.env.RELAY_SERVER_URL || "ws://localhost:3030";

// Function to connect to WebSocket relay server
function connectToRelayServer() {
  // Close existing connection if any
  if (wsClient) {
    wsClient.terminate();
  }

  console.log(`🔌 Connecting to WebSocket relay server at ${RELAY_SERVER_URL}`);

  // Send connecting status to renderer immediately
  if (mainWindow?.webContents) {
    mainWindow.webContents.send("connection-status-change", "connecting");
  }

  wsClient = new WebSocket(`${RELAY_SERVER_URL}?clientType=desktop`);

  // Set up WebSocket client events
  wsClient.on("open", () => {
    console.log("🟢 Connected to WebSocket relay server");

    // Start heartbeat
    startHeartbeat();

    // Update renderer about connection status
    if (mainWindow?.webContents) {
      mainWindow.webContents.send("connection-status-change", "connected");
    }
  });

  wsClient.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      handleMessage(data);
    } catch (err) {
      console.error("❌ Error handling message:", err);
    }
  });

  wsClient.on("close", () => {
    console.log("🔴 Disconnected from WebSocket relay server");

    // Update renderer about connection status
    if (mainWindow?.webContents) {
      mainWindow.webContents.send("connection-status-change", "disconnected");
    }

    // Try to reconnect after a delay
    setTimeout(connectToRelayServer, 5000);
  });

  wsClient.on("error", (error) => {
    console.error("❌ WebSocket error:", error);

    // Update renderer about connection status
    if (mainWindow?.webContents) {
      mainWindow.webContents.send("connection-status-change", "disconnected");
    }
  });
}

// Handle incoming messages from relay server
function handleMessage(message) {
  console.log("📥 Received message:", message.type);

  switch (message.type) {
    case "pong":
      // Heartbeat response
      break;

    case "screenshot_request":
      // Handle screenshot request
      takeScreenshot();
      break;

    default:
      console.log("📨 Unhandled message type:", message.type);
  }
}

// Start heartbeat for WebSocket connection
function startHeartbeat() {
  // Send a ping every 25 seconds
  const heartbeatInterval = setInterval(() => {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(
        JSON.stringify({
          type: "ping",
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 25000);

  // Store the interval so we can clear it if needed
  wsClient.heartbeatInterval = heartbeatInterval;
}

// Send a message to the relay server
function sendToRelayServer(message) {
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(
      JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
      })
    );
    return true;
  } else {
    console.warn("⚠️ Cannot send message - WebSocket not connected");
    return false;
  }
}

/**
 * Default application configuration
 *
 * These settings are used when the app is launched for the first time
 * or when a setting is not found in the saved preferences.
 */
const defaultConfig = {
  hotkey: "Control+Shift+S",
  darkMode: false,
  windowBounds: { width: 800, height: 600 }, // Smaller default size
  windowPosition: { x: undefined, y: undefined },
  stealthMode: true, // Always in stealth mode
};

// Load user preferences if they exist or use defaults
function loadUserPreferences() {
  try {
    const userDataPath = app.getPath("userData");
    const prefsPath = path.join(userDataPath, "preferences.json");

    if (fs.existsSync(prefsPath)) {
      const data = fs.readFileSync(prefsPath, "utf8");
      const prefs = JSON.parse(data);
      return { ...defaultConfig, ...prefs };
    }
  } catch (err) {
    console.error("Failed to load preferences:", err);
  }
  return defaultConfig;
}

// Save user preferences
function saveUserPreferences(prefs) {
  try {
    const userDataPath = app.getPath("userData");
    const prefsPath = path.join(userDataPath, "preferences.json");
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Failed to save preferences:", err);
    return false;
  }
}

// stealthModeCSSKey is declared at the top of the file

// Function to toggle stealth mode
function toggleStealthMode(enable) {
  if (!mainWindow) return;

  console.log(`${enable ? "Enabling" : "Disabling"} stealth mode`);

  // Set content protection to prevent window from appearing in screenshots/recordings
  mainWindow.setContentProtection(enable);

  // Use Electron's built-in content protection feature
  // This works on both Windows and macOS
  console.log(
    `Setting content protection to ${enable ? "enabled" : "disabled"}`
  );

  // Additional platform-specific settings
  if (process.platform === "darwin") {
    // On macOS, content protection is generally effective with these settings
    if (enable) {
      // Additional macOS-specific settings can be added here
    }
  }

  if (enable) {
    // When enabling stealth mode
    // Get the current alwaysOnTop setting from user preferences
    const userPrefs = loadUserPreferences();
    // Set alwaysOnTop based on user preference, but use screen-saver level
    mainWindow.setAlwaysOnTop(userPrefs.alwaysOnTop, "screen-saver");
    mainWindow.setSkipTaskbar(true); // Hide from taskbar
    mainWindow.setOpacity(0.5); // Slight transparency

    // Set window type to utility on macOS to further reduce visibility
    if (process.platform === "darwin") {
      mainWindow.setWindowButtonVisibility(false);
      mainWindow.setVibrancy("under-window"); // Add vibrancy effect to blend with desktop
    }

    // We don't want click-through behavior
    // Make sure mouse events are NOT ignored
    mainWindow.setIgnoreMouseEvents(false);

    // Apply CSS to make the window more visible but without the STEALTH MODE text
    mainWindow.webContents
      .insertCSS(
        `
      body {
        box-shadow: 0 0 0 1px #00ff00 !important;
      }
    `
      )
      .then((key) => {
        // Store the CSS key for later removal
        stealthModeCSSKey = key;
        console.log("Stealth mode CSS applied with key:", key);
      })
      .catch((err) => console.log("CSS insertion error:", err));
  } else {
    // When disabling stealth mode (this should never happen since we're always in stealth mode)
    // But we'll keep this code for completeness
    const userPrefs = loadUserPreferences();
    mainWindow.setAlwaysOnTop(userPrefs.alwaysOnTop);
    mainWindow.setSkipTaskbar(false);
    mainWindow.setOpacity(1.0);

    // Make sure mouse events are NOT ignored (disable click-through)
    mainWindow.setIgnoreMouseEvents(false);

    // Reset window type on macOS
    if (process.platform === "darwin") {
      mainWindow.setWindowButtonVisibility(true);
      mainWindow.setVibrancy(null); // Remove vibrancy effect
    }

    // Remove the stealth mode CSS if we have a key
    if (stealthModeCSSKey) {
      mainWindow.webContents
        .removeInsertedCSS(stealthModeCSSKey)
        .then(() => {
          console.log("Stealth mode CSS removed successfully");
          stealthModeCSSKey = null;
        })
        .catch((err) => {
          console.log("Error removing CSS:", err);
          // If removeInsertedCSS fails, just reload the window
          mainWindow.reload();
        });
    } else {
      // If we don't have a key, just reload the window
      mainWindow.reload();
    }
  }

  // Notify the renderer process about stealth mode change
  if (mainWindow.webContents) {
    mainWindow.webContents.send("stealth-mode-changed", enable);
  }
}

// Create application menu
function createAppMenu() {
  const isMac = process.platform === "darwin";
  const userPrefs = loadUserPreferences();

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
            await takeScreenshot();
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

// Function to take a screenshot (used by both shortcut and menu)
async function takeScreenshot() {
  if (!mainWindow) return;

  console.log("Taking screenshot...");
  try {
    // Capture the screenshot with a timeout to prevent hanging
    const img = await Promise.race([
      screenshot({ format: "png" }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Screenshot capture timed out")),
          5000
        )
      ),
    ]);

    // Send the captured screenshot to the renderer process
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(
        "screenshot-captured",
        img.toString("base64")
      );

      // Focus the window to make it prominent
      if (!mainWindow.isFocused()) {
        mainWindow.focus();
      }
    }
  } catch (e) {
    console.error("Screenshot failed:", e);

    // Notify the renderer process about the error
    if (mainWindow?.webContents) {
      mainWindow.webContents.send(
        "screenshot-error",
        e.message || "Failed to capture screenshot"
      );
    }
  }
}

app.whenReady().then(() => {
  // Load user preferences
  const userPrefs = loadUserPreferences();

  // Connect to relay server
  connectToRelayServer();

  // Create application menu
  createAppMenu();

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

  // Force specific window size regardless of saved preferences
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    x: userPrefs.windowPosition.x,
    y: userPrefs.windowPosition.y,
    minWidth: 600,
    minHeight: 500,
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      // Explicitly allow microphone access
      permissions: ["microphone"],
    },
    backgroundColor: userPrefs.darkMode ? "#1e1e1e" : "#f5f5f5",
    show: false, // Don't show until ready-to-show
    alwaysOnTop: userPrefs.alwaysOnTop, // Use user preference for alwaysOnTop
    // Additional options to help prevent screen capture
    paintWhenInitiallyHidden: true,
    titleBarStyle: "hidden",
    frame: false, // Frameless window is harder to identify in screen sharing
    transparent: false, // Transparency can sometimes cause issues with screen capture
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

    // Always enable stealth mode
    toggleStealthMode(true);
  });

  // Register global shortcut for toggling window visibility
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

  // Stealth mode is always enabled, no need for a toggle shortcut

  // Register IPC handlers
  ipcMain.handle("get-openai-key", () => {
    return process.env.OPENAI_API_KEY;
  });

  // Add handler for user preferences
  ipcMain.handle("get-user-preferences", () => {
    return userPrefs;
  });

  ipcMain.handle("save-user-preferences", (event, newPrefs) => {
    // Unregister the old hotkey before setting a new one
    if (newPrefs.hotkey && newPrefs.hotkey !== userPrefs.hotkey) {
      globalShortcut.unregister(userPrefs.hotkey);
      globalShortcut.register(newPrefs.hotkey, takeScreenshot);
    }

    // Handle always on top change
    if (newPrefs.alwaysOnTop !== userPrefs.alwaysOnTop) {
      // In stealth mode, we still respect the alwaysOnTop setting
      // but combine it with the stealth mode settings
      mainWindow.setAlwaysOnTop(newPrefs.alwaysOnTop);
    }

    // Handle stealth mode change
    if (newPrefs.stealthMode !== userPrefs.stealthMode) {
      toggleStealthMode(newPrefs.stealthMode);
      createAppMenu(); // Recreate menu to update checkbox state
    }

    // Update preferences and save
    Object.assign(userPrefs, newPrefs);
    return saveUserPreferences(userPrefs);
  });

  // Add handler to toggle stealth mode
  ipcMain.handle("toggle-stealth-mode", (event, enable) => {
    userPrefs.stealthMode = enable;
    saveUserPreferences(userPrefs); // Fixed: changed prefs to userPrefs
    toggleStealthMode(enable);
    createAppMenu(); // Recreate menu to update checkbox state
    return userPrefs.stealthMode;
  });

  // Add handler to send GPT responses to relay server
  ipcMain.handle("send-gpt-response", (event, response) => {
    console.log("📤 Sending GPT response to relay server");
    return sendToRelayServer({
      type: "gpt_response",
      data: response,
    });
  });

  // Add handler for window control (minimize, maximize, close)
  ipcMain.handle("window-control", (event, action) => {
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
      default:
        console.warn(`Unknown window control action: ${action}`);
        return false;
    }

    return true;
  });

  // Add handler for press-and-hold voice recording
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
    if (wsClient) {
      if (wsClient.heartbeatInterval) {
        clearInterval(wsClient.heartbeatInterval);
      }
      wsClient.terminate();
    }
  });

  // Register global shortcut
  globalShortcut.register(userPrefs.hotkey, takeScreenshot);

  // Register voice recording shortcut
  globalShortcut.register("Control+Shift+M", () => {
    if (mainWindow) {
      // Toggle recording state
      mainWindow.webContents.send("toggle-voice-recording");
      console.log("Voice recording toggled via hotkey Control+Shift+M");
    }
  });

  mainWindow.loadFile("index.html");
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();

  // Close WebSocket connection
  if (wsClient) {
    if (wsClient.heartbeatInterval) {
      clearInterval(wsClient.heartbeatInterval);
    }
    wsClient.terminate();
  }
});
