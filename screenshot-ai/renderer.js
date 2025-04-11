// We need to dynamically load Tesseract in the browser environment
document.addEventListener("DOMContentLoaded", async () => {
  // Load user preferences first
  try {
    const userPrefs = await window.electronAPI.getUserPreferences();
    applyUserPreferences(userPrefs);
  } catch (err) {
    console.error("Failed to load user preferences:", err);
  }

  // Set up event listeners for UI elements
  setupEventListeners();

  // Set default GPT prompt
  setDefaultPrompt();

  // Initialize OCR result panel
  initializeOcrPanel();

  // Setup voice recording event listener
  setupVoiceRecording();

  // Setup keyboard listeners for press-and-hold recording
  setupKeyboardListeners();

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
  updateStealthModeUI();

  // Listen for screenshot errors
  window.electronAPI.onScreenshotError((event, errorMessage) => {
    console.error("Screenshot error received:", errorMessage);
    showError("Screenshot failed: " + errorMessage);

    // Hide the loading indicator if it's showing
    const ocrTextElement = document.getElementById("ocr-text");
    if (ocrTextElement) {
      ocrTextElement.disabled = false;
      ocrTextElement.value = "Error capturing screenshot. Please try again.";
    }
  });

  // Listen for connection status changes
  window.electronAPI.onConnectionStatusChange((event, status) => {
    updateConnectionStatus(status);
  });

  // Set initial status to connecting
  updateConnectionStatus("connecting");
});

// Set the default GPT prompt
function setDefaultPrompt() {
  const defaultPrompt = `You are an expert software engineering lecturer responding to student questions or exam problems.

When given text from screenshots:
1. Directly provide concise, accurate answers - no theoretical explanations unless specifically requested
2. For coding questions, provide properly formatted, working code solutions
3. For mathematical problems, provide clean, correct formulas and calculations
4. Skip any introductory text or explanations - just provide the direct answer/solution
5. Format your response appropriately for the domain (code blocks for code, LaTeX-style for formulas)
6. Be authoritative and precise - like an expert lecturer giving model answers

Do not ask theoretical questions back to the user or provide lengthy explanations.`;

  const promptTextarea = document.getElementById("gpt-prompt");
  if (promptTextarea) {
    // Check if there's a saved prompt in localStorage
    const savedPrompt = localStorage.getItem("savedPrompt");
    if (savedPrompt) {
      promptTextarea.value = savedPrompt;
    } else {
      promptTextarea.value = defaultPrompt;
    }
  }
}

// Initialize panels
function initializeOcrPanel() {
  // Hide the GPT result panel initially
  const gptResult = document.getElementById("gpt-result");
  if (gptResult) {
    gptResult.style.display = "none";
  }

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

  // Set checkbox states
  const darkModeCheckbox = document.getElementById("dark-mode-checkbox");
  const alwaysOnTopCheckbox = document.getElementById("always-on-top-checkbox");
  const hideWindowCheckbox = document.getElementById("hide-window-checkbox");

  // Set initial checkbox states
  if (darkModeCheckbox) darkModeCheckbox.checked = prefs.darkMode;
  if (alwaysOnTopCheckbox) alwaysOnTopCheckbox.checked = prefs.alwaysOnTop;
  if (hideWindowCheckbox) hideWindowCheckbox.checked = prefs.hideWindow;

  console.log("Applied preferences:", {
    darkMode: prefs.darkMode,
    alwaysOnTop: prefs.alwaysOnTop,
    hideWindow: prefs.hideWindow,
  });

  // Display current hotkey
  const hotkeyDisplay = document.getElementById("hotkey-display");
  const hotkeyInput = document.getElementById("hotkey-input");
  if (hotkeyDisplay) hotkeyDisplay.textContent = prefs.hotkey;
  if (hotkeyInput) hotkeyInput.value = prefs.hotkey;

  // Always show stealth mode as active
  updateStealthModeUI();
}

