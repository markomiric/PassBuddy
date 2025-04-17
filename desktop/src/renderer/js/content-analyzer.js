/**
 * Content Analyzer Module
 * 
 * Analyzes text content to determine the appropriate temperature setting for DeepSeek model
 */

/**
 * Analyze text content to determine the most appropriate temperature setting
 * @param {string} text - The text to analyze
 * @returns {string} - The content type (coding, data, translation, creative, or general)
 */
function analyzeContent(text) {
  if (!text || typeof text !== 'string') {
    return 'general';
  }
  
  // Convert to lowercase for easier pattern matching
  const lowerText = text.toLowerCase();
  
  // Check for code patterns
  if (isCodeContent(lowerText)) {
    return 'coding';
  }
  
  // Check for data analysis patterns
  if (isDataContent(lowerText)) {
    return 'data';
  }
  
  // Check for translation patterns
  if (isTranslationContent(lowerText)) {
    return 'translation';
  }
  
  // Check for creative writing patterns
  if (isCreativeContent(lowerText)) {
    return 'creative';
  }
  
  // Default to general conversation
  return 'general';
}

/**
 * Check if the content appears to be code-related
 * @param {string} text - The text to analyze (lowercase)
 * @returns {boolean} - Whether the content is code-related
 */
function isCodeContent(text) {
  // Check for common programming keywords and patterns
  const codePatterns = [
    // Programming keywords
    /\\bfunction\\b/, /\\bclass\\b/, /\\bvar\\b/, /\\blet\\b/, /\\bconst\\b/,
    /\\breturn\\b/, /\\bif\\b.*\\bthen\\b/, /\\bfor\\b.*\\bin\\b/, /\\bwhile\\b/,
    
    // Common programming symbols and patterns
    /[{\\[\\(].*[}\\]\\)]/, /=>/, /\\+=/, /\\-=/, /\\*=/, /\\/=/,
    
    // Math patterns
    /\\bmath\\./, /\\bsin\\b/, /\\bcos\\b/, /\\btan\\b/, /\\bsqrt\\b/,
    /\\bpi\\b/, /\\bsum\\b/, /\\bintegral\\b/, /\\bderivative\\b/,
    
    // Code block indicators
    /```[a-z]*\\n/, /\\bdef\\b/, /\\bimport\\b/, /\\brequire\\b/,
    
    // Common programming file extensions
    /\\.py\\b/, /\\.js\\b/, /\\.java\\b/, /\\.c\\b/, /\\.cpp\\b/, /\\.cs\\b/,
    /\\.html\\b/, /\\.css\\b/, /\\.php\\b/, /\\.rb\\b/, /\\.go\\b/, /\\.ts\\b/,
    
    // Explicit mentions of code or programming
    /\\bcode\\b/, /\\bprogram\\b/, /\\balgorithm\\b/, /\\bfunction\\b/,
    /\\bdebugging\\b/, /\\bcompile\\b/, /\\bsyntax\\b/, /\\berror\\b/
  ];
  
  // Check if any code pattern is found
  return codePatterns.some(pattern => pattern.test(text));
}

/**
 * Check if the content appears to be data analysis related
 * @param {string} text - The text to analyze (lowercase)
 * @returns {boolean} - Whether the content is data-related
 */
function isDataContent(text) {
  // Check for common data analysis keywords and patterns
  const dataPatterns = [
    // Data analysis terms
    /\\bdata\\b/, /\\banalysis\\b/, /\\banalytics\\b/, /\\bstatistics\\b/,
    /\\bdataset\\b/, /\\bdatabase\\b/, /\\bquery\\b/, /\\bsql\\b/,
    
    // Data cleaning terms
    /\\bclean\\b.*\\bdata\\b/, /\\bnormalize\\b/, /\\bfilter\\b/, /\\btransform\\b/,
    
    // Data visualization terms
    /\\bchart\\b/, /\\bgraph\\b/, /\\bplot\\b/, /\\bvisualization\\b/,
    
    // Statistical terms
    /\\bmean\\b/, /\\bmedian\\b/, /\\bmode\\b/, /\\bstandard deviation\\b/,
    /\\bregression\\b/, /\\bcorrelation\\b/, /\\bp-value\\b/, /\\bhypothesis\\b/,
    
    // Data formats
    /\\bcsv\\b/, /\\bjson\\b/, /\\bxml\\b/, /\\bexcel\\b/, /\\bspreadsheet\\b/
  ];
  
  // Check if any data pattern is found
  return dataPatterns.some(pattern => pattern.test(text));
}

/**
 * Check if the content appears to be translation related
 * @param {string} text - The text to analyze (lowercase)
 * @returns {boolean} - Whether the content is translation-related
 */
function isTranslationContent(text) {
  // Check for common translation keywords and patterns
  const translationPatterns = [
    // Direct translation requests
    /\\btranslate\\b/, /\\btranslation\\b/, /\\binterpreter\\b/,
    
    // Language mentions
    /\\benglish\\b.*\\bto\\b/, /\\bfrom\\b.*\\bto\\b.*\\blanguage\\b/,
    /\\bspanish\\b/, /\\bfrench\\b/, /\\bgerman\\b/, /\\bitalian\\b/,
    /\\brussian\\b/, /\\bjapanese\\b/, /\\bchinese\\b/, /\\bkorean\\b/,
    /\\barabic\\b/, /\\bhindi\\b/, /\\bportuguese\\b/,
    
    // Multiple languages in the same text (potential translation)
    /[\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uff66-\\uff9f].*[a-zA-Z]|[a-zA-Z].*[\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uff66-\\uff9f]/
  ];
  
  // Check if any translation pattern is found
  return translationPatterns.some(pattern => pattern.test(text));
}

/**
 * Check if the content appears to be creative writing related
 * @param {string} text - The text to analyze (lowercase)
 * @returns {boolean} - Whether the content is creative-related
 */
function isCreativeContent(text) {
  // Check for common creative writing keywords and patterns
  const creativePatterns = [
    // Creative writing terms
    /\\bstory\\b/, /\\bpoem\\b/, /\\bpoetry\\b/, /\\bnovel\\b/, /\\bfiction\\b/,
    /\\bcreative\\b/, /\\bimagine\\b/, /\\bfantasy\\b/, /\\bscenario\\b/,
    
    // Storytelling elements
    /\\bcharacter\\b/, /\\bplot\\b/, /\\bsetting\\b/, /\\btheme\\b/,
    /\\bconflict\\b/, /\\bresolution\\b/, /\\bdialogue\\b/,
    
    // Creative requests
    /\\bwrite\\b.*\\bstory\\b/, /\\bcreate\\b.*\\bscenario\\b/,
    /\\bgenerate\\b.*\\bidea\\b/, /\\bbrainstorm\\b/,
    
    // Poetic elements
    /\\brhyme\\b/, /\\bverse\\b/, /\\bstanza\\b/, /\\bmetaphor\\b/,
    /\\bsimile\\b/, /\\balliteration\\b/, /\\bsonnet\\b/, /\\bhaiku\\b/
  ];
  
  // Check if any creative pattern is found
  return creativePatterns.some(pattern => pattern.test(text));
}

/**
 * Get the recommended temperature for DeepSeek model based on content type
 * @param {string} contentType - The type of content (coding, data, translation, creative, or general)
 * @param {Object} temperatureSettings - The temperature settings object
 * @returns {number} - The recommended temperature
 */
function getRecommendedTemperature(contentType, temperatureSettings) {
  // Default settings if not provided
  const settings = temperatureSettings || {
    coding: 0.0,
    data: 1.0,
    general: 1.3,
    translation: 1.3,
    creative: 1.5
  };
  
  // Return the appropriate temperature based on content type
  switch (contentType) {
    case 'coding':
      return settings.coding;
    case 'data':
      return settings.data;
    case 'translation':
      return settings.translation;
    case 'creative':
      return settings.creative;
    case 'general':
    default:
      return settings.general;
  }
}

// Export functions
window.contentAnalyzerModule = {
  analyzeContent,
  getRecommendedTemperature
};
