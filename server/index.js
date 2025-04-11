const WebSocket = require("ws");
const http = require("http");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");

dotenv.config();

// Configuration
const PORT = process.env.PORT || 3030;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "https://gpt-viewer.example.com"];

// Create HTTP server for WebSocket to attach to
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket Relay Server\n");
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Client tracking
const clients = new Map(); // Map to store all connected clients by ID
const desktopClients = new Set(); // Set to track desktop app clients
const browserClients = new Set(); // Set to track browser clients

console.log("🔌 WebSocket relay server starting...");

// Connection handler
wss.on("connection", (ws, req) => {
  // Generate a unique ID for this connection
  const clientId = uuidv4();

  // Parse client type from query string or headers
  const url = new URL(req.url, `http://${req.headers.host}`);
  const clientType = url.searchParams.get("clientType") || "browser";

  // Set up client metadata
  ws.clientId = clientId;
  ws.clientType = clientType;
  ws.isAlive = true;

  // Track the client
  clients.set(clientId, ws);

  if (clientType === "desktop") {
    console.log(`🖥️  Desktop client connected (${clientId})`);
    desktopClients.add(ws);

    // Notify browser clients that a desktop client connected
    broadcastToBrowsers({
      type: "connection_status",
      status: "desktop_connected",
      timestamp: new Date().toISOString(),
    });
  } else {
    console.log(`🌐 Browser client connected (${clientId})`);
    browserClients.add(ws);

    // Send connection confirmation to the browser client
    sendMessage(ws, {
      type: "connection_status",
      status: "connected",
      desktopConnected: desktopClients.size > 0,
      timestamp: new Date().toISOString(),
    });
  }

  // Set up ping/pong heartbeat
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  // Handle messages
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (err) {
      console.error("❌ Error parsing message:", err);
      sendError(ws, "Invalid message format");
    }
  });

  // Handle disconnection
  ws.on("close", () => {
    // Remove client from tracking
    clients.delete(clientId);

    if (ws.clientType === "desktop") {
      console.log(`🖥️  Desktop client disconnected (${clientId})`);
      desktopClients.delete(ws);

      // Notify browser clients that the desktop client disconnected
      broadcastToBrowsers({
        type: "connection_status",
        status: "desktop_disconnected",
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log(`🌐 Browser client disconnected (${clientId})`);
      browserClients.delete(ws);
    }
  });

  // Handle errors
  ws.on("error", (error) => {
    console.error(`❌ WebSocket error for client ${clientId}:`, error);
    clients.delete(clientId);

    if (ws.clientType === "desktop") {
      desktopClients.delete(ws);
    } else {
      browserClients.delete(ws);
    }
  });
});

// Heartbeat interval (check every 30 seconds)
const HEARTBEAT_INTERVAL = 30000;
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      clients.delete(ws.clientId);

      if (ws.clientType === "desktop") {
        desktopClients.delete(ws);
      } else {
        browserClients.delete(ws);
      }

      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

// Message handler
function handleMessage(ws, message) {
  console.log(`📥 Received ${message.type} from ${ws.clientType}`);

  switch (message.type) {
    case "ping":
      sendMessage(ws, {
        type: "pong",
        timestamp: new Date().toISOString(),
      });
      break;

    case "gpt_response":
      // When receiving a GPT response, broadcast to all browser clients
      broadcastToBrowsers(message);
      break;

    case "screenshot_request":
      // Forward screenshot request to all desktop clients
      broadcastToDesktops(message);
      break;

    default:
      // For unhandled message types, log them
      console.log(`📨 Unhandled message type: ${message.type}`);
  }
}

// Utility to send a message to a specific client
function sendMessage(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Utility to send an error message
function sendError(ws, error) {
  sendMessage(ws, {
    type: "error",
    error,
    timestamp: new Date().toISOString(),
  });
}

// Broadcast to all desktop clients
function broadcastToDesktops(message) {
  const data = JSON.stringify({
    ...message,
    timestamp: message.timestamp || new Date().toISOString(),
  });

  desktopClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Broadcast to all browser clients
function broadcastToBrowsers(message) {
  const data = JSON.stringify({
    ...message,
    timestamp: message.timestamp || new Date().toISOString(),
  });

  browserClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 WebSocket relay server running on ws://localhost:${PORT}`);
});
