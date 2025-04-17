const WebSocket = require("ws");
const constants = require("./constants");
const { desktopClients, browserClients } = require("./clients");

function sendMessage(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws, error) {
  sendMessage(ws, {
    type: constants.ERROR,
    error,
    timestamp: new Date().toISOString(),
  });
}

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

module.exports = {
  sendMessage,
  sendError,
  broadcastToDesktops,
  broadcastToBrowsers,
};
