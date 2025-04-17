const config = require("./config");

// Map to store all connected clients by ID
const clients = new Map();
// Sets to track desktop and browser clients
const desktopClients = new Set();
const browserClients = new Set();

function addClient(ws, clientId) {
  clients.set(clientId, ws);
  if (ws.clientType === "desktop") {
    desktopClients.add(ws);
  } else {
    browserClients.add(ws);
  }
}

function removeClient(ws) {
  clients.delete(ws.clientId);
  if (ws.clientType === "desktop") {
    desktopClients.delete(ws);
  } else {
    browserClients.delete(ws);
  }
}

function setupHeartbeat(wss) {
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        removeClient(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, config.HEARTBEAT_INTERVAL);
}

module.exports = {
  clients,
  desktopClients,
  browserClients,
  addClient,
  removeClient,
  setupHeartbeat,
};
