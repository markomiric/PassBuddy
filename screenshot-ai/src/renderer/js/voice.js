/**
 * Voice recording functionality
 *
 * Handles voice recording and transcription
 */

// Global variables for voice recording
let recordingIndicator = null;
let recordingInProgress = false;
let mediaRecorder = null;
let audioChunks = [];
let recordingStream = null;

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
    window.uiModule.showNotification(
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

            // Show the transcription result while waiting for GPT response
            if (gptResponse) {
              // Create a container with both transcription and loading indicator
              gptResponse.innerHTML = `
                <div class="transcription-result">
                  <h3>Your message:</h3>
                  <div class="transcription-text">${transcript}</div>
                </div>
                <div class='loading-text'>
                  <div class="loading-spinner"></div>
                  Processing your message...
                </div>
              `;

              // Add styles for the transcription display if they don't exist
              if (!document.getElementById("transcription-styles")) {
                const style = document.createElement("style");
                style.id = "transcription-styles";
                style.textContent = `
                  .transcription-result {
                    margin-bottom: 20px;
                    padding: 15px;
                    background-color: rgba(0, 0, 0, 0.05);
                    border-radius: 8px;
                  }

                  .transcription-result h3 {
                    margin-top: 0;
                    margin-bottom: 10px;
                    font-size: 16px;
                    color: #555;
                  }

                  .transcription-text {
                    font-size: 16px;
                    line-height: 1.5;
                    white-space: pre-wrap;
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

                  [data-theme="dark"] .transcription-result {
                    background-color: rgba(255, 255, 255, 0.05);
                  }

                  [data-theme="dark"] .transcription-result h3 {
                    color: #aaa;
                  }
                `;
                document.head.appendChild(style);
              }
            }

            // Send the transcription to the LLM
            window.ocrModule.sendToGPT(transcript);
          } else {
            // No meaningful transcription was captured
            if (gptResponse) {
              gptResponse.innerHTML =
                "<div class='error'>No speech was detected in the recording.</div>";
            }
            window.uiModule.showError("No speech detected in the recording.");
          }
        } catch (error) {
          console.error("Transcription error:", error);
          if (gptResponse) {
            gptResponse.innerHTML = `<div class='error'>Error processing audio: ${error.message}</div>`;
          }
          window.uiModule.showError("Error processing audio: " + error.message);
        }
      } else {
        // No audio chunks collected
        if (gptResponse) {
          gptResponse.innerHTML =
            "<div class='error'>No audio was recorded.</div>";
        }
        window.uiModule.showError(
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
    window.uiModule.showError("Could not access microphone: " + error.message);
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

  window.uiModule.showNotification("Recording stopped", 2000);
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
    // Show error and prompt for API key
    const gptResponse = document.getElementById("gpt-response");
    if (gptResponse) {
      gptResponse.innerHTML =
        "<div class='error'>OpenAI API key not found. Please enter your API key.</div>";
    }

    // Show API key dialog
    const newApiKey = await window.uiModule.showApiKeyDialog("");

    // If user provided an API key, save it and continue
    if (newApiKey) {
      await window.electronAPI.saveOpenAIKey(newApiKey);
      console.log("API key saved successfully");
      // Continue with the new key
      return transcribeAudio(audioChunks); // Retry with the new key
    } else {
      // User canceled, throw error
      throw new Error("API key is required to use this feature.");
    }
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

// Export functions
window.voiceModule = {
  setupVoiceRecording,
  startVoiceRecording,
  stopRecording,
  cleanupRecording,
  setupKeyboardListeners,
  transcribeAudio,
};
