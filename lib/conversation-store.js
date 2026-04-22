/**
 * conversation-store.js
 * ─────────────────────────────────────────────────────────────
 * Persists per-session conversation history so the bot has
 * multi-turn context on both Telegram and the web.
 *
 * Production  → Vercel KV  (Redis-backed, survives cold starts)
 * Development → In-memory  Map (resets on restart, zero config)
 *
 * To enable Vercel KV:
 *   1. vercel env add KV_REST_API_URL
 *   2. vercel env add KV_REST_API_TOKEN
 *   (Created automatically when you link a KV store in the
 *    Vercel dashboard: Storage → Create → KV)
 * ─────────────────────────────────────────────────────────────
 */

const MAX_HISTORY   = 20;   // messages kept per session
const TTL_SECONDS   = 60 * 60 * 24; // 24 h — Vercel KV expiry

// ── In-memory fallback (dev / no KV configured) ───────────────
const memStore = new Map();

// ── Vercel KV client (lazy-loaded so missing env doesn't crash) ─
let kv = null;
async function getKV() {
  if (kv) return kv;
  if (!process.env.KV_REST_API_URL) return null;
  try {
    const { kv: client } = await import('@vercel/kv');
    kv = client;
    return kv;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────

/**
 * Load conversation history for a session.
 * @param {string} sessionId
 * @returns {Promise<Array>} [{role, content}, ...]
 */
async function getHistory(sessionId) {
  const store = await getKV();
  if (store) {
    const data = await store.get(`chat:${sessionId}`);
    return data ? JSON.parse(data) : [];
  }
  return memStore.get(sessionId) ?? [];
}

/**
 * Append a user message and bot reply to the session history.
 * Trims to MAX_HISTORY pairs so the context window stays bounded.
 *
 * @param {string} sessionId
 * @param {string} userText
 * @param {string} botText
 */
async function appendHistory(sessionId, userText, botText) {
  const history = await getHistory(sessionId);

  history.push({ role: 'user',      content: userText });
  history.push({ role: 'assistant', content: botText  });

  // Keep only the last MAX_HISTORY messages (FIFO)
  const trimmed = history.slice(-MAX_HISTORY);

  const store = await getKV();
  if (store) {
    await store.set(`chat:${sessionId}`, JSON.stringify(trimmed), {
      ex: TTL_SECONDS,
    });
  } else {
    memStore.set(sessionId, trimmed);
  }
}

/**
 * Wipe the history for a session (e.g. user clicks "New Chat").
 * @param {string} sessionId
 */
async function clearHistory(sessionId) {
  const store = await getKV();
  if (store) {
    await store.del(`chat:${sessionId}`);
  } else {
    memStore.delete(sessionId);
  }
}

module.exports = { getHistory, appendHistory, clearHistory };
