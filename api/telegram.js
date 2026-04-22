/**
 * /api/telegram.js  →  POST /api/telegram
 * ─────────────────────────────────────────────────────────────
 * Receives updates from Telegram (webhook mode).
 *
 * Telegram calls this URL every time a user sends the bot a
 * message.  We process it with the shared bot-handler and send
 * the reply back via the Telegram API.
 *
 * Always returns HTTP 200 to prevent Telegram retrying.
 * ─────────────────────────────────────────────────────────────
 */

const { processMessage } = require('../lib/bot-handler');
const { sendMessage, sendTyping } = require('../lib/telegram-api');
const { getHistory, appendHistory } = require('../lib/conversation-store');

// ── Security: verify Telegram's secret token ────────────────
// Set TELEGRAM_WEBHOOK_SECRET to any random string, then pass
// it when registering the webhook:
//   setWebhook(url, { secret_token: process.env.TELEGRAM_WEBHOOK_SECRET })
function isValidRequest(req) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return true; // secret not configured → skip check
  return req.headers['x-telegram-bot-api-secret-token'] === secret;
}

// ── Main handler ──────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // Telegram only POSTs to webhooks
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Security check
  if (!isValidRequest(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ── Parse update ───────────────────────────────────────────
  let update = req.body;
  if (typeof update === 'string') {
    try { update = JSON.parse(update); } catch { update = {}; }
  }

  // Always acknowledge immediately — Telegram will retry on non-200
  res.status(200).json({ ok: true });

  // ── Handle only text messages for now ─────────────────────
  const msg = update?.message;
  if (!msg?.text) return; // ignore non-text (photos, stickers, etc.)

  const chatId = msg.chat.id;
  const text   = msg.text.trim();

  // ── Commands ───────────────────────────────────────────────
  if (text === '/start') {
    await sendMessage(chatId, '👋 Hello! How can I help you today?');
    return;
  }

  if (text === '/clear') {
    const { clearHistory } = require('../lib/conversation-store');
    await clearHistory(String(chatId));
    await sendMessage(chatId, '🗑️ Conversation cleared. Starting fresh!');
    return;
  }

  // ── Process message ────────────────────────────────────────
  try {
    // Show typing indicator while AI processes
    await sendTyping(chatId);

    const sessionId = String(chatId);
    const history   = await getHistory(sessionId);

    // ← Same function the web endpoint uses
    const reply = await processMessage(text, sessionId, history);

    await appendHistory(sessionId, text, reply);
    await sendMessage(chatId, reply);
  } catch (err) {
    console.error('[/api/telegram] Error:', err);
    await sendMessage(
      chatId,
      '⚠️ Something went wrong. Please try again in a moment.'
    ).catch(() => {}); // swallow send errors to avoid infinite loop
  }
};
