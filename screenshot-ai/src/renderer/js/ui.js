/**
 * UI functionality
 *
 * Handles UI interactions and event listeners
 */

// Initialize panels
function initializeOcrPanel() {
  // Show the prompt overlay on startup
  const promptOverlay = document.getElementById("prompt-overlay");
  if (promptOverlay) {
    promptOverlay.style.display = "flex";
  }
}

// Apply user preferences to the UI
function applyUserPreferences(prefs) {
  // Apply dark mode setting
  document.documentElement.setAttribute(
    "data-theme",
    prefs.darkMode ? "dark" : "light"
  );

  // Display current hotkey
  const hotkeyDisplay = document.getElementById("hotkey-display");
  if (hotkeyDisplay) hotkeyDisplay.textContent = prefs.hotkey;

  console.log("Applied preferences:", {
    darkMode: prefs.darkMode,
    hotkey: prefs.hotkey,
  });
}

// Stealth mode is always enabled, no UI needed
function updateStealthModeUI() {
  // Function kept for compatibility
  console.log("Stealth mode is always enabled");
}

/**
 * Shows a temporary notification to the user.
 *
 * @param {string} message - The message to display in the notification
 * @param {number} [duration=2000] - Duration in milliseconds to show the notification
 * @param {boolean} [isError=false] - Whether this is an error notification
 * @returns {HTMLElement} - The notification element
 */
function showNotification(message, duration = 2000, isError = false) {
  // Create notification element if it doesn't exist
  let notification = document.getElementById("app-notification");

  if (!notification) {
    notification = document.createElement("div");
    notification.id = "app-notification";

    // Apply styles using a class instead of inline styles
    notification.classList.add("app-notification");

    // Create a style element if it doesn't exist
    if (!document.getElementById("notification-styles")) {
      const styleEl = document.createElement("style");
      styleEl.id = "notification-styles";
      styleEl.textContent = `
        .app-notification {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 12px 24px;
          border-radius: 6px;
          z-index: 9999;
          transition: opacity 0.3s, transform 0.3s;
          opacity: 0;
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          text-align: center;
          max-width: 80%;
          pointer-events: none; /* Allow clicking through the notification */
        }

        .app-notification.visible {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .app-notification.error {
          background-color: rgba(220, 53, 69, 0.9);
          border-left: 4px solid #dc3545;
        }

        .app-notification.success {
          background-color: rgba(40, 167, 69, 0.9);
          border-left: 4px solid #28a745;
        }
      `;
      document.head.appendChild(styleEl);
    }

    document.body.appendChild(notification);
  }

  // Clear any existing timeout
  if (notification.hideTimeout) {
    clearTimeout(notification.hideTimeout);
    notification.hideTimeout = null;
  }

  // Set message and show notification
  notification.textContent = message;
  notification.classList.remove("error", "success");

  // Add appropriate class based on type
  if (isError) {
    notification.classList.add("error");
  }

  // Force a reflow to ensure the transition works
  notification.offsetHeight;

  // Show the notification
  notification.classList.add("visible");

  // Hide after specified duration
  notification.hideTimeout = setTimeout(() => {
    notification.classList.remove("visible");
  }, duration);

  return notification;
}

