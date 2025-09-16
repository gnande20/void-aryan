const axios = require("axios");

module.exports = {
  config: {
    name: "gitstalk",
    version: "1.0",
    author: "Aryan Chauhan",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Stalk a GitHub profile" },
    longDescription: { en: "Fetches GitHub user details (public) using Aryan API." },
    category: "social",
    guide: { en: "{pn} <github-username>\n\nExample:\n{pn} ntkhang03" }
  },

  onStart: async function ({ api, args, event }) {
    if (!args[0]) {
      return api.sendMessage("❌ Please provide a GitHub username.", event.threadID, event.messageID);
    }

    const username = args[0];
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      const url = `https://aryanapi.up.railway.app/api/gitinfo?username=${encodeURIComponent(username)}`;
      const { data } = await axios.get(url);

      if (!data.status || !data.data) {
        return api.sendMessage("❌ Could not fetch GitHub profile info.", event.threadID, event.messageID);
      }

      const u = data.data;
      const caption =
`🐙 GitHub Profile Stalk

👤 Name: ${u.name || "N/A"}
🔗 Username: ${u.login}
📝 Bio: ${u.bio || "No bio"}

📂 Public Repos: ${u.public_repos}
📑 Public Gists: ${u.public_gists}
👥 Followers: ${u.followers}
➡️ Following: ${u.following}

📅 Joined: ${new Date(u.created_at).toLocaleDateString()}
♻️ Last Updated: ${new Date(u.updated_at).toLocaleDateString()}

🌍 Blog: ${u.blog || "N/A"}
🐦 Twitter: ${u.twitter_username || "N/A"}
🏢 Company: ${u.company || "N/A"}
📍 Location: ${u.location || "N/A"}

🔗 Profile: ${u.html_url}

👀 Requested by: @${event.senderID}`;

      api.sendMessage({
        body: caption,
        attachment: await getStreamFromURL(u.avatar_url)
      }, event.threadID, event.messageID);

      api.setMessageReaction("✅", event.messageID, () => {}, true);

    } catch (err) {
      console.error("❌ Gitstalk Error:", err.message);
      api.sendMessage("❌ Failed to fetch GitHub profile info.", event.threadID, event.messageID);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
    }
  }
};

async function getStreamFromURL(url) {
  const res = await axios({ url, responseType: "stream" });
  return res.data;
    }
