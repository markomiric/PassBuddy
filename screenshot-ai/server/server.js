/**
 * WebSocket server
 *
 * Handles WebSocket connections for the screenshot-ai application
 */
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3030 });
console.log("🔌 WebSocket server running on ws://localhost:3030");

// Track connected clients
const clients = new Set();

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

wss.on("connection", (ws) => {
  console.log("🟢 Client connected");
  clients.add(ws);

  // Set up heartbeat
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  // Handle incoming messages
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (err) {
      console.error("❌ Error handling message:", err);
      sendError(ws, "Invalid message format");
    }
  });

  // Handle client disconnection
  ws.on("close", () => {
    console.log("🔴 Client disconnected");
    clients.delete(ws);
  });

  // Handle errors
  ws.on("error", (error) => {
    console.error("❌ WebSocket error:", error);
    clients.delete(ws);
  });

  // Send welcome message
  sendMessage(ws, {
    type: "connection_status",
    status: "connected",
    timestamp: new Date().toISOString(),
  });
});

// Heartbeat check
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      clients.delete(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

function handleMessage(ws, message) {
  switch (message.type) {
    case "ping":
      sendMessage(ws, { type: "pong", timestamp: new Date().toISOString() });
      break;
    // Add more message type handlers here
    default:
      console.log("📨 Received message:", message);
  }
}

function sendMessage(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws, error) {
  sendMessage(ws, {
    type: "error",
    error,
    timestamp: new Date().toISOString(),
  });
}

function broadcastMessage(message) {
  const data = JSON.stringify({
    ...message,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

module.exports = { broadcastMessage };
