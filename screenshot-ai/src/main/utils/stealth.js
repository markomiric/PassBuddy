/**
 * Stealth mode utilities
 *
 * Handles stealth mode functionality
 */
const { loadUserPreferences } = require("../services/preferences");

// Store CSS key for later removal if needed
let stealthModeCSSKey;

/**
 * Enable stealth mode for the application window
 * @param {BrowserWindow} mainWindow - The main application window
 */
function enableStealthMode(mainWindow) {
  if (!mainWindow) return;

  console.log("Enabling stealth mode");

  // Set content protection to prevent window from appearing in screenshots/recordings
  mainWindow.setContentProtection(true);

  // Use Electron's built-in content protection feature
  // This works on both Windows and macOS
  console.log("Setting content protection to enabled");

  // Additional platform-specific settings
  if (process.platform === "darwin") {
    // On macOS, content protection is generally effective with these settings
    // Additional macOS-specific settings can be added here
  }

  // Get the current alwaysOnTop setting from user preferences
  const userPrefs = loadUserPreferences();
  // Set alwaysOnTop based on user preference, but use screen-saver level
  mainWindow.setAlwaysOnTop(userPrefs.alwaysOnTop, "screen-saver");
  mainWindow.setSkipTaskbar(false); // Show in taskbar for better visibility
  mainWindow.setOpacity(1.0); // Full opacity for the window itself, CSS will handle transparency

  // Set window type to utility on macOS to further reduce visibility
  if (process.platform === "darwin") {
    mainWindow.setWindowButtonVisibility(false);
    mainWindow.setVibrancy("under-window"); // Add vibrancy effect to blend with desktop
  }

  // We don't want click-through behavior
  // Make sure mouse events are NOT ignored
  mainWindow.setIgnoreMouseEvents(false);

  // Apply CSS to make the window transparent
  mainWindow.webContents
    .insertCSS(
      `
    body {
      background-color: transparent !important;
    }
    .app-container {
      background-color: transparent !important;
    }
    .container {
      background-color: transparent !important;
    }
  `
    )
    .then((key) => {
      // Store the CSS key for later removal
      stealthModeCSSKey = key;
      console.log("Stealth mode CSS applied with key:", key);
    })
    .catch((err) => console.log("CSS insertion error:", err));
}

module.exports = {
  enableStealthMode,
};
