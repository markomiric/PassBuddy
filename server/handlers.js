const constants = require("./constants");
const {
  sendMessage,
  sendError,
  broadcastToBrowsers,
  broadcastToDesktops,
} = require("./messages");

function handleMessage(ws, message) {
  console.log(`📥 Received ${message.type} from ${ws.clientType}`);

  switch (message.type) {
    case constants.PING:
      sendMessage(ws, {
        type: constants.PONG,
        timestamp: new Date().toISOString(),
      });
      break;

    case constants.GPT_RESPONSE:
      broadcastToBrowsers(message);
      break;

    case constants.SCREENSHOT_REQUEST:
      broadcastToDesktops(message);
      break;

    default:
      console.log(`📨 Unhandled message type: ${message.type}`);
      sendError(ws, `Unhandled message type: ${message.type}`);
  }
}

module.exports = { handleMessage };
