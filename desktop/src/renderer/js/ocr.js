/**
 * OCR functionality
 *
 * Handles OCR text extraction and processing
 */

// Function to perform OCR on the image
function performOCR(base64Img) {
  const ocrTextElement = document.getElementById("ocr-text");
  const gptResponse = document.getElementById("gpt-response");

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

        // Show the extracted text while waiting for GPT response
        if (gptResponse) {
          // Create a container with both extracted text and loading indicator
          gptResponse.innerHTML = `
            <div class="extracted-text-result">
              <h3>Extracted text:</h3>
              <div class="extracted-text">${cleaned}</div>
            </div>
            <div class='loading-text'>
              <div class="loading-spinner"></div>
              Analyzing text...
            </div>
          `;

          // Add styles for the extracted text display if they don't exist
          if (!document.getElementById("extracted-text-styles")) {
            const style = document.createElement("style");
            style.id = "extracted-text-styles";
            style.textContent = `
              .extracted-text-result {
                margin-bottom: 20px;
                padding: 15px;
                background-color: rgba(0, 0, 0, 0.05);
                border-radius: 8px;
              }

              .extracted-text-result h3 {
                margin-top: 0;
                margin-bottom: 10px;
                font-size: 16px;
                color: #555;
              }

              .extracted-text {
                font-size: 16px;
                line-height: 1.5;
                white-space: pre-wrap;
                max-height: 300px;
                overflow-y: auto;
              }

              .loading-spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                margin-right: 10px;
                border: 3px solid rgba(0, 0, 0, 0.1);
                border-radius: 50%;
                border-top-color: #3498db;
                animation: spin 1s ease-in-out infinite;
                vertical-align: middle;
              }

              @keyframes spin {
                to { transform: rotate(360deg); }
              }

              [data-theme="dark"] .extracted-text-result {
                background-color: rgba(255, 255, 255, 0.05);
              }

              [data-theme="dark"] .extracted-text-result h3 {
                color: #aaa;
              }
            `;
            document.head.appendChild(style);
          }
        }

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
          (_, before, after) => {
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
  // Get the selected model
  const selectedModel = window.apiSettingsModule.getCurrentModel();
  console.log(`Using model: ${selectedModel}`);

  // Get the appropriate API key based on the selected model
  let apiKey;
  if (selectedModel === "gpt-4o") {
    apiKey = await window.electronAPI.getOpenAIKey();
    if (!apiKey) {
      // Show error and prompt for API key
      showError("OpenAI API key not found. Please enter your API key.");

      // Show API settings dialog
      const openaiKey = (await window.electronAPI.getOpenAIKey()) || "";
      const deepseekKey = (await window.electronAPI.getDeepSeekKey()) || "";
      const geminiKey = (await window.electronAPI.getGeminiKey()) || "";
      const result = await window.apiSettingsModule.showApiSettingsDialog(
        openaiKey,
        deepseekKey,
        geminiKey,
        selectedModel
      );

      // If user provided settings, save them and continue
      if (result) {
        if (result.openaiKey) {
          await window.electronAPI.saveOpenAIKey(result.openaiKey);
        }
        if (result.deepseekKey) {
          await window.electronAPI.saveDeepSeekKey(result.deepseekKey);
        }
        if (result.geminiKey) {
          await window.electronAPI.saveGeminiKey(result.geminiKey);
        }
        if (result.selectedModel) {
          await window.electronAPI.saveSelectedModel(result.selectedModel);
          window.apiSettingsModule.setCurrentModel(result.selectedModel);
          window.apiSettingsModule.showModelIndicator();
        }
        console.log("API settings saved successfully");
        // Use the new settings
        return sendToGPT(text); // Retry with the new settings
      } else {
        // User canceled, show error
        showError("API key is required to use this feature.");
        return;
      }
    }
  } else if (selectedModel === "deepseek-chat") {
    apiKey = await window.electronAPI.getDeepSeekKey();
    if (!apiKey) {
      // Show error and prompt for API key
      showError("DeepSeek API key not found. Please enter your API key.");

      // Show API settings dialog
      const openaiKey = (await window.electronAPI.getOpenAIKey()) || "";
      const deepseekKey = (await window.electronAPI.getDeepSeekKey()) || "";
      const geminiKey = (await window.electronAPI.getGeminiKey()) || "";
      const result = await window.apiSettingsModule.showApiSettingsDialog(
        openaiKey,
        deepseekKey,
        geminiKey,
        selectedModel
      );

      // If user provided settings, save them and continue
      if (result) {
        if (result.openaiKey) {
          await window.electronAPI.saveOpenAIKey(result.openaiKey);
        }
        if (result.deepseekKey) {
          await window.electronAPI.saveDeepSeekKey(result.deepseekKey);
        }
        if (result.geminiKey) {
          await window.electronAPI.saveGeminiKey(result.geminiKey);
        }
        if (result.selectedModel) {
          await window.electronAPI.saveSelectedModel(result.selectedModel);
          window.apiSettingsModule.setCurrentModel(result.selectedModel);
          window.apiSettingsModule.showModelIndicator();
        }
        console.log("API settings saved successfully");
        // Use the new settings
        return sendToGPT(text); // Retry with the new settings
      } else {
        // User canceled, show error
        showError("API key is required to use this feature.");
        return;
      }
    }
  } else if (selectedModel === "gemini-2.0-flash") {
    apiKey = await window.electronAPI.getGeminiKey();
    if (!apiKey || !apiKey.startsWith("AIza")) {
      // Show error and prompt for API key
      showError(
        "Google Gemini API key not found or invalid. Please enter a valid API key starting with 'AIza'."
      );

      // Show API settings dialog
      const openaiKey = (await window.electronAPI.getOpenAIKey()) || "";
      const deepseekKey = (await window.electronAPI.getDeepSeekKey()) || "";
      const geminiKey = (await window.electronAPI.getGeminiKey()) || "";
      const result = await window.apiSettingsModule.showApiSettingsDialog(
        openaiKey,
        deepseekKey,
        geminiKey,
        selectedModel
      );

      // If user provided settings, save them and continue
      if (result) {
        if (result.openaiKey) {
          await window.electronAPI.saveOpenAIKey(result.openaiKey);
        }
        if (result.deepseekKey) {
          await window.electronAPI.saveDeepSeekKey(result.deepseekKey);
        }
        if (result.geminiKey) {
          await window.electronAPI.saveGeminiKey(result.geminiKey);
        }
        if (result.selectedModel) {
          await window.electronAPI.saveSelectedModel(result.selectedModel);
          window.apiSettingsModule.setCurrentModel(result.selectedModel);
          window.apiSettingsModule.showModelIndicator();
        }
        console.log("API settings saved successfully");
        // Use the new settings
        return sendToGPT(text); // Retry with the new settings
      } else {
        // User canceled, show error
        showError("API key is required to use this feature.");
        return;
      }
    }
  } else {
    showError(`Unsupported model: ${selectedModel}`);
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

  // Check if we have an active file context
  const fileContext =
    window.fileModule && window.fileModule.getContext
      ? window.fileModule.getContext()
      : null;

  // Prepare messages array
  const messages = [
    {
      role: "system",
      content:
        "Odgovaraj uvijek na hrvatskom jeziku. Budi kratak, jasan, strukturiran i pametan u odgovorima. Piši kao stručnjak, ali prirodno i ljudski. Ako postoji datoteka, koristi je kao kontekst, ali koristi i vlastito znanje za najbolji odgovor.",
    },
  ];

  // Add user message, structured naturally
  if (fileContext) {
    messages.push({
      role: "user",
      content: `Pročitaj sadržaj datoteke \"${fileContext.fileName}\":\n${fileContext.fileContent}\n\nMoje pitanje: ${text}`,
    });
  } else {
    messages.push({
      role: "user",
      content: text,
    });
  }

  // Get model configuration
  const modelConfig = await window.electronAPI.getModelConfig();
  console.log(
    "Model config received from main process:",
    JSON.stringify(modelConfig, null, 2)
  );
  console.log("Selected model:", selectedModel);

  // Make sure we have a valid configuration for the selected model
  if (!modelConfig[selectedModel]) {
    showError(`No configuration found for model: ${selectedModel}`);
    return;
  }

  const config = modelConfig[selectedModel];

  // Determine the appropriate temperature for DeepSeek model based on content
  let temperature = config.temperature;
  let contentType = null;
  if (selectedModel === "deepseek-chat" && window.contentAnalyzerModule) {
    // Analyze the content to determine the type
    contentType = window.contentAnalyzerModule.analyzeContent(text);

    // Get the recommended temperature based on content type
    if (config.temperatureSettings) {
      temperature = window.contentAnalyzerModule.getRecommendedTemperature(
        contentType,
        config.temperatureSettings
      );
      console.log(
        `Content type detected: ${contentType}, using temperature: ${temperature}`
      );

      // Update the model indicator with content type and temperature
      if (
        window.apiSettingsModule &&
        window.apiSettingsModule.showModelIndicator
      ) {
        window.apiSettingsModule.showModelIndicator(contentType, temperature);
      }
    }
  }

  console.log(
    `Sending to ${config.provider} with model ${selectedModel}:`,
    messages
  );

  // Debug the config object
  console.log("Config object:", JSON.stringify(config, null, 2));

  try {
    let gptReply;

    console.log(
      "Provider check:",
      config.provider,
      typeof config.provider,
      (config.provider || "").toLowerCase() === "google"
    );
    if ((config.provider || "").toLowerCase() === "google") {
      console.log("Entering Gemini code path");
      // Use the Gemini client with the Google GenAI SDK
      // Extract the user's query (the last message)
      let userQuery = "";
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          userQuery = messages[i].content;
          break;
        }
      }

      // If we didn't find a user message, use a default
      if (!userQuery) {
        userQuery = "Please analyze this text.";
      }

      try {
        // Directly use the window.geminiClient object
        console.log("Checking for window.geminiClient...");
        if (!window.geminiClient || !window.geminiClient.sendToGemini) {
          console.error(
            "window.geminiClient not found or missing sendToGemini function"
          );

          // Try to dynamically import as a fallback
          console.log(
            "Attempting to import Gemini client module as fallback..."
          );
          const geminiModule = await import("./gemini-client.js");
          console.log("Gemini module imported:", geminiModule);

          // Create the window.geminiClient object if it doesn't exist
          window.geminiClient = window.geminiClient || {};
          window.geminiClient.sendToGemini = geminiModule.sendToGemini;

          if (!window.geminiClient.sendToGemini) {
            console.error("Failed to set up window.geminiClient.sendToGemini");
            throw new Error("Could not initialize Gemini client");
          }
        }

        // Call the Gemini API using the client
        console.log("Calling sendToGemini with:", {
          apiKey: apiKey
            ? `${apiKey.substring(0, 4)}...${apiKey.substring(
                apiKey.length - 4
              )}`
            : "undefined",
          model: selectedModel,
          queryLength: userQuery ? userQuery.length : 0,
          temperature: temperature,
        });

        gptReply = await window.geminiClient.sendToGemini(
          apiKey,
          selectedModel,
          userQuery,
          temperature
        );
        console.log(
          "Received reply from Gemini:",
          gptReply ? gptReply.substring(0, 50) + "..." : "undefined"
        );
      } catch (geminiError) {
        console.error("Gemini API Error:", geminiError);
        throw new Error(
          `Gemini API Error: ${geminiError.message || "Unknown error"}`
        );
      }
    } else {
      // Format for OpenAI and DeepSeek APIs
      const apiEndpoint = `${config.baseURL}/v1/chat/completions`;
      const body = {
        model: selectedModel,
        messages: messages,
        temperature: temperature,
      };

      console.log(`Using API endpoint: ${apiEndpoint}`);

      // Set up headers
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || `API Error: ${response.status}`
        );
      }

      gptReply = result.choices?.[0]?.message?.content || "[No response]";
    }

    console.log(`🤖 ${config.provider.toUpperCase()} Reply:`, gptReply);

    // Process the GPT reply to handle markdown formatting
    gptResponse.innerHTML = formatGptResponse(gptReply);

    // Send the response through the main process to relay server
    window.electronAPI.sendGptResponse(gptReply);

    // Render MathJax for LaTeX content
    renderMathJax();
    return gptReply;
  } catch (err) {
    console.error("API Error:", err);

    // Add more detailed error information for debugging
    if (config.provider === "google") {
      console.error("Gemini API Error Details:", {
        error: err.toString(),
        stack: err.stack,
      });

      // Show a more helpful error message to the user with a fallback option
      gptResponse.innerHTML = `<div class="error">
        <p>Error connecting to Google Gemini API: ${err.message}</p>
        <p>Please check:</p>
        <ul>
          <li>Your API key is correct and starts with "AIza..."</li>
          <li>You have enabled the Gemini API in your Google Cloud project</li>
          <li>Your API key has the necessary permissions</li>
        </ul>
        <p><button id="fallback-to-gpt" class="fallback-button">Try with GPT-4o instead</button></p>
      </div>`;

      // Add event listener for the fallback button
      setTimeout(() => {
        const fallbackButton = document.getElementById("fallback-to-gpt");
        if (fallbackButton) {
          fallbackButton.addEventListener("click", async () => {
            // Switch to GPT-4o and retry
            await window.electronAPI.saveSelectedModel("gpt-4o");
            window.apiSettingsModule.setCurrentModel("gpt-4o");
            window.apiSettingsModule.showModelIndicator();
            gptResponse.innerHTML =
              '<div class="loading-text">Retrying with GPT-4o...</div>';
            // Retry with GPT-4o
            try {
              await sendToGPT(text);
            } catch (retryErr) {
              console.error("Retry with GPT-4o failed:", retryErr);
            }
          });
        }
      }, 100);
    } else {
      gptResponse.innerHTML = `<div class="error">Error: ${err.message}</div>`;
    }

    throw err;
  }
}

// Function to format GPT response with proper code highlighting and markdown
function formatGptResponse(text) {
  // Simple markdown formatting
  let formatted = text
    // Code blocks with language
    .replace(/```(\w+)?\n([\s\S]*?)```/g, function (_, lang, code) {
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

  // Wrap the entire response in a paragraph tag to ensure it gets the white color styling
  return `<p class="response-text">${formatted}</p>`;
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
window.ocrModule = {
  performOCR,
  cleanExtractedText,
  fixCodeBlocks,
  sendToGPT,
  formatGptResponse,
  escapeHtml,
};
