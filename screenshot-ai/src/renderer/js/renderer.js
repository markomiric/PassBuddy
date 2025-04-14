/**
 * Main renderer script
 *
 * Initializes the application and sets up event listeners
 */

// We need to dynamically load Tesseract in the browser environment
document.addEventListener("DOMContentLoaded", async () => {
  // Load user preferences first
  try {
    const userPrefs = await window.electronAPI.getUserPreferences();
    window.uiModule.applyUserPreferences(userPrefs);

    // Check if we need to show the API key prompt
    if (userPrefs.showApiKeyPrompt) {
      // Get current API keys and model
      const openaiKey = (await window.electronAPI.getOpenAIKey()) || "";
      const deepseekKey = (await window.electronAPI.getDeepSeekKey()) || "";
      const currentModel = userPrefs.selectedModel || "gpt-4o";

      // Show API settings dialog
      const result = await window.apiSettingsModule.showApiSettingsDialog(
        openaiKey,
        deepseekKey,
        currentModel
      );

      // If user provided settings, save them
      if (result) {
        if (result.openaiKey) {
          await window.electronAPI.saveOpenAIKey(result.openaiKey);
        }
        if (result.deepseekKey) {
          await window.electronAPI.saveDeepSeekKey(result.deepseekKey);
        }
        if (result.selectedModel) {
          await window.electronAPI.saveSelectedModel(result.selectedModel);
          window.apiSettingsModule.setCurrentModel(result.selectedModel);
        }
        console.log("API settings saved successfully");
      }
    }
  } catch (err) {
    console.error("Failed to load user preferences:", err);
  }

  // Set up event listeners for UI elements
  window.uiModule.setupEventListeners();

  // Set up file upload button
  setupFileUpload();

  // Set default GPT prompt
  window.uiModule.setDefaultPrompt();

  // Initialize OCR result panel
  window.uiModule.initializeOcrPanel();

  // Setup voice recording event listener
  window.voiceModule.setupVoiceRecording();

  // Initialize API settings
  initializeApiSettings();

  // Setup keyboard listeners for press-and-hold recording
  window.voiceModule.setupKeyboardListeners();

  // Create a script element to load Tesseract.js from a CDN
  const script = document.createElement("script");
  script.src = "https://unpkg.com/tesseract.js@v4.0.2/dist/tesseract.min.js";
  script.onload = () => {
    console.log("Tesseract.js loaded successfully");
  };
  script.onerror = (err) => {
    console.error("Failed to load Tesseract.js:", err);
  };
  document.head.appendChild(script);

  // Stealth mode is always enabled
  window.uiModule.updateStealthModeUI();

  // Listen for screenshot errors
  window.electronAPI.onScreenshotError((event, errorMessage) => {
    console.error("Screenshot error received:", errorMessage);
    window.uiModule.showError("Screenshot failed: " + errorMessage);

    // Hide the loading indicator if it's showing
    const ocrTextElement = document.getElementById("ocr-text");
    if (ocrTextElement) {
      ocrTextElement.disabled = false;
      ocrTextElement.value = "Error capturing screenshot. Please try again.";
    }
  });

  // Listen for connection status changes
  window.electronAPI.onConnectionStatusChange((event, status) => {
    window.uiModule.updateConnectionStatus(status);
  });

  // Set initial status to connecting
  window.uiModule.updateConnectionStatus("connecting");

  // Listen for API key dialog request from the main process
  window.electronAPI.onShowApiKeyDialog(async () => {
    try {
      // Get current API keys and model
      const openaiKey = (await window.electronAPI.getOpenAIKey()) || "";
      const deepseekKey = (await window.electronAPI.getDeepSeekKey()) || "";
      const currentModel = window.apiSettingsModule.getCurrentModel();

      // Show API settings dialog
      const result = await window.apiSettingsModule.showApiSettingsDialog(
        openaiKey,
        deepseekKey,
        currentModel
      );

      // If user provided settings, save them
      if (result) {
        if (result.openaiKey) {
          await window.electronAPI.saveOpenAIKey(result.openaiKey);
        }
        if (result.deepseekKey) {
          await window.electronAPI.saveDeepSeekKey(result.deepseekKey);
        }
        if (result.selectedModel) {
          await window.electronAPI.saveSelectedModel(result.selectedModel);
          window.apiSettingsModule.setCurrentModel(result.selectedModel);
          window.apiSettingsModule.showModelIndicator();
        }
        window.uiModule.showNotification(
          "API settings updated successfully",
          2000
        );
      }
    } catch (err) {
      console.error("Error updating API settings:", err);
      window.uiModule.showError(
        "Failed to update API settings: " + err.message
      );
    }
  });

  // Listen for application reset request from the main process
  window.electronAPI.onResetApplication(() => {
    console.log("Reset application event received");
    window.uiModule.resetApplication();
  });
});