// Set up all event listeners
function setupEventListeners() {
  // Initialize window controls for frameless window
  initializeWindowControls();

  // Initialize toggle switches
  initializeToggleSwitches();

  // Add keyboard shortcut for toggling dark mode (Alt+D)
  document.addEventListener("keydown", async (event) => {
    // Check for Alt+D keyboard shortcut
    if (event.altKey && event.key === "d") {
      try {
        // Get current preferences
        const prefs = await window.electronAPI.getUserPreferences();

        // Toggle dark mode
        const newDarkMode = !prefs.darkMode;

        // Update the UI
        document.documentElement.setAttribute(
          "data-theme",
          newDarkMode ? "dark" : "light"
        );

        // Save the new preference
        const newPrefs = {
          ...prefs,
          darkMode: newDarkMode,
        };

        console.log("Toggling dark mode to:", newDarkMode);
        await window.electronAPI.saveUserPreferences(newPrefs);

        // Show a brief notification
        showNotification(
          `Dark mode ${newDarkMode ? "enabled" : "disabled"} (Alt+D)`,
          1500
        );
      } catch (err) {
        console.error("Error toggling dark mode with hotkey:", err);
      }
    }
  });

  // Dark mode toggle
  const darkModeToggle = document.getElementById("dark-mode-toggle");

  if (darkModeToggle) {
    darkModeToggle.addEventListener("click", async () => {
      try {
        // Get current preferences
        const prefs = await window.electronAPI.getUserPreferences();

        // Toggle dark mode
        const newDarkMode = !prefs.darkMode;

        // Update the UI
        document.documentElement.setAttribute(
          "data-theme",
          newDarkMode ? "dark" : "light"
        );

        // Save the new preference
        const newPrefs = {
          ...prefs,
          darkMode: newDarkMode,
        };

        console.log("Toggling dark mode to:", newDarkMode);
        await window.electronAPI.saveUserPreferences(newPrefs);
      } catch (err) {
        console.error("Error toggling dark mode:", err);
      }
    });
  }

  // Save prompt button event listener
  const savePromptButton = document.getElementById("save-prompt");
  const promptOverlay = document.getElementById("prompt-overlay");

  if (savePromptButton && promptOverlay) {
    savePromptButton.addEventListener("click", async () => {
      // Hide the prompt overlay
      promptOverlay.style.display = "none";

      // Save the prompt to localStorage for future use
      const promptTextarea = document.getElementById("gpt-prompt");
      if (promptTextarea && promptTextarea.value.trim()) {
        localStorage.setItem("savedPrompt", promptTextarea.value);
      }

      // Check if a file is loaded and process it
      const fileData = window.fileModule.getCurrentFile();
      if (fileData) {
        try {
          // Process the file with GPT
          await window.fileModule.processFileWithGPT();

          // Show notification
          showNotification(`Processing file: ${fileData.fileName}`, 2000);

          // If file context is active, show a persistent indicator
          if (window.fileModule.isContextActive()) {
            showFileContextIndicator();
          }
        } catch (error) {
          console.error("Error processing file:", error);
          showError(`Error processing file: ${error.message}`);
        }
      }
    });
  }

  // Edit prompt toggle button (reset to default)
  const editPromptToggle = document.getElementById("edit-prompt-toggle");
  const promptTextarea = document.getElementById("gpt-prompt");

  if (editPromptToggle && promptTextarea) {
    editPromptToggle.addEventListener("click", () => {
      // Check if a file is loaded to determine which default prompt to use
      const fileData =
        window.fileModule && window.fileModule.getCurrentFile
          ? window.fileModule.getCurrentFile()
          : null;
      const isFileLoaded = fileData && fileData.fileName;

      let defaultPrompt;

      if (isFileLoaded) {
        // Use file upload default prompt
        defaultPrompt = `Ti si napredni AI asistent osmišljen za postizanje najviših rezultata na akademskim i stručnim testovima. Na korisnička pitanja moraš odgovarati što točnije i temeljitije, koristeći i vlastito znanje i sadržaj iz priložene datoteke. Kada je to primjenjivo, temelji svoj odgovor na sadržaju datoteke, ali slobodno ga nadopuni vlastitim širim znanjem.

Prilikom odgovaranja:
- Daj prednost točnosti i jasnoći.
- Citiraj sadržaj datoteke ako izravno podupire tvoj odgovor.
- Ako sadržaj datoteke proturječi poznatim činjenicama, objasni tu razliku.
- Ako datoteka nije relevantna za pitanje, oslanjaj se na vlastito znanje.

Uvijek nastoj dati što potpuniji i dublji odgovor.
Odgovaraj uvijek na hrvatskom jeziku. Kombiniraj znanje iz datoteke i vlastito znanje za najbolji odgovor.`;
      } else {
        // Use standard default prompt
        defaultPrompt = `Ti si vrhunski stručnjak za softversko inženjerstvo s dubinskim znanjem programiranja, dizajna sustava, arhitekture, DevOpsa, testiranja, sigurnosti i modernih razvojnih praksi. Možeš odgovoriti na bilo koje pitanje iz područja softverskog inženjerstva, bilo da je teorijsko ili praktično, za početnike ili napredne korisnike.

Uvijek:
- Daješ jasne, točne i promišljene odgovore.
- Objašnjavaš složene teme na jednostavan i razumljiv način.
- Dijeliš najbolje prakse i upozoravaš na česte greške.
- Uključuješ primjere ili isječke koda kada je to korisno.
- Koristiš profesionalan, ali pristupačan ton.

Ovdje si kako bi pomogao s problemima u kodiranju, arhitektonskim odlukama, debuggiranju, preporukama alata i svime što je vezano uz razvoj softvera. Odgovaraj na svako pitanje kao da mentoriraš sposobnog programera koji očekuje stručni, kvalitetan uvid.

Odgovaraj uvijek na hrvatskom jeziku. Kombiniraj znanje iz datoteke i vlastito znanje za najbolji odgovor.`;
      }

      promptTextarea.value = defaultPrompt;
      localStorage.setItem("savedPrompt", defaultPrompt);

      // Show a brief success message
      showToast(editPromptToggle, "Default prompt restored");
    });
  }

  // Quick Start panel close button
  const closeInstructionsButton = document.getElementById("close-instructions");
  const quickStartPanel = document.getElementById("quick-start-panel");

  if (closeInstructionsButton && quickStartPanel) {
    closeInstructionsButton.addEventListener("click", () => {
      quickStartPanel.classList.add("hidden");
      // Save the preference to localStorage so it stays hidden on reload
      localStorage.setItem("hideQuickStart", "true");
    });

    // Check if we should hide the quick start panel based on previous preference
    if (localStorage.getItem("hideQuickStart") === "true") {
      quickStartPanel.classList.add("hidden");
    }
  }

  // Copy text buttons
  const copyOcrButton = document.getElementById("copy-ocr");
  const copyGptButton = document.getElementById("copy-gpt");

  if (copyOcrButton) {
    copyOcrButton.addEventListener("click", () => {
      const ocrText = document.getElementById("ocr-text");
      copyToClipboard(ocrText.value);
      showCopyToast(copyOcrButton);
    });
  }

  if (copyGptButton) {
    copyGptButton.addEventListener("click", () => {
      const gptResponse = document.getElementById("gpt-response");
      // Get the text without HTML tags
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = gptResponse.innerHTML;
      copyToClipboard(tempDiv.textContent);
      showCopyToast(copyGptButton);
    });
  }
}

