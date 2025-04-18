/**
 * WebSocket service
 *
 * Handles WebSocket connections to the relay server
 */
const WebSocket = require('ws');
const { takeScreenshot } = require('./screenshot');

// Configuration
const RELAY_SERVER_URL = process.env.RELAY_SERVER_URL || 'ws://localhost:3030';

let wsClient; // WebSocket client connection to relay server
let mainWindowRef; // Reference to the main window

/**
 * Initialize the WebSocket service
 * @param {BrowserWindow} mainWindow - The main application window
 */
function initWebSocketService(mainWindow) {
  mainWindowRef = mainWindow;
  connectToRelayServer();
}

/**
 * Connect to WebSocket relay server
 */
function connectToRelayServer() {
  // Close existing connection if any
  if (wsClient) {
    wsClient.terminate();
  }

  console.log(`🔌 Connecting to WebSocket relay server at ${RELAY_SERVER_URL}`);

  // Send connecting status to renderer immediately
  if (mainWindowRef?.webContents) {
    mainWindowRef.webContents.send('connection-status-change', 'connecting');
  }

  wsClient = new WebSocket(`${RELAY_SERVER_URL}?clientType=desktop`);

  // Respond to server heartbeat pings
  wsClient.on('ping', () => {
    wsClient.pong();
  });
  wsClient.on('pong', () => {
    // Received pong from server (optional heartbeat acknowledgment)
  });

  // Set up WebSocket client events
  wsClient.on('open', () => {
    console.log('🟢 Connected to WebSocket relay server');

    // Start heartbeat
    startHeartbeat();

    // Update renderer about connection status
    if (mainWindowRef?.webContents) {
      mainWindowRef.webContents.send('connection-status-change', 'connected');
    }
  });

  wsClient.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      handleMessage(data);
    } catch (err) {
      console.error('❌ Error handling message:', err);
    }
  });

  wsClient.on('close', () => {
    console.log('🔴 Disconnected from WebSocket relay server');

    // Update renderer about connection status
    if (mainWindowRef?.webContents) {
      mainWindowRef.webContents.send(
        'connection-status-change',
        'disconnected'
      );
    }

    // Try to reconnect after a delay
    setTimeout(connectToRelayServer, 5000);
  });

  wsClient.on('error', (error) => {
    console.error('❌ WebSocket error:', error);

    // Update renderer about connection status
    if (mainWindowRef?.webContents) {
      mainWindowRef.webContents.send(
        'connection-status-change',
        'disconnected'
      );
    }
  });
}

/**
 * Handle incoming messages from relay server
 * @param {Object} message - The message to handle
 */
function handleMessage(message) {
  console.log('📥 Received message:', message.type);

  switch (message.type) {
    case 'pong':
      // Heartbeat response
      break;

    case 'screenshot_request':
      // Handle screenshot request
      takeScreenshot(mainWindowRef);
      break;

    default:
      console.log('📨 Unhandled message type:', message.type);
  }
}

/**
 * Start heartbeat for WebSocket connection
 */
function startHeartbeat() {
  // Send a ping every 25 seconds
  const heartbeatInterval = setInterval(() => {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(
        JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 25000);

  // Store the interval so we can clear it if needed
  wsClient.heartbeatInterval = heartbeatInterval;
}

/**
 * Send a message to the relay server
 * @param {Object} message - The message to send
 * @returns {boolean} Success status
 */
function sendToRelayServer(message) {
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(
      JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
      })
    );
    return true;
  } else {
    console.warn('⚠️ Cannot send message - WebSocket not connected');
    return false;
  }
}

/**
 * Close the WebSocket connection
 */
function closeWebSocketConnection() {
  if (wsClient) {
    if (wsClient.heartbeatInterval) {
      clearInterval(wsClient.heartbeatInterval);
    }
    wsClient.terminate();
  }
}

module.exports = {
  initWebSocketService,
  sendToRelayServer,
  closeWebSocketConnection,
};
