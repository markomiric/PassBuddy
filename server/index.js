const http = require("http");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const config = require("./config");
const constants = require("./constants");
const {
  clients,
  desktopClients,
  browserClients,
  addClient,
  removeClient,
  setupHeartbeat,
} = require("./clients");
const {
  sendMessage,
  sendError,
  broadcastToDesktops,
  broadcastToBrowsers,
} = require("./messages");
const { handleMessage } = require("./handlers");

// Create HTTP server for WebSocket to attach to
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket Relay Server\n");
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

console.log("🔌 WebSocket relay server starting...");

// Set up heartbeat for all connections
setupHeartbeat(wss);

// Connection handler
wss.on("connection", (ws, req) => {
  const clientId = uuidv4();
  const url = new URL(req.url, `http://${req.headers.host}`);
  ws.clientType = url.searchParams.get("clientType") || "browser";
  ws.clientId = clientId;
  ws.isAlive = true;

  addClient(ws, clientId);

  if (ws.clientType === "desktop") {
    console.log(`🖥️  Desktop client connected (${clientId})`);
    broadcastToBrowsers({
      type: constants.CONNECTION_STATUS,
      status: "desktop_connected",
    });
  } else {
    console.log(`🌐 Browser client connected (${clientId})`);
    sendMessage(ws, {
      type: constants.CONNECTION_STATUS,
      status: "connected",
      desktopConnected: desktopClients.size > 0,
    });
  }

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      return sendError(ws, "Invalid message format");
    }
    handleMessage(ws, data);
  });

  ws.on("close", () => {
    console.log(
      `${ws.clientType.charAt(0).toUpperCase()}${ws.clientType.slice(
        1
      )} client disconnected (${clientId})`
    );
    removeClient(ws);
    if (ws.clientType === "desktop") {
      broadcastToBrowsers({
        type: constants.CONNECTION_STATUS,
        status: "desktop_disconnected",
      });
    }
  });

  ws.on("error", (error) => {
    console.error(`❌ WebSocket error for client ${clientId}:`, error);
    removeClient(ws);
  });
});

// Start the server
server.listen(config.PORT, () => {
  console.log(
    `🚀 WebSocket relay server running on ws://localhost:${config.PORT}`
  );
});
