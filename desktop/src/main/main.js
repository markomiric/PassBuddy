/**
 * Main entry point for the Electron application
 */
const {
  app,
  globalShortcut,
  BrowserWindow,
  Menu,
  session,
  clipboard, // add clipboard import
  screen, // import screen for overlay positioning
} = require('electron');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Import services and utilities
const {
  loadUserPreferences,
  saveUserPreferences,
} = require('./services/preferences');
const { takeScreenshot } = require('./services/screenshot');
const {
  initWebSocketService,
  closeWebSocketConnection,
} = require('./services/websocket');
const { enableStealthMode } = require('./utils/stealth');
const { registerIpcHandlers } = require('./ipc/handlers');

let mainWindow;

/**
 * Create application menu
 * @param {Object} userPrefs - User preferences
 */
function createAppMenu(userPrefs) {
  const isMac = process.platform === 'darwin';

  const template = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Take Screenshot',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => {
            await takeScreenshot(mainWindow);
          },
        },
        { type: 'separator' },
        {
          label: 'Show Window',
          accelerator: 'CmdOrCtrl+Alt+S',
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          },
        },
        // Stealth mode is always enabled
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [{ role: 'delete' }, { role: 'selectAll' }]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
        { type: 'separator' },
        {
          label: 'Update API Key',
          click: () => {
            // Send a message to the renderer to show the API key dialog
            if (mainWindow) {
              mainWindow.webContents.send('show-api-key-dialog');
            }
          },
        },
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Screenshot AI',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal(
              'https://github.com/username/screenshot-ai'
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
    minWidth: 16,
    minHeight: 16,
    icon: path.join(__dirname, '../../assets/icons/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // Explicitly allow microphone access
      permissions: ['microphone'],
    },
    backgroundColor: '#00000000', // Transparent background
    show: false, // Don't show until ready-to-show
    alwaysOnTop: userPrefs.alwaysOnTop, // Use user preference for alwaysOnTop
    // Additional options to help prevent screen capture
    paintWhenInitiallyHidden: true,
    titleBarStyle: 'hidden',
    frame: false, // Frameless window is harder to identify in screen sharing
    transparent: true, // Enable transparency for stealth mode
    // Set content protection from the start (always in stealth mode)
    contentProtection: true,
    // Type of window affects how it's treated by the OS
    type: 'toolbar',
    // Additional stealth options
    skipTaskbar: false, // Show in taskbar
    autoHideMenuBar: false, // Show menu bar
    enableLargerThanScreen: false, // Prevent window from being larger than screen
    fullscreenable: true, // Allow fullscreen mode
  });

  // Wait until content is loaded before showing window - prevents white flash
  mainWindow.once('ready-to-show', () => {
    // Always show the window
    mainWindow.show();

    // Enable stealth mode
    enableStealthMode(mainWindow);
  });

  // Save window position and size when closed
  mainWindow.on('close', () => {
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
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools automatically
  // mainWindow.webContents.openDevTools();

  return mainWindow;
}

/**
 * Monitor clipboard for changes and send updates to renderer process
 */
async function startClipboardMonitoring() {
  let lastText = null;
  setInterval(() => {
    const text = clipboard.readText().trim();
    if (text && text !== lastText) {
      lastText = text;
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('clipboard-text', text);
      }
    }
  }, 1000);
}

/**
 * Register global shortcuts
 * @param {Object} userPrefs - User preferences
 */
function registerGlobalShortcuts(userPrefs) {
  // Register screenshot shortcut - explicitly using Control+Shift+S
  globalShortcut.register('CommandOrControl+Shift+S', () =>
    takeScreenshot(mainWindow)
  );

  // Also register the user's preferred hotkey if it's different
  if (userPrefs.hotkey && userPrefs.hotkey !== 'CommandOrControl+Shift+S') {
    globalShortcut.register(userPrefs.hotkey, () => takeScreenshot(mainWindow));
  }

  // Register window visibility shortcut
  globalShortcut.register('CommandOrControl+S', () => {
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
  globalShortcut.register('Control+R', () => {
    if (mainWindow) {
      // Toggle recording state
      mainWindow.webContents.send('toggle-voice-recording');
      console.log('Voice recording toggled via hotkey Control+R');
    }
  });

  // Register application reset shortcut (Ctrl+Alt+R)
  globalShortcut.register('Control+Shift+R', () => {
    if (mainWindow) {
      mainWindow.webContents.send('reset-application');
      console.log('Application reset triggered via hotkey Control+Shift+R');
    }
  });
}

// App initialization
app.whenReady().then(() => {
  // Load user preferences
  const userPrefs = loadUserPreferences();

  // Function to toggle between normal window and floating overlay mode
  function toggleOverlayMode() {
    if (!mainWindow) return;
    if (mainWindow.isOverlay) {
      // restore to normal bounds
      if (mainWindow.normalBounds)
        mainWindow.setBounds(mainWindow.normalBounds);
      mainWindow.isOverlay = false;
      mainWindow.setAlwaysOnTop(userPrefs.alwaysOnTop);
      mainWindow.setSkipTaskbar(false);
      mainWindow.show();
    } else {
      // enter overlay: store current bounds, size and position
      mainWindow.normalBounds = mainWindow.getBounds();
      const { workArea } = screen.getPrimaryDisplay();
      const overlayWidth = 200;
      const overlayHeight = 120;
      const x = workArea.x + workArea.width - overlayWidth - 20;
      const y = workArea.y + 20;
      mainWindow.setBounds({
        x,
        y,
        width: overlayWidth,
        height: overlayHeight,
      });
      mainWindow.isOverlay = true;
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.setSkipTaskbar(true);
      mainWindow.show();
    }
  }

  // Function to toggle between normal window and icon mode
  function toggleIconMode() {
    if (!mainWindow) return;
    if (mainWindow.isIconMode) {
      // restore to previous bounds
      if (mainWindow.normalBounds)
        mainWindow.setBounds(mainWindow.normalBounds);
      mainWindow.isIconMode = false;
      mainWindow.setAlwaysOnTop(userPrefs.alwaysOnTop);
      mainWindow.setSkipTaskbar(false);
      mainWindow.show();
    } else {
      // enter icon mode: store current bounds and resize
      mainWindow.normalBounds = mainWindow.getBounds();
      const { workArea } = screen.getPrimaryDisplay();
      const iconSize = 16;
      const x = workArea.x + workArea.width - iconSize - 20;
      const y = workArea.y + 20;
      mainWindow.setBounds({ x, y, width: iconSize, height: iconSize });
      mainWindow.isIconMode = true;
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.setSkipTaskbar(true);
      mainWindow.show();
    }
  }

  // Create application menu
  createAppMenu(userPrefs);

  // Create main window
  createMainWindow(userPrefs);

  // Intercept minimize to toggle overlay mode
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    toggleOverlayMode();
  });

  // Initialize WebSocket service
  initWebSocketService(mainWindow);

  // Start clipboard monitoring
  startClipboardMonitoring();

  // Register IPC handlers
  registerIpcHandlers(mainWindow, userPrefs);

  // Register global shortcuts
  registerGlobalShortcuts(userPrefs);

  // Add global shortcut to toggle icon mode
  globalShortcut.register('CommandOrControl+Alt+I', () => {
    toggleIconMode();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create a window when the dock icon is clicked and no other windows are open
  if (BrowserWindow.getAllWindows().length === 0) {
    const userPrefs = loadUserPreferences();
    createMainWindow(userPrefs);
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();

  // Close WebSocket connection
  closeWebSocketConnection();
});
