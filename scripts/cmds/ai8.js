const axios = require("axios");

module.exports = {
  config: {
    name: "ai",
    aliases: ["gpt"],
    version: "1.4",
    author: "Aryan Chauhan",
    countDown: 0,
    role: 0,
    shortDescription: { en: "Chat with LLaMA-4 Maverick AI" },
    longDescription: { en: "Chat with LLaMA-4 Maverick 17B-128E Instruct model with image support" },
    category: "ai",
    guide: { en: "{p}ai <message> (+ optional image or reply to image)" }
  },

  onStart: async ({ api, event, args }) => {
    const q = args.join(" ").trim();
    const img = getImg(event);
    if (!q && !img) return api.sendMessage("⚠️ Enter a prompt or attach/reply to an image.", event.threadID, event.messageID);
    chat(api, event, q, img);
  },

  onReply: async ({ api, event, Reply }) => {
    if (event.senderID !== Reply.author) return;
    const q = (event.body || "").trim();
    const img = getImg(event);
    if (!q && !img) return api.sendMessage("⚠️ Please reply with text or an image.", event.threadID, event.messageID);
    chat(api, event, q, img);
  },

  onChat: async ({ api, event }) => {
    const msg = (event.body || "").trim();
    if (!/^ai\s+/i.test(msg) && !/^gpt\s+/i.test(msg)) return;
    const q = msg.replace(/^(ai|gpt)\s+/i, "").trim();
    const img = getImg(event);
    if (!q && !img) return;
    chat(api, event, q, img);
  }
};

function getImg(e) {
  const pick = att => att && (att.url || att.previewUrl || att.image || att.src || att.data?.url || "");
  if (e.attachments?.length) return pick(e.attachments[0]);
  if (e.messageReply?.attachments?.length) return pick(e.messageReply.attachments[0]);
  return "";
}

async function chat(api, e, q, url) {
  api.setMessageReaction("⏳", e.messageID, () => {}, true);
  try {
    const r = await axios.get("https://aryanapi.up.railway.app/api/llama-4-maverick-17b-128e-instruct", {
      params: { uid: e.senderID, prompt: q, url },
      timeout: 45000
    });

    const reply = r.data?.reply;
    if (!reply) {
      api.sendMessage("❌ AI returned no reply.", e.threadID, () => {
        api.setMessageReaction("❌", e.messageID, () => {}, true);
      }, e.messageID);
      return;
    }

    api.sendMessage(reply, e.threadID, (err, info) => {
      if (err) return api.setMessageReaction("❌", e.messageID, () => {}, true);
      api.setMessageReaction("✅", e.messageID, () => {}, true);
      try {
        global.GoatBot.onReply.set(info.messageID, { commandName: "ai", author: e.senderID });
      } catch {}
    }, e.messageID);

  } catch (err) {
    console.error("AI error:", err?.message || err);
    api.sendMessage("❌ Error from AI.", e.threadID, () => {
      api.setMessageReaction("❌", e.messageID, () => {}, true);
    }, e.messageID);
  }
                                                       }
