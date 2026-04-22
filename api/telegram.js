const { brain } = require("../lib/brain");
const { sendMessage } = require("../lib/telegram-api");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const update = req.body;
  const msg = update?.message;

  if (!msg?.text) return res.status(200).send("OK");

  const chatId = msg.chat.id;
  const text = msg.text;

  const reply = await brain(text, chatId);

  await sendMessage(chatId, reply);

  return res.status(200).send("OK");
};
