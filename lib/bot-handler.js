/**
 * SMART TELEGRAM BOT (NO OPENAI)
 * --------------------------------
 * - Multi-user safe
 * - Per chat memory
 * - No echo bug
 * - Simple AI-like behavior
 */

const memory = new Map(); // in-memory per device/chat

async function processMessage(text, chatId, history = []) {
  if (!text) return "Send me something 🙂";

  const msg = text.toLowerCase().trim();

  // ─────────────────────────────
  // GET USER MEMORY
  // ─────────────────────────────
  if (!memory.has(chatId)) {
    memory.set(chatId, {
      name: null,
      lastMessages: []
    });
  }

  const user = memory.get(chatId);

  // store history safely (per user only)
  user.lastMessages.push(text);
  if (user.lastMessages.length > 10) user.lastMessages.shift();

  // ─────────────────────────────
  // GREETING DETECTION
  // ─────────────────────────────
  if (msg.includes("hello") || msg.includes("hi")) {
    return "👋 Hello! I'm your smart bot. How can I help you?";
  }

  // ─────────────────────────────
  // NAME DETECTION (memory example)
  // ─────────────────────────────
  if (msg.includes("my name is")) {
    const name = text.split("is")[1]?.trim();
    if (name) {
      user.name = name;
      return `Nice to meet you, ${name} 😊`;
    }
  }

  if (msg.includes("what is my name")) {
    return user.name
      ? `Your name is ${user.name}`
      : "I don't know your name yet. Tell me: My name is ...";
  }

  // ─────────────────────────────
  // CHAT MEMORY RESPONSE
  // ─────────────────────────────
  if (msg.includes("what did i say")) {
    return `Your last messages:\n- ${user.lastMessages.join("\n- ")}`;
  }

  // ─────────────────────────────
  // BASIC SMART RESPONSES
  // ─────────────────────────────
  if (msg.includes("how are you")) {
    return "😊 I'm good! Always active and ready.";
  }

  if (msg.includes("help")) {
    return "🛠️ Try saying: hello, my name is..., what is my name";
  }

  if (msg.includes("bye")) {
    return "👋 Goodbye! Talk later.";
  }

  // ─────────────────────────────
  // DEFAULT SMART RESPONSE (NO ECHO)
  // ─────────────────────────────
  return `🤖 I understood: "${text}"

Try:
- hello
- my name is ...
- help`;
}

module.exports = { processMessage };
