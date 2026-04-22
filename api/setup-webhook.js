/**
 * /api/setup-webhook.js  →  GET /api/setup-webhook?token=ADMIN_TOKEN
 * ─────────────────────────────────────────────────────────────
 * One-time setup: registers your Vercel deployment URL as the
 * Telegram webhook.  Run once after every new deployment if you
 * change the webhook URL.
 *
 * Protected by ADMIN_TOKEN so random visitors can't call it.
 * ─────────────────────────────────────────────────────────────
 */

const { setWebhook } = require('../lib/telegram-api');

module.exports = async function handler(req, res) {
  // Simple token gate
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || req.query.token !== adminToken) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Derive the webhook URL from the current deployment
  const host =
    process.env.VERCEL_URL                           // set automatically by Vercel
    ?? req.headers['x-forwarded-host']
    ?? req.headers.host;

  if (!host) {
    return res.status(500).json({ error: 'Could not determine host URL' });
  }

  const webhookUrl = `https://${host}/api/telegram`;

  try {
    const result = await setWebhook(webhookUrl);
    return res.status(200).json({
      ok: true,
      webhookUrl,
      telegramResponse: result,
    });
  } catch (err) {
    console.error('[setup-webhook]', err);
    return res.status(500).json({ error: err.message });
  }
};
