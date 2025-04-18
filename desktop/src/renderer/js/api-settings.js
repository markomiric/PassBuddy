/**
 * API Settings module
 *
 * Handles API keys and model selection
 */

// Store the current model selection
let currentModel = 'gpt-4o';

/**
 * Shows a dialog to input or update API keys and select model
 * @param {string} currentOpenAIKey - The current OpenAI API key (if any)
 * @param {string} currentDeepSeekKey - The current DeepSeek API key (if any)
 * @param {string} selectedModel - The currently selected model
 * @returns {Promise<Object>} - A promise that resolves to the entered API keys and selected model
 */
async function showApiSettingsDialog(
  currentOpenAIKey = '',
  currentDeepSeekKey = '',
  selectedModel = 'gpt-4o'
) {
  return new Promise((resolve) => {
    // Create the dialog overlay
    const overlay = document.createElement('div');
    overlay.className = 'api-key-overlay';

    // Create the dialog content
    const dialog = document.createElement('div');
    dialog.className = 'api-key-dialog';

    // Add the dialog title
    const title = document.createElement('h2');
    title.textContent = 'API Settings';
    dialog.appendChild(title);

    // Add description
    const description = document.createElement('p');
    description.innerHTML = `
      Configure the AI models you want to use with this application.
    `;
    dialog.appendChild(description);

    // Create tabs for different models
    const tabContainer = document.createElement('div');
    tabContainer.className = 'api-key-tabs';

    const openaiTab = document.createElement('button');
    openaiTab.className =
      'api-key-tab' + (selectedModel === 'gpt-4o' ? ' active' : '');
    openaiTab.textContent = 'OpenAI GPT-4o';
    openaiTab.dataset.model = 'gpt-4o';

    const deepseekTab = document.createElement('button');
    deepseekTab.className =
      'api-key-tab' + (selectedModel === 'deepseek-chat' ? ' active' : '');
    deepseekTab.textContent = 'DeepSeek Chat';
    deepseekTab.dataset.model = 'deepseek-chat';

    const geminiTab = document.createElement('button');
    geminiTab.className =
      'api-key-tab' + (selectedModel === 'gemini-2.0-flash' ? ' active' : '');
    geminiTab.textContent = 'Gemini 2.0 Flash';
    geminiTab.dataset.model = 'gemini-2.0-flash';

    tabContainer.appendChild(openaiTab);
    tabContainer.appendChild(deepseekTab);
    tabContainer.appendChild(geminiTab);
    dialog.appendChild(tabContainer);

    // Create content for OpenAI tab
    const openaiContent = document.createElement('div');
    openaiContent.className =
      'api-key-tab-content' + (selectedModel === 'gpt-4o' ? ' active' : '');
    openaiContent.dataset.model = 'gpt-4o';

    const openaiDescription = document.createElement('p');
    openaiDescription.innerHTML = `
      Enter your OpenAI API key to use GPT-4o.<br>
      You can get one from <a href="#" id="open-openai-link">https://platform.openai.com/api-keys</a>
    `;
    openaiContent.appendChild(openaiDescription);

    // Add OpenAI input field
    const openaiInputContainer = document.createElement('div');
    openaiInputContainer.className = 'api-key-input-container';

    const openaiInput = document.createElement('input');
    openaiInput.type = 'password';
    openaiInput.className = 'api-key-input';
    openaiInput.placeholder = 'sk-...';
    openaiInput.value = currentOpenAIKey || '';
    openaiInputContainer.appendChild(openaiInput);

    // Add toggle visibility button for OpenAI
    const openaiToggleButton = document.createElement('button');
    openaiToggleButton.className = 'toggle-visibility-button';
    openaiToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    openaiToggleButton.title = 'Toggle visibility';
    openaiToggleButton.addEventListener('click', () => {
      if (openaiInput.type === 'password') {
        openaiInput.type = 'text';
        openaiToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"></line>`;
      } else {
        openaiInput.type = 'password';
        openaiToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    });
    openaiInputContainer.appendChild(openaiToggleButton);

    openaiContent.appendChild(openaiInputContainer);

    // Create content for DeepSeek tab
    const deepseekContent = document.createElement('div');
    deepseekContent.className =
      'api-key-tab-content' +
      (selectedModel === 'deepseek-chat' ? ' active' : '');
    deepseekContent.dataset.model = 'deepseek-chat';

    const deepseekDescription = document.createElement('p');
    deepseekDescription.innerHTML = `
      Enter your DeepSeek API key to use DeepSeek Chat.<br>
      You can get one from <a href="#" id="open-deepseek-link">https://platform.deepseek.com</a>
    `;
    deepseekContent.appendChild(deepseekDescription);

    // Add DeepSeek input field
    const deepseekInputContainer = document.createElement('div');
    deepseekInputContainer.className = 'api-key-input-container';

    const deepseekInput = document.createElement('input');
    deepseekInput.type = 'password';
    deepseekInput.className = 'api-key-input';
    deepseekInput.placeholder = 'sk-...';
    deepseekInput.value = currentDeepSeekKey || '';
    deepseekInputContainer.appendChild(deepseekInput);

    // Add toggle visibility button for DeepSeek
    const deepseekToggleButton = document.createElement('button');
    deepseekToggleButton.className = 'toggle-visibility-button';
    deepseekToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    deepseekToggleButton.title = 'Toggle visibility';
    deepseekToggleButton.addEventListener('click', () => {
      if (deepseekInput.type === 'password') {
        deepseekInput.type = 'text';
        deepseekToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"></line>`;
      } else {
        deepseekInput.type = 'password';
        deepseekToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    });
    deepseekInputContainer.appendChild(deepseekToggleButton);

    deepseekContent.appendChild(deepseekInputContainer);

    // Create content for Gemini tab
    const geminiContent = document.createElement('div');
    geminiContent.className =
      'api-key-tab-content' +
      (selectedModel === 'gemini-2.0-flash' ? ' active' : '');
    geminiContent.dataset.model = 'gemini-2.0-flash';

    const geminiDescription = document.createElement('p');
    geminiDescription.innerHTML = `
      Enter your Gemini API key to use Gemini 2.0 Flash.<br>
      You can get one from <a href="#" id="open-gemini-link">https://aistudio.google.com/app/apikey</a>
    `;
    geminiContent.appendChild(geminiDescription);

    // Add Gemini input field
    const geminiInputContainer = document.createElement('div');
    geminiInputContainer.className = 'api-key-input-container';

    const geminiInput = document.createElement('input');
    geminiInput.type = 'password';
    geminiInput.className = 'api-key-input';
    geminiInput.placeholder = 'AIza...';
    geminiInput.value = window.geminiApiKey || '';
    geminiInputContainer.appendChild(geminiInput);

    // Add toggle visibility button for Gemini
    const geminiToggleButton = document.createElement('button');
    geminiToggleButton.className = 'toggle-visibility-button';
    geminiToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    geminiToggleButton.title = 'Toggle visibility';
    geminiToggleButton.addEventListener('click', () => {
      if (geminiInput.type === 'password') {
        geminiInput.type = 'text';
        geminiToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"></line>`;
      } else {
        geminiInput.type = 'password';
        geminiToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    });
    geminiInputContainer.appendChild(geminiToggleButton);
    geminiContent.appendChild(geminiInputContainer);

    dialog.appendChild(openaiContent);
    dialog.appendChild(deepseekContent);
    dialog.appendChild(geminiContent);

    // Add buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'api-key-button-container';

    const cancelButton = document.createElement('button');
    cancelButton.className = 'api-key-button cancel';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(null); // User canceled
    });
    buttonContainer.appendChild(cancelButton);

    const saveButton = document.createElement('button');
    saveButton.className = 'api-key-button save';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', () => {
      // Get the active tab/model
      const activeTab = dialog.querySelector('.api-key-tab.active');
      const selectedModel = activeTab ? activeTab.dataset.model : currentModel;

      // Get the API keys
      const openaiKey = openaiInput.value.trim();
      const deepseekKey = deepseekInput.value.trim();
      const geminiKey = geminiInput.value.trim();

      document.body.removeChild(overlay);
      resolve({
        openaiKey,
        deepseekKey,
        geminiKey,
        selectedModel,
      });
    });
    buttonContainer.appendChild(saveButton);

    dialog.appendChild(buttonContainer);

    // Add the dialog to the overlay
    overlay.appendChild(dialog);

    // Add styles
    const style = document.createElement('style');
    style.id = 'api-settings-styles';
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

      .api-key-tabs {
        display: flex;
        border-bottom: 1px solid #ddd;
        margin-bottom: 20px;
      }

      .api-key-tab {
        padding: 10px 16px;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        font-size: 14px;
        color: #555;
        transition: all 0.2s;
      }

      .api-key-tab:hover {
        color: #007bff;
      }

      .api-key-tab.active {
        color: #007bff;
        border-bottom-color: #007bff;
      }

      .api-key-tab-content {
        display: none;
      }

      .api-key-tab-content.active {
        display: block;
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
        margin-top: 20px;
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

      [data-theme="dark"] .api-key-tabs {
        border-bottom-color: #444;
      }

      [data-theme="dark"] .api-key-tab {
        color: #ccc;
      }

      [data-theme="dark"] .api-key-tab.active {
        color: #007bff;
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

      .temperature-info {
        background-color: #f8f9fa;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 20px;
        border-left: 3px solid #007bff;
      }

      .temperature-info h4 {
        margin-top: 0;
        margin-bottom: 8px;
        font-size: 16px;
        color: #333;
      }

      .temperature-info p {
        margin-bottom: 8px;
        font-size: 14px;
      }

      .temperature-info ul {
        margin: 0;
        padding-left: 20px;
      }

      .temperature-info li {
        font-size: 13px;
        margin-bottom: 4px;
      }

      [data-theme="dark"] .temperature-info {
        background-color: #2a2a2a;
        border-left-color: #007bff;
      }

      [data-theme="dark"] .temperature-info h4 {
        color: #eee;
      }

      [data-theme="dark"] .temperature-info p,
      [data-theme="dark"] .temperature-info li {
        color: #ccc;
      }
    `;

    // Only add the styles if they don't already exist
    if (!document.getElementById('api-settings-styles')) {
      document.head.appendChild(style);
    }

    // Add the overlay to the document
    document.body.appendChild(overlay);

    // Add tab switching functionality
    const tabs = dialog.querySelectorAll('.api-key-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        tabs.forEach((t) => t.classList.remove('active'));
        const contents = dialog.querySelectorAll('.api-key-tab-content');
        contents.forEach((c) => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const model = tab.dataset.model;
        const content = dialog.querySelector(
          `.api-key-tab-content[data-model="${model}"]`
        );
        if (content) content.classList.add('active');
      });
    });

    // Focus the input field of the active tab
    if (selectedModel === 'gpt-4o') {
      openaiInput.focus();
    } else if (selectedModel === 'deepseek-chat') {
      deepseekInput.focus();
    } else {
      geminiInput.focus();
    }

    // Add event listener for the OpenAI link
    document
      .getElementById('open-openai-link')
      .addEventListener('click', (e) => {
        e.preventDefault();
        window.electronAPI.windowControl(
          'open-url',
          'https://platform.openai.com/api-keys'
        );
      });

    // Add event listener for the DeepSeek link
    document
      .getElementById('open-deepseek-link')
      .addEventListener('click', (e) => {
        e.preventDefault();
        window.electronAPI.windowControl(
          'open-url',
          'https://platform.deepseek.com'
        );
      });

    // Add event listener for the Gemini link
    document
      .getElementById('open-gemini-link')
      .addEventListener('click', (e) => {
        e.preventDefault();
        window.electronAPI.windowControl(
          'open-url',
          'https://aistudio.google.com/app/apikey'
        );
      });

    // Add event listener for Enter key
    openaiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveButton.click();
      }
    });

    deepseekInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveButton.click();
      }
    });

    geminiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveButton.click();
      }
    });
  });
}

/**
 * Set the current model
 * @param {string} model - The model to set as current
 */
function setCurrentModel(model) {
  currentModel = model;
  localStorage.setItem('selectedModel', model);
  console.log(`Model set to: ${model}`);
}

/**
 * Get the current model
 * @returns {string} - The current model
 */
function getCurrentModel() {
  // Try to get from localStorage first
  const storedModel = localStorage.getItem('selectedModel');
  if (storedModel) {
    currentModel = storedModel;
  }
  return currentModel;
}

/**
 * Show a model indicator in the UI
 * @param {string} contentType - Optional content type for DeepSeek
 * @param {number} temperature - Optional temperature for DeepSeek
 */
function showModelIndicator(contentType = null, temperature = null) {
  // Remove any existing indicator
  removeModelIndicator();

  // Create the indicator element
  const indicator = document.createElement('div');
  indicator.id = 'model-indicator';
  indicator.className = 'model-indicator';

  // Add the model name
  const isDeepSeek = getCurrentModel() === 'deepseek-chat';
  const isGemini = getCurrentModel() === 'gemini-2.0-flash';
  const modelName = isDeepSeek
    ? 'DeepSeek Chat'
    : isGemini
    ? 'Gemini 2.0 Flash'
    : 'OpenAI GPT-4o';

  let indicatorContent = `
    <div class="indicator-content">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      <span class="indicator-text">${modelName}</span>
    </div>
  `;

  // Add temperature info for DeepSeek if available
  if (isDeepSeek && contentType && temperature !== null) {
    indicatorContent = `
      <div class="indicator-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <span class="indicator-text">
          <span class="model-name">DeepSeek Chat</span>
          <span class="model-details">${
            contentType.charAt(0).toUpperCase() + contentType.slice(1)
          } mode (temp: ${temperature})</span>
        </span>
      </div>
    `;
  }

  indicator.innerHTML = indicatorContent;

  // Add styles if they don't exist
  if (!document.getElementById('model-indicator-styles')) {
    const style = document.createElement('style');
    style.id = 'model-indicator-styles';
    style.textContent = `
      .model-indicator {
        position: fixed;
        bottom: 20px;
        right: 20px; /* Changed from left to right */
        background-color: var(--primary-color);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        font-size: 14px;
        opacity: 0.5; /* Added opacity */
        transition: opacity 0.2s ease; /* Smooth transition for hover effect */
      }

      .model-indicator:hover {
        opacity: 1; /* Full opacity on hover */
      }

      .indicator-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .indicator-text {
        white-space: nowrap;
        display: flex;
        flex-direction: column;
      }

      .model-name {
        font-weight: 500;
      }

      .model-details {
        font-size: 12px;
        opacity: 0.8;
      }
    `;
    document.head.appendChild(style);
  }

  // Add the indicator to the document
  document.body.appendChild(indicator);
}

/**
 * Remove the model indicator
 */
function removeModelIndicator() {
  const indicator = document.getElementById('model-indicator');
  if (indicator && indicator.parentNode) {
    indicator.parentNode.removeChild(indicator);
  }
}

// Export functions
window.apiSettingsModule = {
  showApiSettingsDialog,
  setCurrentModel,
  getCurrentModel,
  showModelIndicator,
  removeModelIndicator,
};
