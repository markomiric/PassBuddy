/**
 * Stealth mode utilities
 *
 * Handles stealth mode functionality
 */
const { loadUserPreferences } = require("../services/preferences");

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
  mainWindow.setOpacity(0.5);

  // Set window type to utility on macOS to further reduce visibility
  if (process.platform === "darwin") {
    mainWindow.setWindowButtonVisibility(false);
    mainWindow.setVibrancy("under-window"); // Add vibrancy effect to blend with desktop
  }

  // We don't want click-through behavior
  // Make sure mouse events are NOT ignored
  mainWindow.setIgnoreMouseEvents(false);

  // Apply CSS to make the window more visible with a subtle border
  mainWindow.webContents
    .insertCSS(
      `
    body {
      box-shadow: 0 0 0 2px rgba(0, 128, 0, 0.5) !important;
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
