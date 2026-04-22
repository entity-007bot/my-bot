/**
 * bot-handler.js
 * ─────────────────────────────────────────────────────────────
 * SHARED message-processing logic.
 * Both the Telegram webhook (/api/telegram) and the web chat
 * endpoint (/api/chat) call processMessage() so your AI logic
 * runs identically for every platform.
 *
 * ► Paste your existing bot logic inside processMessage().
 * ► The function receives (text, chatId, history) and must
 *   return a string (the bot's reply).
 * ─────────────────────────────────────────────────────────────
 */

/**
 * processMessage
 * @param {string}   text    - The user's message
 * @param {string}   chatId  - Unique chat identifier (Telegram chat_id or web session ID)
 * @param {Array}    history - Conversation history [{role, content}, ...]
 * @returns {Promise<string>} - The bot's reply
 */
async function processMessage(text, chatId, history = []) {
  // ─── REPLACE THIS SECTION WITH YOUR EXISTING BOT LOGIC ────────────────────
  //
  // Example using OpenAI (swap for whatever your bot already uses):
  //
  // const { OpenAI } = require('openai');
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  //
  // const messages = [
  //   { role: 'system', content: 'You are a helpful assistant.' },
  //   ...history,
  //   { role: 'user', content: text },
  // ];
  //
  // const completion = await openai.chat.completions.create({
  //   model: 'gpt-4o',
  //   messages,
  // });
  //
  // return completion.choices[0].message.content;
  //
  // ──────────────────────────────────────────────────────────────────────────

  // ─── PLACEHOLDER — delete once you paste your real logic ──────────────────
  await new Promise((r) => setTimeout(r, 300)); // simulate async AI call
  return `Echo [${chatId.toString().slice(0, 8)}]: ${text}`;
  // ──────────────────────────────────────────────────────────────────────────
}

module.exports = { processMessage };