// Initialize window controls for frameless window
function initializeWindowControls() {
  const minimizeButton = document.getElementById("window-minimize");
  const maximizeButton = document.getElementById("window-maximize");
  const closeButton = document.getElementById("window-close");

  if (minimizeButton) {
    minimizeButton.addEventListener("click", () => {
      window.electronAPI.windowControl("minimize");
    });
  }

  if (maximizeButton) {
    maximizeButton.addEventListener("click", () => {
      window.electronAPI.windowControl("maximize");
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      window.electronAPI.windowControl("close");
    });
  }
}

// Initialize toggle switches - simplified version
function initializeToggleSwitches() {
  // Function kept for compatibility
  console.log("Toggle switches initialization skipped - simplified UI");
}

// Helper function to show a brief toast when content is copied
function showCopyToast(button) {
  const originalHTML = button.innerHTML;
  button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  setTimeout(() => {
    button.innerHTML = originalHTML;
  }, 1500);
}

// Helper function to show a toast message
function showToast(element, message) {
  const originalTitle = element.getAttribute("title");
  element.setAttribute("title", message);
  setTimeout(() => {
    element.setAttribute("title", originalTitle);
  }, 1500);
}

// Helper function to show error messages
function showError(message) {
  // Create or update error message element
  let errorDiv = document.querySelector(".error-message");
  if (!errorDiv) {
    errorDiv = document.createElement("div");
    errorDiv.className = "error-message error";
    errorDiv.style.marginBottom = "15px";
    const container = document.querySelector(".container");
    container.insertBefore(errorDiv, document.getElementById("ocr-result"));
  }

  errorDiv.textContent = message;

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorDiv && errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

// Helper function to copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      console.log("Text copied to clipboard");
    })
    .catch((err) => {
      console.error("Could not copy text: ", err);
      showError("Failed to copy text: " + err.message);
    });
}

