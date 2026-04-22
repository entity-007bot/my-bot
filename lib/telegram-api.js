/**
 * telegram-api.js
 * ─────────────────────────────────────────────────────────────
 * Thin wrapper around the Telegram Bot API.
 * Used only by the /api/telegram webhook — web users never
 * touch Telegram's servers directly.
 * ─────────────────────────────────────────────────────────────
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function apiFetch(method, body) {
  const res = await fetch(`${BASE_URL}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram API error [${method}]: ${err}`);
  }

  return res.json();
}

/**
 * Send a plain-text message to a Telegram chat.
 */
async function sendMessage(chatId, text, extra = {}) {
  return apiFetch('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    ...extra,
  });
}

/**
 * Send a "typing…" indicator while the bot processes a message.
 */
async function sendTyping(chatId) {
  return apiFetch('sendChatAction', {
    chat_id: chatId,
    action: 'typing',
  });
}

/**
 * Register (or refresh) the webhook URL with Telegram.
 * Call once at deploy time: GET /api/setup-webhook
 */
async function setWebhook(url) {
  return apiFetch('setWebhook', { url });
}

module.exports = { sendMessage, sendTyping, setWebhook };
