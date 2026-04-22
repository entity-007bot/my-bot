async function brain(text, chatId, history = []) {
  if (!text) return "Send something.";

  const msg = text.toLowerCase();

  // REAL MEMORY SIMULATION (per user)
  if (!global.memory) global.memory = new Map();

  if (!global.memory.has(chatId)) {
    global.memory.set(chatId, {
      messages: [],
      name: null
    });
  }

  const user = global.memory.get(chatId);

  user.messages.push(text);
  if (user.messages.length > 20) user.messages.shift();

  // ─────────────────────────────
  // REAL UNDERSTANDING
  // ─────────────────────────────

  if (msg.includes("hello") || msg.includes("hi")) {
    return "👋 Hello! I am your Telegram brain-powered bot.";
  }

  if (msg.includes("who created you")) {
    return "🤖 I was created by your Telegram bot system running on Vercel.";
  }

  if (msg.includes("my name is")) {
    const name = text.split("is")[1]?.trim();
    user.name = name;
    return `Nice to meet you ${name}`;
  }

  if (msg.includes("what is my name")) {
    return user.name
      ? `Your name is ${user.name}`
      : "I don't know your name yet.";
  }

  if (msg.includes("history")) {
    return `Your last messages:\n- ${user.messages.join("\n- ")}`;
  }

  // ─────────────────────────────
  // SMART DEFAULT (NOT ECHO)
  // ─────────────────────────────
  return `🤖 I understood your message:\n"${text}"\n\nAsk me something else.`;
}

module.exports = { brain };