/**
 * Show a persistent indicator that file context is active
 */
function showFileContextIndicator() {
  // Remove any existing indicator
  removeFileContextIndicator();

  // Get the file data
  const fileData = window.fileModule.getCurrentFile();
  if (!fileData) return;

  // Create the indicator element
  const indicator = document.createElement("div");
  indicator.id = "file-context-indicator";
  indicator.className = "file-context-indicator";

  // Add the file name and a close button
  indicator.innerHTML = `
    <div class="indicator-content">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
      <span class="indicator-text">Using context: ${fileData.fileName}</span>
    </div>
    <button class="indicator-close" title="Disable file context">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  // Add styles if they don't exist
  if (!document.getElementById("file-context-indicator-styles")) {
    const style = document.createElement("style");
    style.id = "file-context-indicator-styles";
    style.textContent = `
      .file-context-indicator {
        position: fixed;
        bottom: 70px; /* Moved up to avoid overlap with model indicator */
        right: 20px;
        background-color: var(--primary-color);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        font-size: 14px;
        opacity: 0.5; /* Added opacity */
        transition: opacity 0.2s ease; /* Smooth transition for hover effect */
      }

      .file-context-indicator:hover {
        opacity: 1; /* Full opacity on hover */
      }

      .indicator-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .indicator-text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
      }

      .indicator-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        transition: opacity 0.2s;
      }

      .indicator-close:hover {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  // Add the indicator to the document
  document.body.appendChild(indicator);

  // Add event listener to the close button
  const closeButton = indicator.querySelector(".indicator-close");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      // Disable file context
      window.fileModule.setFileContextActive(false);

      // Update the toggle in the prompt panel if it exists
      const contextToggle = document.getElementById("file-context-toggle");
      if (contextToggle) {
        contextToggle.checked = false;
      }

      // Remove the indicator
      removeFileContextIndicator();
    });
  }
}

/**
 * Remove the file context indicator
 */
function removeFileContextIndicator() {
  const indicator = document.getElementById("file-context-indicator");
  if (indicator && indicator.parentNode) {
    indicator.parentNode.removeChild(indicator);
  }
}

// Update connection status - simplified version
function updateConnectionStatus(status) {
  // Just log the status since we removed the UI element
  console.log(`Connection status: ${status}`);
}

/**
 * Reset the application to its initial state
 * This function resets all state without requiring a restart
 */
function resetApplication() {
  console.log("Resetting application state...");

  // Clear any file context
  if (window.fileModule && window.fileModule.clearFile) {
    window.fileModule.clearFile();
    removeFileContextIndicator();
  }

  // Reset the OCR text area
  const ocrTextElement = document.getElementById("ocr-text");
  if (ocrTextElement) {
    ocrTextElement.value = "";
  }

  // Clear the GPT response
  const gptResponse = document.getElementById("gpt-response");
  if (gptResponse) {
    gptResponse.innerHTML = "";
  }

  // Reset the file name display
  const fileNameElement = document.getElementById("file-name");
  if (fileNameElement) {
    fileNameElement.textContent = "No file selected";
    fileNameElement.classList.remove("has-file");
  }

  // Reset the file context toggle
  const contextToggle = document.getElementById("file-context-toggle");
  if (contextToggle) {
    contextToggle.checked = false;
    contextToggle.disabled = true;
  }

  // Show the prompt overlay
  const promptOverlay = document.getElementById("prompt-overlay");
  if (promptOverlay) {
    promptOverlay.style.display = "flex";
  }

  // Reset to default prompt
  setDefaultPrompt();

  // Show notification
  showNotification("Application reset to initial state", 2000);
}

