/**
 * User preferences service
 * 
 * Handles loading and saving user preferences
 */
const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const defaultConfig = require("../config/defaults");

/**
 * Load user preferences if they exist or use defaults
 * @returns {Object} User preferences
 */
function loadUserPreferences() {
  try {
    const userDataPath = app.getPath("userData");
    const prefsPath = path.join(userDataPath, "preferences.json");

    if (fs.existsSync(prefsPath)) {
      const data = fs.readFileSync(prefsPath, "utf8");
      const prefs = JSON.parse(data);
      return { ...defaultConfig, ...prefs };
    }
  } catch (err) {
    console.error("Failed to load preferences:", err);
  }
  return defaultConfig;
}

/**
 * Save user preferences
 * @param {Object} prefs - User preferences to save
 * @returns {boolean} Success status
 */
function saveUserPreferences(prefs) {
  try {
    const userDataPath = app.getPath("userData");
    const prefsPath = path.join(userDataPath, "preferences.json");
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Failed to save preferences:", err);
    return false;
  }
}

module.exports = {
  loadUserPreferences,
  saveUserPreferences
};
