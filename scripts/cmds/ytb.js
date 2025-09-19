const axios = require("axios");
const fs = require("fs-extra");
const { downloadFile } = global.utils;

const YT_API_KEY = "AIzaSyDPNYKIScRqA85b2HtW8jNcMPFSQ0nhIdc";

function extractYouTubeUrl(text = "") {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([\w-]{11})/,
    /(?:https?:\/\/)?youtube\.com\/watch\?v=([\w-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const finalUrl = `https://youtu.be/${match[1]}`;
      return finalUrl;
    }
  }
  
  return null;
}

function convertToApiFormat(videoId) {
  return `https://youtu.be/${videoId}`;
}

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return "Inconnue";
  sec = Number(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function parseISO8601Duration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1]||0)*3600) + (parseInt(match[2]||0)*60) + (parseInt(match[3]||0));
}

async function streamFrom(url) {
  const res = await axios.get(url, { responseType: "stream" });
  return res.data;
}

async function searchYouTube(query, limit = 8) {
  try {
    const searchRes = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: { key: YT_API_KEY, part: "snippet", q: query, type: "video", maxResults: limit }
    });

    const ids = searchRes.data.items.map(v => v.id.videoId).join(",");

    const detailsRes = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: { key: YT_API_KEY, part: "snippet,contentDetails,statistics", id: ids }
    });

    return detailsRes.data.items.map(v => ({
      id: v.id,
      title: v.snippet.title,
      author: v.snippet.channelTitle,
      thumbnail: v.snippet.thumbnails?.medium?.url || null,
      durationSeconds: parseISO8601Duration(v.contentDetails.duration),
      views: v.statistics.viewCount || "Inconnues",
      likes: v.statistics.likeCount || "Inconnus"
    }));
  } catch (err) {
    console.error("Erreur YouTube API:", err.message);
    return [];
  }
}

async function getVideoDownload(videoUrl) {
  try {
    const apiUrl = `https://www.noobs-api.rf.gd/dipto/alldl?url=${encodeURIComponent(videoUrl)}`;
    const { data } = await axios.get(apiUrl);
    
    if (data.error) {
      return { error: `Erreur API: ${data.error} - Réponse complète: ${JSON.stringify(data)}` };
    }
    
    if (data.result) {
      return {
        downloadUrl: data.result,
        title: data.cp || "Vidéo YouTube"
      };
    }
    
    return { error: `Format de réponse inattendu: ${JSON.stringify(data)}` };
    
  } catch (error) {
    return { error: `Erreur HTTP complète: ${error.message} - Status: ${error.response?.status} - Data: ${JSON.stringify(error.response?.data)}` };
  }
}

async function downloadAndSend(videoUrl, { event, api, message }) {
  const downloadData = await getVideoDownload(videoUrl);
  
  if (!downloadData) {
    return message.reply("❌ Aucune réponse de l'API");
  }
  
  if (downloadData.error) {
    return message.reply(`❌ ${downloadData.error}`);
  }

  try {
    const tmpDir = __dirname + "/tmp";
    fs.ensureDirSync(tmpDir);
    const path = `${tmpDir}/${Date.now()}.mp4`;

    const vid = (await axios.get(downloadData.downloadUrl, { responseType: "arraybuffer" })).data;
    
    fs.writeFileSync(path, Buffer.from(vid, "utf-8"));
    
    api.setMessageReaction("✅", event.messageID, (err) => {}, true);
    
    api.sendMessage(
      {
        body: `🎬 𝙃𝙚𝙧𝙚'𝙨 𝙮𝙤𝙪𝙧 𝙔𝙤𝙪𝙏𝙪𝙗𝙚 𝙫𝙞𝙙𝙚𝙤 <🕵🏽‍♂️ ( powered by Kay and Arsene )`,
        attachment: fs.createReadStream(path),
      },
      event.threadID,
      () => fs.unlinkSync(path),
      event.messageID,
    );
    
  } catch (err) {
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    message.reply(`❌ Erreur téléchargement complète: ${err.message} - ${JSON.stringify(err.response?.data)}`);
  }
}

module.exports = {
  config: {
    name: "ytb",
    version: "2.0",
    author: "Arsène || Kay",
    countDown: 10,
    role: 0,
    shortDescription: "Search and download YouTube videos, enjoy!",
    longDescription: "Search and download YouTube videos, enjoy!",
    category: "média",
    guide: { fr: "{pn} [mot-clé ou URL] — puis réponds avec le numéro de la vidéo." }
  },

  onStart: async function({ event, api, message, args }) {
    try {
      const directUrl = args[0] && (args[0].includes("youtube.com") || args[0].includes("youtu.be"))
        ? extractYouTubeUrl(args[0])
        : null;

      if (!directUrl && args.length === 0) return message.reply("⚠️ Donne un mot-clé ou un lien YouTube");

      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      if (directUrl) return downloadAndSend(directUrl, { event, api, message });

      const query = args.join(" ");
      const results = await searchYouTube(query, 8);
      if (!results.length) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Aucun résultat trouvé sur YouTube.");
      }

      let txt = "🎬 𝗥𝗲́s𝘂𝗹𝘁𝗮𝘁𝘀 𝗬𝗼𝘂𝗧𝘂𝗯𝗲 :\n\n";
      const top = results.slice(0, 5);
      const attachments = [];

      for (let i = 0; i < top.length; i++) {
        const v = top[i];
        txt += `${i + 1}. ${v.title}
⏱ Durée: ${formatDuration(v.durationSeconds)} 
📺 Chaîne: ${v.author} 
👁️ Vues: ${v.views} | 👍 Likes: ${v.likes}\n\n`;
        if (v.thumbnail) {
          try { attachments.push(await streamFrom(v.thumbnail)); } catch {}
        }
      }
      txt += "➡️ Réponds avec le **numéro** de la vidéo à télécharger.";

      const listMsg = await message.reply({ body: txt, attachment: attachments });

      global.GoatBot.onReply.set(listMsg.messageID, {
        commandName: this.config.name,
        author: event.senderID,
        results: top,
        originMsgId: event.messageID
      });

    } catch (err) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply("❌ Erreur lors de la recherche");
    }
  },

  onReply: async function({ event, api, message, Reply }) {
    try {
      const { author, results, originMsgId } = Reply;
      if (event.senderID !== author) return;

      const choice = parseInt((event.body || "").trim(), 10);
      if (isNaN(choice) || choice < 1 || choice > results.length) return message.reply("⚠️ Numéro invalide !");

      api.setMessageReaction("⏳", event.messageID, () => {}, true);
      if (originMsgId) api.setMessageReaction("⏳", originMsgId, () => {}, true);

      const selected = results[choice - 1];
      const videoUrl = convertToApiFormat(selected.id);
      await downloadAndSend(videoUrl, { event, api, message });

      if (originMsgId) api.setMessageReaction("✅", originMsgId, () => {}, true);
    } catch (err) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply("❌ Erreur lors du téléchargement");
    }
  },

  onMessage: async function({ event, api }) {
    const url = extractYouTubeUrl(event.body || "");
    if (!url) return;
    api.setMessageReaction("⏳", event.messageID, () => {}, true);
    await downloadAndSend(url, {
      event,
      api,
      message: { reply: (payload) => api.sendMessage(payload, event.threadID) }
    });
    api.setMessageReaction("✅", event.messageID, () => {}, true);
  }
};