// Update UI elements to show stealth mode is active
function updateStealthModeUI() {
  // Always show stealth mode indicator as active
  const stealthModeIndicator = document.getElementById(
    "stealth-mode-indicator"
  );

  if (stealthModeIndicator) {
    stealthModeIndicator.classList.remove("hidden");
    stealthModeIndicator.classList.add("active");
  }
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
    savePromptButton.addEventListener("click", () => {
      // Hide the prompt overlay
      promptOverlay.style.display = "none";

      // Save the prompt to localStorage for future use
      const promptTextarea = document.getElementById("gpt-prompt");
      if (promptTextarea && promptTextarea.value.trim()) {
        localStorage.setItem("savedPrompt", promptTextarea.value);
      }
    });
  }

  // Edit prompt toggle button (reset to default)
  const editPromptToggle = document.getElementById("edit-prompt-toggle");
  const promptTextarea = document.getElementById("gpt-prompt");

  if (editPromptToggle && promptTextarea) {
    editPromptToggle.addEventListener("click", () => {
      // Reset to default prompt
      const defaultPrompt = `You are an expert software engineering lecturer responding to student questions or exam problems.

When given text from screenshots:
1. Directly provide concise, accurate answers - no theoretical explanations unless specifically requested
2. For coding questions, provide properly formatted, working code solutions
3. For mathematical problems, provide clean, correct formulas and calculations
4. Skip any introductory text or explanations - just provide the direct answer/solution
5. Format your response appropriately for the domain (code blocks for code, LaTeX-style for formulas)
6. Be authoritative and precise - like an expert lecturer giving model answers

Do not ask theoretical questions back to the user or provide lengthy explanations.`;

      promptTextarea.value = defaultPrompt;
      localStorage.removeItem("savedPrompt");

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

// Initialize toggle switches to update their visual state immediately
function initializeToggleSwitches() {
  // Get individual toggle switches
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  const alwaysOnTopToggle = document.getElementById("always-on-top-toggle");
  const hideWindowToggle = document.getElementById("hide-window-toggle");

  // Add direct event listeners to each toggle for immediate visual feedback

  // Dark mode toggle
  if (darkModeToggle) {
    darkModeToggle.addEventListener("change", function () {
      console.log(`Dark mode toggle: ${this.checked}`);
      document.documentElement.setAttribute(
        "data-theme",
        this.checked ? "dark" : "light"
      );
    });
  }

  // Always on top toggle
  if (alwaysOnTopToggle) {
    alwaysOnTopToggle.addEventListener("change", function () {
      console.log(`Always on top toggle: ${this.checked}`);
      // Visual feedback only - actual setting is applied when saved
    });
  }

  // Hide window toggle
  if (hideWindowToggle) {
    hideWindowToggle.addEventListener("change", function () {
      console.log(`Hide window toggle: ${this.checked}`);
      // Visual feedback only - actual setting is applied when saved
    });
  }
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

// Update connection status UI with improved animation and visibility
function updateConnectionStatus(status) {
  const statusElement = document.querySelector(".connection-status");
  if (!statusElement) {
    console.error("Connection status element not found");
    return;
  }

  const statusIcon = statusElement.querySelector(".status-icon");
  const statusText = statusElement.querySelector(".status-text");

  if (!statusIcon || !statusText) {
    console.error("Status icon or text element not found");
    return;
  }

  // Remove all status classes first
  statusElement.classList.remove("connected", "connecting", "disconnected");

  switch (status) {
    case "connected":
      statusElement.classList.add("connected");
      statusText.textContent = "Connected";
      statusIcon.classList.remove("pulsing"); // Remove pulsing animation
      break;
    case "connecting":
      statusElement.classList.add("connecting");
      statusText.textContent = "Connecting...";
      statusIcon.classList.add("pulsing"); // Add pulsing animation
      break;
    case "disconnected":
      statusElement.classList.add("disconnected");
      statusText.textContent = "Disconnected";
      statusIcon.classList.remove("pulsing"); // Remove pulsing animation
      break;
    default:
      console.warn(`Unknown connection status: ${status}`);
      statusElement.classList.add("disconnected");
      statusText.textContent = "Unknown";
      statusIcon.classList.remove("pulsing"); // Remove pulsing animation
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
    performOCR(base64Img);
  } else {
    // Wait for Tesseract to load and then perform OCR
    const checkTesseract = setInterval(() => {
      if (window.Tesseract) {
        clearInterval(checkTesseract);
        performOCR(base64Img);
      }
    }, 100);
  }
});

// Function to perform OCR on the image
function performOCR(base64Img) {
  const ocrTextElement = document.getElementById("ocr-text");
  const gptResult = document.getElementById("gpt-result");
  const gptResponse = document.getElementById("gpt-response");

  // Show the GPT result panel and set loading state
  if (gptResult) {
    gptResult.style.display = "block";
  }

  if (gptResponse) {
    gptResponse.innerHTML =
      "<div class='loading-text'>Analyzing image...</div>";
  }

  window.Tesseract.recognize(`data:image/png;base64,${base64Img}`, "eng", {
    logger: (m) => console.log(m),
  })
    .then(({ data: { text } }) => {
      console.log("OCR Result:", text);

      if (text.trim() === "") {
        ocrTextElement.value = "No text was detected in this image.";
        if (gptResponse) {
          gptResponse.innerHTML =
            "<div class='error'>No text was detected in the image.</div>";
        }
      } else {
        const cleaned = cleanExtractedText(text);
        console.log("🧼 Cleaned OCR:", cleaned);
        ocrTextElement.value = cleaned;

        // Automatically start AI analysis
        sendToGPT(cleaned);
      }
    })
    .catch((err) => {
      console.error("OCR Error:", err);
      ocrTextElement.value = "Error analyzing image: " + err.message;
      if (gptResponse) {
        gptResponse.innerHTML = `<div class='error'>Error analyzing image: ${err.message}</div>`;
      }
    });
}

function cleanExtractedText(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return "";
  }

  // First pass - basic cleaning
  let cleaned = rawText
    // Remove control characters but keep newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Keep most special characters that are useful in code and math
    .replace(
      /[^\x20-\x7E\nčćžšđČĆŽŠĐa-zA-Z0-9.:,;?!()\[\]{}"'`@#$%^&*+=\-_<>~\/\\|\n\r\t ]/g,
      ""
    )
    // Fix common OCR errors
    .replace(/\b0\b/g, "O") // Replace standalone 0 with O (common OCR error)
    .replace(/\bl\b/g, "1") // Replace standalone l with 1 (common OCR error)
    .replace(/\bI\b/g, "1") // Replace standalone I with 1 (common OCR error in code)
    .replace(/\bS\b/g, "5") // Replace standalone S with 5 (common OCR error)
    .replace(/\bB\b/g, "8") // Replace standalone B with 8 (common OCR error)

    // Fix common programming syntax errors
    .replace(/\b1f\b/g, "if") // Fix common 'if' misread
    .replace(/\belse 1f\b/g, "else if") // Fix common 'else if' misread
    .replace(/\bfor 1\b/g, "for i") // Fix common 'for i' misread
    .replace(/\bwh1le\b/g, "while") // Fix common 'while' misread
    .replace(/\bfunct1on\b/g, "function") // Fix common 'function' misread
    .replace(/\bpr1nt\b/g, "print") // Fix common 'print' misread
    .replace(/\bimporl\b/g, "import") // Fix common 'import' misread
    .replace(/\brelurn\b/g, "return") // Fix common 'return' misread

    // Fix common math symbols and expressions
    .replace(/\bpi\b/g, "π") // Replace 'pi' with π symbol
    .replace(/\balpha\b/g, "α") // Replace 'alpha' with α symbol
    .replace(/\bbeta\b/g, "β") // Replace 'beta' with β symbol
    .replace(/\bdelta\b/g, "δ") // Replace 'delta' with δ symbol
    .replace(/\bsigma\b/g, "σ") // Replace 'sigma' with σ symbol

    // Fix common punctuation errors
    .replace(/\,\s*\}/g, " }") // Fix comma before closing brace
    .replace(/\{\s*\,/g, "{ ") // Fix comma after opening brace
    .replace(/([^\s])\{/g, "$1 {") // Add space before opening brace if missing
    .replace(/\}([^\s,;\.])/g, "} $1") // Add space after closing brace if missing

    // Replace multiple spaces with a single space
    .replace(/ +/g, " ")
    // Replace multiple newlines with a maximum of two
    .replace(/\n{3,}/g, "\n\n")
    // Trim whitespace from the beginning and end
    .trim();

  // Second pass - fix code blocks
  cleaned = fixCodeBlocks(cleaned);

  return cleaned;
}

// Helper function to detect and fix code blocks
function fixCodeBlocks(text) {
  // Detect if the text is likely code (contains multiple lines with brackets, semicolons, etc.)
  const codeIndicators = [
    /[\{\}\[\]\(\);]/g, // Brackets, parentheses, semicolons
    /\b(function|class|if|for|while|return|var|let|const)\b/g, // Common programming keywords
    /\b(int|float|double|string|boolean|void)\b/g, // Common type declarations
    /\b(public|private|protected|static)\b/g, // Common access modifiers
  ];

  let isLikelyCode = false;
  const lines = text.split("\n");

  // Check if multiple lines contain code indicators
  let codeLineCount = 0;
  for (const line of lines) {
    for (const pattern of codeIndicators) {
      if (pattern.test(line)) {
        codeLineCount++;
        break;
      }
    }
  }

  // If more than 30% of lines look like code, treat as code block
  isLikelyCode = codeLineCount > lines.length * 0.3;

  if (isLikelyCode) {
    // Fix common code formatting issues
    return (
      text
        // Ensure proper spacing around operators
        .replace(/([a-zA-Z0-9])([+\-*/%=<>!&|^])/g, "$1 $2")
        .replace(/([+\-*/%=<>!&|^])([a-zA-Z0-9])/g, "$1 $2")
        // Fix missing semicolons in JavaScript/Java/C-like languages
        .replace(
          /([a-zA-Z0-9\)\}])\s*\n\s*([a-zA-Z\{])/g,
          (match, before, after) => {
            // Don't add semicolons before blocks or after keywords that don't need them
            if (
              after === "{" ||
              /\b(if|for|while|function|class)\b/.test(before)
            ) {
              return `${before}\n${after}`;
            }
            return `${before};\n${after}`;
          }
        )
        // Fix common bracket issues
        .replace(/\(\s+/g, "(") // Remove space after opening parenthesis
        .replace(/\s+\)/g, ")") // Remove space before closing parenthesis
        .replace(/\[\s+/g, "[") // Remove space after opening bracket
        .replace(/\s+\]/g, "]")
    ); // Remove space before closing bracket
  }

  return text;
}

async function sendToGPT(text) {
  // Get API key from main process
  const apiKey = await window.electronAPI.getOpenAIKey();
  if (!apiKey) {
    showError("OpenAI API key not found. Please check your .env file.");
    return;
  }

  // Get user-defined prompt from localStorage or use default
  const savedPrompt = localStorage.getItem("savedPrompt");
  const defaultPrompt = document.getElementById("gpt-prompt").value;
  const userPrompt = savedPrompt || defaultPrompt;

  if (!userPrompt) {
    showError("Please provide a prompt for the AI.");
    return;
  }

  // Get the GPT response element
  const gptResponse = document.getElementById("gpt-response");

  const body = {
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: userPrompt,
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0.3,
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || `API Error: ${response.status}`);
    }

    const gptReply = result.choices?.[0]?.message?.content || "[No response]";

    console.log("🤖 GPT Reply:", gptReply);

    // Process the GPT reply to handle markdown formatting
    gptResponse.innerHTML = formatGptResponse(gptReply);

    // Send the response through the main process to relay server
    window.electronAPI.sendGptResponse(gptReply);

    // Render MathJax for LaTeX content
    renderMathJax();
    return gptReply;
  } catch (err) {
    console.error("GPT API Error:", err);
    gptResponse.innerHTML = `<div class="error">Error: ${err.message}</div>`;
    throw err;
  }
}

