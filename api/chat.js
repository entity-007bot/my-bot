/**
 * /api/chat.js  →  POST /api/chat
 * ─────────────────────────────────────────────────────────────
 * Web-facing chat endpoint.
 *
 * Request body  { message: string, sessionId: string }
 * Response body { reply: string, sessionId: string }
 *
 * Each browser session gets a stable sessionId (stored in
 * localStorage on the client) that acts like a Telegram chat_id,
 * giving every user isolated, persistent conversation history.
 * ─────────────────────────────────────────────────────────────
 */

const { processMessage } = require('../lib/bot-handler');
const { getHistory, appendHistory, clearHistory } = require('../lib/conversation-store');

// ── CORS helper ───────────────────────────────────────────────
function setCORS(res) {
  const allowed = process.env.ALLOWED_ORIGIN ?? '*';
  res.setHeader('Access-Control-Allow-Origin',  allowed);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Rate-limit (in-memory, per process) ───────────────────────
// Swap for Upstash Ratelimit in production if needed.
const rateLimitMap = new Map(); // sessionId → { count, resetAt }
const RATE_LIMIT    = 30;       // messages per window
const RATE_WINDOW   = 60_000;   // 1 minute (ms)

function checkRateLimit(sessionId) {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── Main handler ──────────────────────────────────────────────
module.exports = async function handler(req, res) {
  setCORS(res);

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Parse body ─────────────────────────────────────────────
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { message, sessionId: clientSessionId, action } = body ?? {};

  // Generate / validate sessionId
  const sessionId =
    typeof clientSessionId === 'string' && clientSessionId.length >= 8
      ? clientSessionId.slice(0, 64)   // sanitise length
      : `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // ── Handle "clear" action ──────────────────────────────────
  if (action === 'clear') {
    await clearHistory(sessionId);
    return res.status(200).json({ ok: true, sessionId });
  }

  // ── Validate message ───────────────────────────────────────
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  const trimmed = message.trim().slice(0, 4000); // max 4 k chars
  if (!trimmed) {
    return res.status(400).json({ error: 'message cannot be empty' });
  }

  // ── Rate limit ─────────────────────────────────────────────
  if (!checkRateLimit(sessionId)) {
    return res.status(429).json({
      error: 'Too many messages. Please wait a moment.',
    });
  }

  // ── Process ────────────────────────────────────────────────
  try {
    const history = await getHistory(sessionId);

    // Call the exact same logic your Telegram bot uses
    const reply = await processMessage(trimmed, sessionId, history);

    // Persist the exchange for multi-turn context
    await appendHistory(sessionId, trimmed, reply);

    return res.status(200).json({ reply, sessionId });
  } catch (err) {
    console.error('[/api/chat] processMessage failed:', err);
    return res.status(500).json({
      error: 'The bot encountered an error. Please try again.',
    });
  }
};
