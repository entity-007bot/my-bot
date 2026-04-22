# Telegram ↔ Web Chat Bridge

Extend your existing Telegram bot to work on your website — without rewriting any bot logic.

Both the Telegram bot and the website call **the same `processMessage()` function**, so your AI responses are always consistent across platforms.

```
Website Chat UI ──► POST /api/chat ──► processMessage() ──► reply
                                              │
Telegram user   ──► POST /api/telegram ──────┘
```

---

## Project structure

```
├── api/
│   ├── chat.js            # Web chat endpoint  →  POST /api/chat
│   ├── telegram.js        # Telegram webhook   →  POST /api/telegram
│   └── setup-webhook.js   # One-time setup     →  GET  /api/setup-webhook
│
├── lib/
│   ├── bot-handler.js         # ★ YOUR BOT LOGIC GOES HERE ★
│   ├── telegram-api.js        # Thin Telegram Bot API wrapper
│   └── conversation-store.js  # Per-session history (KV / in-memory)
│
├── public/
│   └── index.html         # Drop-in chat UI (no build step needed)
│
├── vercel.json
├── package.json
└── .env.example
```

---

## 1 · Plug in your existing bot logic

Open **`lib/bot-handler.js`** and replace the placeholder inside `processMessage()` with whatever your bot already does (OpenAI call, Anthropic call, custom pipeline, etc.).

```js
// lib/bot-handler.js
async function processMessage(text, chatId, history = []) {
  // ← paste your existing AI call here
  // history = [{role:'user', content:'...'}, {role:'assistant', content:'...'}, ...]
  const reply = await yourExistingAIFunction(text, history);
  return reply;
}
```

The `history` array is populated automatically from conversation storage, giving you multi-turn context on both Telegram and the web.

---

## 2 · Set environment variables

```bash
cp .env.example .env.local
# then fill in the values
```

| Variable | Required | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | From @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Recommended | Random string; Telegram sends it on every webhook call so you can verify the source |
| `ADMIN_TOKEN` | Recommended | Protects the `/api/setup-webhook` helper endpoint |
| `ALLOWED_ORIGIN` | Optional | CORS origin for `/api/chat` (default `*`) |
| `OPENAI_API_KEY` / etc. | Depends on your bot | Whatever your AI provider needs |

Add the same variables to Vercel:
```bash
vercel env add TELEGRAM_BOT_TOKEN
vercel env add TELEGRAM_WEBHOOK_SECRET
vercel env add ADMIN_TOKEN
# ... etc
```

Or via the Vercel dashboard → **Settings → Environment Variables**.

---

## 3 · Deploy to Vercel

```bash
npm install
npx vercel --prod
```

Note your deployment URL (e.g. `https://your-project.vercel.app`).

---

## 4 · Register the Telegram webhook

After deploying, call the setup endpoint once to tell Telegram where to send updates:

```
GET https://your-project.vercel.app/api/setup-webhook?token=YOUR_ADMIN_TOKEN
```

You should see:
```json
{ "ok": true, "webhookUrl": "https://your-project.vercel.app/api/telegram", ... }
```

You only need to repeat this step if you change your Vercel project URL.

---

## 5 · Test

**Web UI** → Open `https://your-project.vercel.app` and start chatting.

**Telegram** → Send a message to your bot in the Telegram app.

Both use the same `processMessage()` function and maintain separate conversation histories per user.

---

## Optional: Persistent conversation history (Vercel KV)

By default the bridge uses an **in-memory Map** for conversation history, which resets on every cold start (fine for prototyping).

For production, enable **Vercel KV** (Redis):

1. Go to the Vercel dashboard → **Storage → Create → KV**
2. Click **Connect to project**
3. Vercel automatically adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` to your environment

No code changes needed — `conversation-store.js` detects KV automatically.

---

## API reference

### `POST /api/chat`

Web chat endpoint. Called by the frontend.

**Request**
```json
{
  "message":   "Hello!",
  "sessionId": "web_1234_abc"
}
```

**Response**
```json
{
  "reply":     "Hi! How can I help you?",
  "sessionId": "web_1234_abc"
}
```

**Clear conversation**
```json
{ "action": "clear", "sessionId": "web_1234_abc" }
```

### `POST /api/telegram`

Telegram webhook — called automatically by Telegram, not by you.

---

## Embedding the chat UI in an existing page

Instead of serving `public/index.html` as a standalone page, you can embed just the chat widget into any existing HTML:

1. Copy the `<style>` block and `<script>` block from `public/index.html` into your page.
2. Change `API_ENDPOINT` in the script to the absolute URL of your Vercel deployment:
   ```js
   const API_ENDPOINT = 'https://your-project.vercel.app/api/chat';
   ```
3. Set `ALLOWED_ORIGIN=https://yoursite.com` in your Vercel environment variables.

---

## Security checklist

- [x] `TELEGRAM_WEBHOOK_SECRET` prevents spoofed requests to `/api/telegram`
- [x] `ADMIN_TOKEN` protects the webhook setup endpoint
- [x] `ALLOWED_ORIGIN` restricts CORS to your domain
- [x] Messages are truncated to 4 000 chars before processing
- [x] Rate limiting: 30 messages / minute per session (adjust in `api/chat.js`)
- [ ] For high-traffic sites, replace the in-memory rate limiter with Upstash Ratelimit
