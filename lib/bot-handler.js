const { brain } = require("./brain");

async function processMessage(text, chatId, history = []) {
  // just pass everything to brain
  return await brain(text, chatId, history);
}

module.exports = { processMessage };