// Function to format GPT response with proper code highlighting and markdown
function formatGptResponse(text) {
  // Simple markdown formatting
  let formatted = text
    // Code blocks with language
    .replace(/```(\w+)?\n([\s\S]*?)```/g, function (match, lang, code) {
      return `<pre class="code ${
        lang || ""
      }"><code>${escapeHtml(code.trim())}</code></pre>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    // Line breaks
    .replace(/\n/g, "<br>");

  return formatted;
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

// Setup voice recording with MediaRecorder API
function setupVoiceRecording() {
  // Listen for the voice recording event from the main process
  window.electronAPI.onStartVoiceRecording(() => {
    startVoiceRecording();
  });

  window.electronAPI.onStopVoiceRecording(() => {
    stopRecording();
  });

  // Handle toggle recording event - this is the new simpler approach
  window.electronAPI.onToggleVoiceRecording(() => {
    if (recordingInProgress) {
      stopRecording();
    } else {
      startVoiceRecording();
    }
  });
}

// Global variables for voice recording
let recordingIndicator = null;
let recordingInProgress = false;
let mediaRecorder = null;
let audioChunks = [];
let recordingStream = null;

// Function to create visual recording indicator
function createRecordingIndicator() {
  if (!recordingIndicator) {
    recordingIndicator = document.createElement("div");
    recordingIndicator.className = "recording-indicator";
    recordingIndicator.innerHTML = '<div class="recording-pulse"></div>';
    document.body.appendChild(recordingIndicator);

    // Add styles for the recording indicator if they don't exist
    if (!document.getElementById("recording-indicator-styles")) {
      const style = document.createElement("style");
      style.id = "recording-indicator-styles";
      style.textContent = `
        .recording-indicator {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: rgba(255, 59, 48, 0.8);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .recording-pulse {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: #ff3b30;
          animation: pulse 1.5s infinite ease-in-out;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(0.8);
            opacity: 0.8;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  recordingIndicator.style.display = "flex";
}

// Function to start voice recording with MediaRecorder API
async function startVoiceRecording() {
  // Prevent multiple recordings
  if (recordingInProgress) {
    return;
  }

  try {
    // Request microphone access
    recordingStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    // Create MediaRecorder
    mediaRecorder = new MediaRecorder(recordingStream);
    audioChunks = [];

    // Create and show recording indicator
    createRecordingIndicator();

    recordingInProgress = true;

    // Show recording indicator
    const gptResponse = document.getElementById("gpt-response");
    if (gptResponse) {
      gptResponse.innerHTML = `<div class='loading-text'>
        Recording your voice...<br>
        Press Ctrl+Shift+M again to stop recording
      </div>`;

      // Make sure the response area is visible
      const gptResult = document.getElementById("gpt-result");
      if (gptResult) gptResult.style.display = "block";
    }

    // Show notification
    showNotification(
      "Recording started - Press Ctrl+Shift+M again to stop",
      3000
    );

    // Listen for data from recorder
    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    });

    // Handle recorder stop event
    mediaRecorder.addEventListener("stop", async () => {
      console.log("MediaRecorder stopped event fired");

      // Process the collected audio chunks if we have any
      if (audioChunks.length > 0) {
        try {
          // Show processing message
          if (gptResponse) {
            gptResponse.innerHTML =
              "<div class='loading-text'>Transcribing audio...</div>";
          }

          const transcript = await transcribeAudio(audioChunks);

          if (transcript && transcript.trim()) {
            console.log("Final voice transcription:", transcript);

            // Update the OCR text area with the final transcription
            const ocrTextElement = document.getElementById("ocr-text");
            if (ocrTextElement) {
              ocrTextElement.value = transcript;
            }

            // Show processing message
            if (gptResponse) {
              gptResponse.innerHTML =
                "<div class='loading-text'>Processing your message...</div>";
            }

            // Send the transcription to the LLM
            sendToGPT(transcript);
          } else {
            // No meaningful transcription was captured
            if (gptResponse) {
              gptResponse.innerHTML =
                "<div class='error'>No speech was detected in the recording.</div>";
            }
            showError("No speech detected in the recording.");
          }
        } catch (error) {
          console.error("Transcription error:", error);
          if (gptResponse) {
            gptResponse.innerHTML = `<div class='error'>Error processing audio: ${error.message}</div>`;
          }
          showError("Error processing audio: " + error.message);
        }
      } else {
        // No audio chunks collected
        if (gptResponse) {
          gptResponse.innerHTML =
            "<div class='error'>No audio was recorded.</div>";
        }
        showError(
          "No audio was recorded. Please check your microphone settings."
        );
      }

      // Clean up
      cleanupRecording();
    });

    // Start recording
    mediaRecorder.start();
    console.log("Voice recording started");
  } catch (error) {
    console.error("Media access error:", error);
    showError("Could not access microphone: " + error.message);
    cleanupRecording();
  }
}

// Function to stop recording
function stopRecording() {
  console.log(
    "stopRecording called, recording in progress:",
    recordingInProgress
  );

  if (!recordingInProgress) {
    return;
  }

  // Stop the media recorder if it exists and is recording
  if (mediaRecorder && mediaRecorder.state === "recording") {
    console.log("Stopping mediaRecorder...");
    try {
      mediaRecorder.stop();
      // The 'stop' event handler will process the recording
    } catch (error) {
      console.error("Error stopping mediaRecorder:", error);
      cleanupRecording();
    }
  } else {
    console.log("MediaRecorder is not active or not in recording state");
    cleanupRecording();
  }

  showNotification("Recording stopped", 2000);
}

// Helper to clean up recording resources
function cleanupRecording() {
  console.log("Cleaning up recording resources");
  recordingInProgress = false;

  // Stop all tracks in the stream if it exists
  if (recordingStream) {
    recordingStream.getTracks().forEach((track) => {
      track.stop();
      console.log("Audio track stopped");
    });
    recordingStream = null;
  }

  // Hide recording indicator
  if (recordingIndicator) {
    recordingIndicator.style.display = "none";
  }

  // Reset media recorder
  mediaRecorder = null;
}

// Remove the keyboard event listeners since we're using a toggle approach now
// We'll leave setupKeyboardListeners function but make it empty to avoid errors
function setupKeyboardListeners() {
  // This function is now empty as we're using the toggle approach
  console.log("Using toggle-based recording instead of keyboard events");
}

// Function to transcribe audio using OpenAI's Whisper API
async function transcribeAudio(audioChunks) {
  // Create a blob from the audio chunks
  const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

  // Get API key from main process
  const apiKey = await window.electronAPI.getOpenAIKey();
  if (!apiKey) {
    throw new Error("OpenAI API key not found. Please check your .env file.");
  }

  // Create FormData to send to the API
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "hr"); // Set language to Croatian

  // Send to OpenAI Whisper API
  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error?.message || `API Error: ${response.status}`
    );
  }

  const result = await response.json();
  return result.text;
}
