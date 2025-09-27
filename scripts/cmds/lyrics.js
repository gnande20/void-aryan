const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "lyrics",
    version: "1.2",
    author: "Aryan Chauhan",
    countDown: 5,
    role: 0,
    shortDescription: "Fetch lyrics of a song",
    longDescription: "Get detailed song lyrics with title, artist, and cover art.",
    category: "search",
    guide: {
      en: "{pn} <song name>\nExample: {pn} apt"
    }
  },

  onStart: async function ({ api, event, args }) {
    const query = args.join(" ");
    if (!query) {
      return api.sendMessage(
        "⚠️ Please provide a song name!\nExample: lyrics apt",
        event.threadID,
        event.messageID
      );
    }

    try {
      const { data } = await axios.get(
        `https://lyricstx.vercel.app/youtube/lyrics?title=${encodeURIComponent(query)}`
      );

      if (!data?.lyrics) {
        return api.sendMessage("❌ Lyrics not found.", event.threadID, event.messageID);
      }

      const { artist_name, track_name, artwork_url, lyrics } = data;

      const imgPath = path.join(__dirname, "lyrics.jpg");
      const imgResp = await axios.get(artwork_url, { responseType: "stream" });
      const writer = fs.createWriteStream(imgPath);
      imgResp.data.pipe(writer);

      writer.on("finish", () => {
        api.sendMessage(
          {
            body: `🎼 ${track_name}\n👤 Artist: ${artist_name}\n\n${lyrics}`,
            attachment: fs.createReadStream(imgPath)
          },
          event.threadID,
          () => fs.unlinkSync(imgPath),
          event.messageID
        );
      });

      writer.on("error", () => {
        api.sendMessage(
          `🎼 ${track_name}\n👤 Artist: ${artist_name}\n\n${lyrics}`,
          event.threadID,
          event.messageID
        );
      });

    } catch (err) {
      console.error(err);
      api.sendMessage("❌ Error: Unable to fetch lyrics. Please try again later.", event.threadID, event.messageID);
    }
  }
};
