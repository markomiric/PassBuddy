/**
 * Screenshot service
 * 
 * Handles capturing screenshots
 */
const screenshot = require("screenshot-desktop");

/**
 * Take a screenshot
 * @param {BrowserWindow} mainWindow - The main application window
 * @returns {Promise<void>}
 */
async function takeScreenshot(mainWindow) {
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

module.exports = {
  takeScreenshot
};
