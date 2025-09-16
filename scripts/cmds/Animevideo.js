const axios = require("axios");

module.exports = {
  config: {
    name: "animevideo",
    aliases: ["anivideo", "avideo"],
    version: "1.1",
    author: "Aryan Chauhan",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Get a random anime video"
    },
    description: {
      en: "Fetches and sends a random anime video with details"
    },
    category: "media",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ message }) {
    try {
      const res = await axios.get("https://aryanapi.up.railway.app/api/animevideo");
      const response = res.data;

      if (!response?.data || !response.data.playUrl) {
        return message.reply("⚠️ Couldn't fetch anime video, try again later.");
      }

      const data = response.data;

      const caption =
`🎬 ${data.title}
👤 Author: ${data.author}
📹 Uploader: ${data.user?.nickname || "Unknown"}
👁 Views: ${data.playCount}
❤️ Likes: ${data.diggCount}
💬 Comments: ${data.commentCount}
🔁 Shares: ${data.shareCount}
⬇ Downloads: ${data.downloadCount}`;

      await message.reply({
        body: caption,
        attachment: await global.utils.getStreamFromURL(data.playUrl)
      });

    } catch (e) {
      console.error(e);
      message.reply("❌ Error fetching anime video.");
    }
  }
};
