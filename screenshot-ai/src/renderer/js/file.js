/**
 * File operations module
 *
 * Handles file upload and processing
 */

// Store the current file content
let currentFileContent = "";
let currentFileName = "";
let isFileContextActive = false; // Flag to indicate if file context should be used

/**
 * Open a file dialog and read the selected file
 * @returns {Promise<Object>} - The file data or null if canceled
 */
async function openFile() {
  try {
    // Show the file dialog
    const result = await window.electronAPI.openFileDialog();

    if (result.canceled) {
      console.log("File dialog canceled");
      return null;
    }

    // Store the file content
    currentFileContent = result.fileContent;
    currentFileName = result.fileName;

    console.log(
      `File loaded: ${currentFileName} (${currentFileContent.length} bytes)`
    );

    return {
      fileName: currentFileName,
      fileContent: currentFileContent,
    };
  } catch (error) {
    console.error("Error opening file:", error);
    window.uiModule.showError(`Error opening file: ${error.message}`);
    return null;
  }
}

/**
 * Get the current file content
 * @returns {Object} - The current file data or null if no file is loaded
 */
function getCurrentFile() {
  if (!currentFileContent) {
    return null;
  }

  return {
    fileName: currentFileName,
    fileContent: currentFileContent,
    isActive: isFileContextActive,
  };
}

/**
 * Set whether the file context is active
 * @param {boolean} active - Whether the file context should be active
 */
function setFileContextActive(active) {
  isFileContextActive = active;
  console.log(`File context ${active ? "activated" : "deactivated"}`);

  // Show notification
  if (active && currentFileName) {
    window.uiModule.showNotification(
      `File context activated: ${currentFileName}`,
      2000
    );
  } else if (!active && currentFileName) {
    window.uiModule.showNotification("File context deactivated", 2000);
  }

  return isFileContextActive;
}

/**
 * Toggle whether the file context is active
 * @returns {boolean} - The new state
 */
function toggleFileContextActive() {
  return setFileContextActive(!isFileContextActive);
}

/**
 * Clear the current file
 */
function clearFile() {
  currentFileContent = "";
  currentFileName = "";
  isFileContextActive = false;
  console.log("File cleared");
}

/**
 * Process the file content with GPT
 * @returns {Promise<string>} - The GPT response
 */
async function processFileWithGPT() {
  if (!currentFileContent) {
    window.uiModule.showError("No file loaded. Please upload a file first.");
    return null;
  }

  try {
    // Get the OCR text element
    const ocrTextElement = document.getElementById("ocr-text");

    // Set the file content as the OCR text
    if (ocrTextElement) {
      ocrTextElement.value = currentFileContent;
    }

    // Show the file content while waiting for GPT response
    const gptResponse = document.getElementById("gpt-response");
    if (gptResponse) {
      // Create a container with both file content and loading indicator
      gptResponse.innerHTML = `
        <div class="file-content-result">
          <h3>Sadržaj datoteke: ${currentFileName}</h3>
          <div class="file-content-text">${escapeHtml(currentFileContent)}</div>
        </div>
        <div class='loading-text'>
          <div class="loading-spinner"></div>
          Analiziram sadržaj datoteke...
        </div>
      `;

      // Add styles for the file content display if they don't exist
      if (!document.getElementById("file-content-styles")) {
        const style = document.createElement("style");
        style.id = "file-content-styles";
        style.textContent = `
          .file-content-result {
            margin-bottom: 20px;
            padding: 15px;
            background-color: rgba(0, 0, 0, 0.05);
            border-radius: 8px;
          }

          .file-content-result h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 16px;
            color: #555;
          }

          .file-content-text {
            font-size: 14px;
            line-height: 1.5;
            white-space: pre-wrap;
            max-height: 300px;
            overflow-y: auto;
            font-family: monospace;
          }

          [data-theme="dark"] .file-content-result {
            background-color: rgba(255, 255, 255, 0.05);
          }

          [data-theme="dark"] .file-content-result h3 {
            color: #aaa;
          }
        `;
        document.head.appendChild(style);
      }
    }

    // Send the file content to GPT
    return await window.ocrModule.sendToGPT(currentFileContent);
  } catch (error) {
    console.error("Error processing file:", error);
    window.uiModule.showError(`Error processing file: ${error.message}`);
    return null;
  }
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Export functions
window.fileModule = {
  openFile,
  getCurrentFile,
  clearFile,
  processFileWithGPT,
  setFileContextActive,
  toggleFileContextActive,
  // Getter for other modules to check if context is active
  isContextActive: () => isFileContextActive && currentFileContent.length > 0,
  // Getter for other modules to get the context - always return file content when available
  getContext: () =>
    currentFileContent.length > 0
      ? { fileName: currentFileName, fileContent: currentFileContent }
      : null,
};