// Set up file upload functionality
function setupFileUpload() {
  const uploadButton = document.getElementById("upload-file");
  const fileNameElement = document.getElementById("file-name");
  const contextToggle = document.getElementById("file-context-toggle");

  if (uploadButton && fileNameElement) {
    uploadButton.addEventListener("click", async () => {
      try {
        // Open file dialog
        const fileData = await window.fileModule.openFile();

        if (fileData) {
          // Update the file name display
          fileNameElement.textContent = fileData.fileName;
          fileNameElement.classList.add("has-file");

          // Enable the context toggle and set it to checked
          if (contextToggle) {
            contextToggle.disabled = false;
            contextToggle.checked = true;

            // Activate the file context
            window.fileModule.setFileContextActive(true);
          }

          // Set the file upload prompt
          const fileUploadPrompt = `You are an advanced AI assistant designed to perform at the highest level on academic and professional tests. You must answer user questions as accurately and thoroughly as possible, using both your own knowledge and the content provided in an uploaded file. When relevant, ground your answers in the file, but feel free to enhance them with your broader knowledge.

When answering:
- Prioritize accuracy and clarity.
- Cite the file content if it directly supports your answer.
- If the file content contradicts known facts, explain the discrepancy.
- If the file is unrelated to the question, fall back on your own knowledge.

Always aim to provide the most complete and insightful answer possible.`;

          // Update the prompt textarea
          const promptTextarea = document.getElementById("gpt-prompt");
          if (promptTextarea) {
            promptTextarea.value = fileUploadPrompt;
            // Save to localStorage
            localStorage.setItem("savedPrompt", fileUploadPrompt);
          }

          // Show notification
          window.uiModule.showNotification(
            `File loaded: ${fileData.fileName}`,
            2000
          );
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        window.uiModule.showError(`Error uploading file: ${error.message}`);
      }
    });
  }

  // Set up the context toggle
  if (contextToggle) {
    // Initially disable the toggle if no file is loaded
    const fileData = window.fileModule.getCurrentFile();
    contextToggle.disabled = !fileData;

    // Set initial state based on file context
    if (fileData && fileData.isActive) {
      contextToggle.checked = true;
    }

    // Add event listener for toggle changes
    contextToggle.addEventListener("change", () => {
      window.fileModule.setFileContextActive(contextToggle.checked);
    });
  }
}

// Listen for screenshot events from the main process
window.electronAPI.onScreenshotCaptured((event, base64Img) => {
  console.log("Screenshot received in renderer");

  const img = document.getElementById("preview");
  img.src = "data:image/png;base64," + base64Img;
  // Don't display the image, but keep it in the DOM for reference
  img.style.display = "none";

  // Get the OCR text element
  const ocrTextElement = document.getElementById("ocr-text");

  // Set loading state in the textarea
  ocrTextElement.value = "Analyzing image...";
  ocrTextElement.disabled = true;

  // Make sure Tesseract is loaded before attempting OCR
  if (window.Tesseract) {
    window.ocrModule.performOCR(base64Img);
  } else {
    // Wait for Tesseract to load and then perform OCR
    const checkTesseract = setInterval(() => {
      if (window.Tesseract) {
        clearInterval(checkTesseract);
        window.ocrModule.performOCR(base64Img);
      }
    }, 100);
  }
});

/**
 * Initialize API settings
 */
function initializeApiSettings() {
  // Load the selected model from localStorage or preferences
  window.electronAPI
    .getSelectedModel()
    .then((model) => {
      window.apiSettingsModule.setCurrentModel(model);
      console.log(`Initialized with model: ${model}`);

      // Show model indicator
      window.apiSettingsModule.showModelIndicator();
    })
    .catch((err) => {
      console.error("Error loading model settings:", err);
    });

  // Add model settings button to the UI
  const container = document.querySelector(".window-controls");
  if (container) {
    const modelButton = document.createElement("button");
    modelButton.id = "model-settings";
    modelButton.className = "window-control-button model-settings";
    modelButton.title = "AI Model Settings";
    modelButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></svg>`;

    // Add event listener
    modelButton.addEventListener("click", async () => {
      try {
        // Get current API keys and model
        const openaiKey = (await window.electronAPI.getOpenAIKey()) || "";
        const deepseekKey = (await window.electronAPI.getDeepSeekKey()) || "";
        const currentModel = window.apiSettingsModule.getCurrentModel();

        // Show API settings dialog
        const result = await window.apiSettingsModule.showApiSettingsDialog(
          openaiKey,
          deepseekKey,
          currentModel
        );

        // If user provided settings, save them
        if (result) {
          if (result.openaiKey) {
            await window.electronAPI.saveOpenAIKey(result.openaiKey);
          }
          if (result.deepseekKey) {
            await window.electronAPI.saveDeepSeekKey(result.deepseekKey);
          }
          if (result.selectedModel) {
            await window.electronAPI.saveSelectedModel(result.selectedModel);
            window.apiSettingsModule.setCurrentModel(result.selectedModel);
            window.apiSettingsModule.showModelIndicator();
          }
          console.log("API settings saved successfully");
        }
      } catch (err) {
        console.error("Error updating API settings:", err);
        window.uiModule.showError(
          "Failed to update API settings: " + err.message
        );
      }
    });

    // Add button to the container
    container.insertBefore(modelButton, container.firstChild);

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
      .model-settings {
        margin-right: auto; /* Push to the left */
      }
    `;
    document.head.appendChild(style);
  }
}