// Set the default GPT prompt
function setDefaultPrompt() {
  // Standard default prompt for screenshots
  const standardDefaultPrompt = `Ti si vrhunski stručnjak za softversko inženjerstvo s dubinskim znanjem programiranja, dizajna sustava, arhitekture, DevOpsa, testiranja, sigurnosti i modernih razvojnih praksi. Možeš odgovoriti na bilo koje pitanje iz područja softverskog inženjerstva, bilo da je teorijsko ili praktično, za početnike ili napredne korisnike.
Uvijek:
- Daješ jasne, točne i promišljene odgovore.
- Objašnjavaš složene teme na jednostavan i razumljiv način.
- Dijeliš najbolje prakse i upozoravaš na česte greške.
- Uključuješ primjere ili isječke koda kada je to korisno.
- Koristiš profesionalan, ali pristupačan ton.

Ovdje si kako bi pomogao s problemima u kodiranju, arhitektonskim odlukama, debuggiranju, preporukama alata i svime što je vezano uz razvoj softvera. Odgovaraj na svako pitanje kao da mentoriraš sposobnog programera koji očekuje stručni, kvalitetan uvid.

Odgovaraj uvijek na hrvatskom jeziku. Kombiniraj znanje iz datoteke i vlastito znanje za najbolji odgovor.`;

  // File upload default prompt
  const fileUploadDefaultPrompt = `Ti si napredni AI asistent osmišljen za postizanje najviših rezultata na akademskim i stručnim testovima. Na korisnička pitanja moraš odgovarati što točnije i temeljitije, koristeći i vlastito znanje i sadržaj iz priložene datoteke. Kada je to primjenjivo, temelji svoj odgovor na sadržaju datoteke, ali slobodno ga nadopuni vlastitim širim znanjem.
Prilikom odgovaranja:
- Daj prednost točnosti i jasnoći.
- Citiraj sadržaj datoteke ako izravno podupire tvoj odgovor.
- Ako sadržaj datoteke proturječi poznatim činjenicama, objasni tu razliku.
- Ako datoteka nije relevantna za pitanje, oslanjaj se na vlastito znanje.

Uvijek nastoj dati što potpuniji i dublji odgovor.
Odgovaraj uvijek na hrvatskom jeziku. Kombiniraj znanje iz datoteke i vlastito znanje za najbolji odgovor.`;

  const promptTextarea = document.getElementById("gpt-prompt");
  if (promptTextarea) {
    // Check if there's a saved prompt in localStorage
    const savedPrompt = localStorage.getItem("savedPrompt");

    // Check if a file is loaded
    const fileData =
      window.fileModule && window.fileModule.getCurrentFile
        ? window.fileModule.getCurrentFile()
        : null;
    const isFileLoaded = fileData && fileData.fileName;

    if (savedPrompt) {
      promptTextarea.value = savedPrompt;
    } else if (isFileLoaded) {
      // Use file upload prompt if a file is loaded
      promptTextarea.value = fileUploadDefaultPrompt;
      // Save this prompt to localStorage
      localStorage.setItem("savedPrompt", fileUploadDefaultPrompt);
    } else {
      // Use standard prompt for screenshots
      promptTextarea.value = standardDefaultPrompt;
    }
  }
}

/**
 * Shows a dialog to input or update the OpenAI API key
 * @param {string} currentKey - The current API key (if any)
 * @returns {Promise<string>} - A promise that resolves to the entered API key
 */
