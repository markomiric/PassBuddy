/**
 * Default application configuration
 *
 * These settings are used when the app is launched for the first time
 * or when a setting is not found in the saved preferences.
 */
const defaultConfig = {
  hotkey: "Control+Shift+S",
  darkMode: false,
  windowBounds: { width: 800, height: 600 }, // Smaller default size
  windowPosition: { x: undefined, y: undefined },
  // Stealth mode is always enabled, no need for a setting
  openaiApiKey: "", // Store the OpenAI API key in user preferences
  deepseekApiKey: "", // Store the DeepSeek API key in user preferences
  showApiKeyPrompt: true, // Show the API key prompt on startup if no key is found
  selectedModel: "gpt-4o", // Default model to use (gpt-4o, deepseek-chat)
  modelConfig: {
    "gpt-4o": {
      baseURL: "https://api.openai.com",
      temperature: 0.3,
      provider: "openai",
    },
    "deepseek-chat": {
      baseURL: "https://api.deepseek.com",
      // Default temperature, will be adjusted based on content
      temperature: 1.0,
      provider: "deepseek",
      // Temperature recommendations for different use cases
      temperatureSettings: {
        coding: 0.0, // Coding / Math - Deterministic, precise
        data: 1.0, // Data Cleaning / Analysis - Balanced responses
        general: 1.3, // General Conversation - More variety
        translation: 1.3, // Translation - Allows flexibility in wording
        creative: 1.5, // Creative Writing / Poetry - Diverse, imaginative
      },
    },
  },
};

module.exports = defaultConfig;
