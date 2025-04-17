/**
 * Gemini API client using direct fetch calls to the Gemini API
 */

console.log("Gemini client module loaded!");

/**
 * Sends a message to the Gemini API
 * @param {string} apiKey - The Gemini API key
 * @param {string} model - The model name (e.g., "gemini-2.0-flash")
 * @param {string} prompt - The user prompt to send
 * @param {number} temperature - The temperature setting (0-2)
 * @returns {Promise<string>} - The response from Gemini
 */
export async function sendToGemini(apiKey, model, prompt, temperature = 1.0) {
  console.log("sendToGemini function called!");

  if (!apiKey) {
    throw new Error("API key is required");
  }

  if (!prompt) {
    throw new Error("Prompt is required");
  }
  try {
    console.log(
      `Calling Gemini API with model ${model} and temperature ${temperature}`
    );
    console.log(
      `API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(
        apiKey.length - 4
      )}`
    );

    // Construct the API endpoint URL
    // Make sure we're using the correct model name for the API
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    console.log(`API URL: ${apiUrl.replace(apiKey, "API_KEY_HIDDEN")}`);

    // Prepare the request payload
    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: temperature,
      },
    };

    console.log("Request payload:", JSON.stringify(payload, null, 2));

    // Make the API request
    console.log("Making fetch request to Gemini API...");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log(
      "Received response from Gemini API:",
      response.status,
      response.statusText
    );

    // Check if the response is successful
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Gemini API Error: ${response.status} ${response.statusText}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = `Gemini API Error: ${
          errorData.error?.message || response.statusText
        }`;
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }

      console.error("Error response from Gemini API:", errorText);
      throw new Error(errorMessage);
    }

    // Parse the response
    console.log("Parsing response...");
    const responseText = await response.text();
    console.log("Raw response:", responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
      return "[Error: Failed to parse Gemini response]";
    }

    // Extract the text from the response
    const geminiResponse =
      result.candidates?.[0]?.content?.parts?.[0]?.text ||
      "[No response from Gemini]";

    console.log("Gemini response:", geminiResponse);

    return geminiResponse;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

// No need for default export since we're using named exports