async function showApiKeyDialog(currentKey = "") {
  return new Promise((resolve) => {
    // Create the dialog overlay
    const overlay = document.createElement("div");
    overlay.className = "api-key-overlay";

    // Create the dialog content
    const dialog = document.createElement("div");
    dialog.className = "api-key-dialog";

    // Add the dialog title
    const title = document.createElement("h2");
    title.textContent = currentKey
      ? "Update OpenAI API Key"
      : "Enter OpenAI API Key";
    dialog.appendChild(title);

    // Add description
    const description = document.createElement("p");
    description.innerHTML = `
      To use this application, you need to provide your OpenAI API key.<br>
      You can get one from <a href="#" id="open-openai-link">https://platform.openai.com/api-keys</a>
    `;
    dialog.appendChild(description);

    // Add input field
    const inputContainer = document.createElement("div");
    inputContainer.className = "api-key-input-container";

    const input = document.createElement("input");
    input.type = "password";
    input.className = "api-key-input";
    input.placeholder = "sk-...";
    input.value = currentKey || "";
    inputContainer.appendChild(input);

    // Add toggle visibility button
    const toggleButton = document.createElement("button");
    toggleButton.className = "toggle-visibility-button";
    toggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    toggleButton.title = "Toggle visibility";
    toggleButton.addEventListener("click", () => {
      if (input.type === "password") {
        input.type = "text";
        toggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"></line>`;
      } else {
        input.type = "password";
        toggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    });
    inputContainer.appendChild(toggleButton);

    dialog.appendChild(inputContainer);

    // Add buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "api-key-button-container";

    const cancelButton = document.createElement("button");
    cancelButton.className = "api-key-button cancel";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      document.body.removeChild(overlay);
      resolve(null); // User canceled
    });
    buttonContainer.appendChild(cancelButton);

    const saveButton = document.createElement("button");
    saveButton.className = "api-key-button save";
    saveButton.textContent = "Save";
    saveButton.addEventListener("click", () => {
      const apiKey = input.value.trim();
      document.body.removeChild(overlay);
      resolve(apiKey);
    });
    buttonContainer.appendChild(saveButton);

    dialog.appendChild(buttonContainer);

    // Add the dialog to the overlay
    overlay.appendChild(dialog);

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
      .api-key-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }

      .api-key-dialog {
        background-color: white;
        border-radius: 8px;
        padding: 24px;
        width: 500px;
        max-width: 90%;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .api-key-dialog h2 {
        margin-top: 0;
        margin-bottom: 16px;
        font-size: 20px;
        color: #333;
      }

      .api-key-dialog p {
        margin-bottom: 20px;
        line-height: 1.5;
        color: #555;
      }

      .api-key-dialog a {
        color: #007bff;
        text-decoration: none;
      }

      .api-key-dialog a:hover {
        text-decoration: underline;
      }

      .api-key-input-container {
        position: relative;
        margin-bottom: 20px;
      }

      .api-key-input {
        width: 100%;
        padding: 10px 40px 10px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 16px;
        box-sizing: border-box;
      }

      .toggle-visibility-button {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        color: #777;
        padding: 4px;
      }

      .toggle-visibility-button:hover {
        color: #333;
      }

      .api-key-button-container {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      .api-key-button {
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        border: none;
      }

      .api-key-button.cancel {
        background-color: #f1f1f1;
        color: #333;
      }

      .api-key-button.save {
        background-color: #007bff;
        color: white;
      }

      .api-key-button:hover {
        opacity: 0.9;
      }

      [data-theme="dark"] .api-key-dialog {
        background-color: #222;
        color: #eee;
      }

      [data-theme="dark"] .api-key-dialog h2 {
        color: #eee;
      }

      [data-theme="dark"] .api-key-dialog p {
        color: #ccc;
      }

      [data-theme="dark"] .api-key-input {
        background-color: #333;
        border-color: #444;
        color: #eee;
      }

      [data-theme="dark"] .api-key-button.cancel {
        background-color: #444;
        color: #eee;
      }
    `;
    document.head.appendChild(style);

    // Add the overlay to the document
    document.body.appendChild(overlay);

    // Focus the input field
    input.focus();

    // Add event listener for the OpenAI link
    document
      .getElementById("open-openai-link")
      .addEventListener("click", (e) => {
        e.preventDefault();
        window.electronAPI.windowControl(
          "open-url",
          "https://platform.openai.com/api-keys"
        );
      });

    // Add event listener for Enter key
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        saveButton.click();
      }
    });
  });
}

// Export functions
window.uiModule = {
  initializeOcrPanel,
  applyUserPreferences,
  updateStealthModeUI,
  showNotification,
  setupEventListeners,
  initializeWindowControls,
  initializeToggleSwitches,
  showCopyToast,
  showToast,
  showError,
  copyToClipboard,
  updateConnectionStatus,
  setDefaultPrompt,
  showApiKeyDialog,
  showFileContextIndicator,
  removeFileContextIndicator,
  resetApplication,
};
