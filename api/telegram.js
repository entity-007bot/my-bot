/**
 * /api/telegram.js → Telegram Webhook Handler (Vercel Serverless)
 * ---------------------------------------------------------------
 * FIXED VERSION:
 * - Prevents bot echo loops
 * - Prevents duplicate processing
 * - Handles malformed updates safely
 * - Works properly on Vercel serverless
 * - Supports conversation memory
 */

const { processMessage } = require('../lib/bot-handler');
const { sendMessage, sendTyping } = require('../lib/telegram-api');
const { getHistory, appendHistory, clearHistory } = require('../lib/conversation-store');

/**
 * Validate Telegram webhook secret (optional but recommended)
 */
function isValidRequest(req) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return true;

  return (
    req.headers['x-telegram-bot-api-secret-token'] === secret
  );
}

/**
 * Safe JSON parser for Vercel body handling issues
 */
function parseUpdate(body) {
  try {
    if (!body) return null;
    if (typeof body === 'object') return body;
    return JSON.parse(body);
  } catch (err) {
    console.error('Failed to parse update:', err);
    return null;
  }
}

/**
 * Main webhook handler
 */
module.exports = async function handler(req, res) {
  try {
    // ─────────────────────────────────────────────
    // Only accept POST
    // ─────────────────────────────────────────────
    if (req.method !== 'POST') {
      return res.status(200).send('OK');
    }

    // ─────────────────────────────────────────────
    // Security check (optional secret token)
    // ─────────────────────────────────────────────
    if (!isValidRequest(req)) {
      return res.status(403).send('Forbidden');
    }

    // ─────────────────────────────────────────────
    // Parse Telegram update safely
    // ─────────────────────────────────────────────
    const update = parseUpdate(req.body);
    if (!update) return res.status(200).send('No update');

    // ─────────────────────────────────────────────
    // Respond immediately to Telegram
    // (IMPORTANT: prevents retries)
    // ─────────────────────────────────────────────
    res.status(200).json({ ok: true });

    // ─────────────────────────────────────────────
    // Extract message safely
    // ─────────────────────────────────────────────
    const msg = update.message || update.edited_message;
    if (!msg) return;

    // ─────────────────────────────────────────────
    // 🚨 CRITICAL FIX: prevent bot loops
    // ─────────────────────────────────────────────
    if (msg.from?.is_bot) {
      console.log('Ignored bot message');
      return;
    }

    const chatId = msg.chat?.id;
    const text = msg.text?.trim();

    if (!chatId || !text) return;

    // ─────────────────────────────────────────────
    // Commands handling
    // ─────────────────────────────────────────────
    if (text === '/start') {
      await sendMessage(chatId, '👋 Welcome! I am your AI bot.');
      return;
    }

    if (text === '/clear') {
      await clearHistory(String(chatId));
      await sendMessage(chatId, '🗑️ Chat history cleared.');
      return;
    }

    // ─────────────────────────────────────────────
    // AI processing pipeline
    // ─────────────────────────────────────────────
    try {
      await sendTyping(chatId);

      const sessionId = String(chatId);
      const history = await getHistory(sessionId);

      // Call AI / logic layer
      const reply = await processMessage(text, sessionId, history);

      // ─────────────────────────────────────────────
      // 🚨 SAFETY CHECK: prevent echo replies
      // ─────────────────────────────────────────────
      if (!reply || reply === text) {
        await sendMessage(chatId, '⚠️ I could not generate a proper response.');
        return;
      }

      // Save conversation memory
      await appendHistory(sessionId, text, reply);

      // Send response
      await sendMessage(chatId, reply);

    } catch (err) {
      console.error('Bot processing error:', err);

      await sendMessage(
        chatId,
        '⚠️ Something went wrong. Please try again later.'
      ).catch(() => {});
    }

  } catch (err) {
    console.error('Webhook fatal error:', err);
    return res.status(200).send('Error handled');
  }
};
