import "dotenv/config";
import { joinVoiceChannel } from "@discordjs/voice";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelType
} from "discord.js";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { ReplicaGame, RouletteGame } from "./games";
import { createCanvas } from "canvas";
const PORT = 3e3;
const SESSION_SECRET = process.env.OAUTH_SESSION_SECRET || "default_super_secret_session_key";
function cleanEnvVar(val) {
  if (!val) return "";
  return val.trim().replace(/^['"]|['"]$/g, "").trim();
}
let DISCORD_BOT_TOKEN = cleanEnvVar(process.env.DISCORD_BOT_TOKEN);
let DISCORD_CLIENT_ID = cleanEnvVar(process.env.DISCORD_CLIENT_ID);
let DISCORD_CLIENT_SECRET = cleanEnvVar(process.env.DISCORD_CLIENT_SECRET);
function updateEnvFile(updates) {
  const envPath = path.join(process.cwd(), ".env");
  let content = "";
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf8");
  }
  const lines = content.split("\n");
  const keysInput = Object.keys(updates);
  for (const key of keysInput) {
    let keyFound = false;
    const value = updates[key];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const cleanLine = line.replace(/\s+/g, "");
      if (cleanLine.startsWith(`${key}=`)) {
        lines[i] = `${key}="${value}"`;
        keyFound = true;
        break;
      }
    }
    if (!keyFound) {
      lines.push(`${key}="${value}"`);
    }
  }
  fs.writeFileSync(envPath, lines.join("\n"), "utf8");
  for (const key of keysInput) {
    process.env[key] = updates[key];
  }
}
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.AutoModerationExecution,
    GatewayIntentBits.AutoModerationConfiguration
  ],
  // تحسين استهلاك الذاكرة (Memory Optimization) عبر تنظيف الكاش تلقائياً للأشياء غير المستخدمة
  sweepers: {
    messages: {
      interval: 1800, // تنظيف كل نصف ساعة
      lifetime: 900   // إزالة أي رسالة مر عليها أكثر من 15 دقيقة
    },
    threads: {
      interval: 3600,
      lifetime: 1800
    }
  }
});
const TRANSCRIPTS_DIR = path.join(process.cwd(), "transcripts");
if (!fs.existsSync(TRANSCRIPTS_DIR)) {
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}
async function logBrokerEvaluationOnClose(guild, channel, metadata, fileName, closerId) {
  try {
    if (!metadata.BrokerPanel) return;
    const guildId = guild.id;
    const config = guildConfigs.get(guildId) || {};
    const panels = config.brokerPanels || [];
    const panel = panels.find((p) => p.id === metadata.BrokerPanel);
    if (!panel || !panel.reviewsChannelId) return;
    const reviewsChannelId = panel.reviewsChannelId;
    let reviewsChannel = guild.channels.cache.get(reviewsChannelId);
    if (!reviewsChannel) {
      reviewsChannel = await guild.channels.fetch(reviewsChannelId).catch(() => null);
    }
    if (!reviewsChannel) return;

    const ratingStr = metadata.RatingRating ? decodeURIComponent(metadata.RatingRating) : "\u0645\u0628\u062A\u062F\u0626";
    const commentStr = metadata.RatingComment ? decodeURIComponent(metadata.RatingComment) : "\u0644\u0627 \u064A\u0648\u062C\u062F \u062A\u0639\u0644\u064A\u0642 \u0625\u0636\u0627\u0641\u064A";
    const commodityStr = metadata.Commodity ? decodeURIComponent(metadata.Commodity) : "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F";
    const brokerId = metadata.Claimer || "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641";
    const openerId = metadata.TicketOwner || "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641";

    const brokerStats = config.brokerStats?.[brokerId] || { ticketCount: 0 };
    const ticketCount = brokerStats.ticketCount || 1;

    const content = `- **\u062A\u0643\u062A \u0631\u0642\u0645 <:Ticketclosed:1504561975533768734> \`${ticketCount}\` \u0644\u0644\u0648\u0633\u064A\u0637 <@${brokerId}>**
- **\u0627\u0644\u0639\u0645\u064A\u0644 <:Person:1504602083377287230> : <@${openerId}>**
- **\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0648\u0633\u064A\u0637<:Star:1509439133599142039> : ${ratingStr}**
- **\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0645\u062A\u0628\u0627\u062F\u0644\u0629 <:Box:1511312384067637341> : \`${commodityStr}\`**
- **\u062A\u0639\u0644\u064A\u0642 \u0625\u0636\u0627\u0641\u064A \u0645\u0646 \u0627\u0644\u0639\u0645\u064A\u0644 <:Comment:1511312840672411741> : \`\`\`${commentStr}\`\`\`**`;

    const appUrl = process.env.APP_URL || "https://localhost";
    const row = new ActionRowBuilder();
    if (fileName) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel("\u0645\u0644\u0641 html \u0644\u0644\u062A\u0643\u062A (Transcript)")
          .setEmoji("1504600815158169734")
          .setURL(`${appUrl}/transcripts/${fileName}`)
          .setStyle(ButtonStyle.Link)
      );
    }
    await reviewsChannel.send({
      content: content,
      components: row.components.length > 0 ? [row] : []
    }).catch((e) => console.error("Error sending broker closing review:", e));
  } catch (err) {
    console.error("Error in logBrokerEvaluationOnClose:", err);
  }
}
async function generateTranscript(channel) {
  try {
    let allMessages = [];
    let lastId = null;
    let batches = 0;
    while (batches < 10) {
      batches++;
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      const messages = await channel.messages.fetch(options).catch((err) => {
        console.error("Error fetching messages in transcript:", err);
        return null;
      });
      if (!messages || messages.size === 0) break;
      allMessages.push(...Array.from(messages.values()));
      lastId = messages.last()?.id;
      if (messages.size < 100) break;
      if (allMessages.length > 2e3) break;
    }
    allMessages.reverse();
    const messagesHtml = allMessages.map((m) => {
      const time = new Date(m.createdTimestamp || Date.now()).toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit" });
      const date = new Date(m.createdTimestamp || Date.now()).toLocaleDateString("ar-EG");
      const avatar = m.author ? m.author.displayAvatarURL({ extension: "png", size: 64 }) : "https://cdn.discordapp.com/embed/avatars/0.png";
      const content = (m.content || "").replace(/\n/g, "<br>");
      let attachmentsHtml = "";
      if (m.attachments && m.attachments.size > 0) {
        attachmentsHtml = m.attachments.map((a) => {
          if (a.contentType?.startsWith("image/")) {
            return `<img src="${a.url}" class="attachment-img" />`;
          }
          return `<div class="attachment-box"><a href="${a.url}" class="attachment-link" target="_blank">\u{1F4C4} ${a.name || "File"}</a></div>`;
        }).join("");
      }
      let embedsHtml = "";
      if (m.embeds && m.embeds.length > 0) {
        embedsHtml = m.embeds.map((e) => {
          const color = e.hexColor || "#2b2d31";
          return `
            <div class="embed" style="border-left: 4px solid ${color}">
              <div class="embed-content">
                ${e.author ? `<div class="embed-author">${e.author.name || ""}</div>` : ""}
                ${e.title ? `<div class="embed-title">${e.title}</div>` : ""}
                ${e.description ? `<div class="embed-desc">${e.description.replace(/\n/g, "<br>")}</div>` : ""}
                ${e.fields && e.fields.length > 0 ? `
                  <div class="embed-fields">
                    ${e.fields.map((f) => `<div class="embed-field"><div class="field-name">${f.name || ""}</div><div class="field-val">${(f.value || "").replace(/\n/g, "<br>")}</div></div>`).join("")}
                  </div>
                ` : ""}
                ${e.image ? `<img src="${e.image.url}" class="embed-img" />` : ""}
                ${e.thumbnail ? `<img src="${e.thumbnail.url}" class="embed-thumb" />` : ""}
                ${e.footer ? `<div class="embed-footer">${e.footer.text || ""}</div>` : ""}
              </div>
            </div>
          `;
        }).join("");
      }
      const authorName = m.author ? m.author.username : "Unknown User";
      return `
        <div class="message">
          <img src="${avatar}" class="avatar" />
          <div class="message-content">
            <div class="msg-header">
              <span class="username">${authorName}</span>
              <span class="timestamp">${date} ${time}</span>
            </div>
            <div class="text">${content}</div>
            ${attachmentsHtml}
            ${embedsHtml}
          </div>
        </div>
      `;
    }).join("");
    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>\u0633\u062C\u0644 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 - ${channel.name || "Ticket"}</title>
    <style>
        body {
            background-color: #313338;
            color: #dbdee1;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        .header {
            padding: 20px;
            border-bottom: 1px solid #3f4147;
            margin-bottom: 20px;
            background-color: #2b2d31;
            border-radius: 8px;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
        }
        .message {
            display: flex;
            padding: 8px 16px;
            margin-bottom: 2px;
            transition: background-color 0.1s;
        }
        .message:hover {
            background-color: #2e3035;
        }
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-left: 16px;
            flex-shrink: 0;
            margin-top: 2px;
        }
        .message-content {
            display: flex;
            flex-direction: column;
            width: 100%;
        }
        .msg-header {
            margin-bottom: 2px;
        }
        .username {
            color: #ffffff;
            font-weight: 500;
            margin-left: 8px;
            font-size: 1rem;
        }
        .timestamp {
            color: #949ba4;
            font-size: 0.75rem;
        }
        .text {
            color: #dbdee1;
            line-height: 1.375rem;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 1rem;
        }
        .attachment-img {
            max-width: 550px;
            max-height: 350px;
            border-radius: 8px;
            margin-top: 10px;
            display: block;
            border: 1px solid #232428;
        }
        .attachment-box {
            margin-top: 8px;
        }
        .attachment-link {
            background-color: #2b2d31;
            padding: 10px 15px;
            border-radius: 8px;
            color: #00a8fc;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            border: 1px solid #1e1f22;
            font-size: 0.9rem;
        }
        .attachment-link:hover {
            text-decoration: underline;
        }
        
        .embed {
            background-color: #2b2d31;
            border-radius: 4px;
            margin-top: 8px;
            max-width: 520px;
            display: flex;
            position: relative;
        }
        .embed-content {
            padding: 12px 16px;
            width: 100%;
        }
        .embed-author { color: #ffffff; font-size: 0.875rem; font-weight: 600; margin-bottom: 8px; }
        .embed-title { color: #00a8fc; font-size: 1rem; font-weight: 600; margin-bottom: 8px; }
        .embed-desc { color: #dbdee1; font-size: 0.875rem; line-height: 1.125rem; }
        .embed-footer { color: #949ba4; font-size: 0.75rem; margin-top: 8px; }
        .embed-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
        .field-name { color: #ffffff; font-size: 0.875rem; font-weight: 600; }
        .field-val { color: #dbdee1; font-size: 0.875rem; }
        .embed-img { max-width: 100%; border-radius: 4px; margin-top: 10px; }
        .embed-thumb { position: absolute; right: 16px; top: 16px; width: 80px; height: 80px; border-radius: 4px; }

        .footer {
            margin-top: 40px;
            padding: 20px;
            text-align: center;
            color: #949ba4;
            border-top: 1px solid #3f4147;
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>\u0633\u062C\u0644 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 - \u062A\u0630\u0643\u0631\u0629 #${channel.name || "Ticket"}</h1>
            <div style="color: #949ba4; margin-top: 5px;">\u062A\u0645 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0647\u0630\u0627 \u0627\u0644\u0633\u062C\u0644 \u0628\u0648\u0627\u0633\u0637\u0629 \u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0630\u0627\u0643\u0631</div>
        </div>
        ${messagesHtml}
        <div class="footer">
            \u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0630\u0627\u0643\u0631 \u0627\u0644\u0645\u062A\u0637\u0648\u0631 - \u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0631\u0633\u0627\u0626\u0644: ${allMessages.length}
        </div>
    </div>
</body>
</html>
    `;
    const fileName = `${channel.id || "ticket"}_${Date.now()}.html`;
    const filePath = path.join(TRANSCRIPTS_DIR, fileName);
    fs.writeFileSync(filePath, htmlContent);
    return fileName;
  } catch (e) {
    console.error("Transcript Error:", e);
    return null;
  }
}
async function getUserProfileEmbed(userId, guildId) {
  try {
    const guild = await discordClient.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);
    const user = await member.user.fetch(true);
    const embed = new EmbedBuilder().setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() }).setThumbnail(user.displayAvatarURL({ size: 1024 })).setTitle(`\u0628\u0631\u0648\u0641\u0627\u064A\u0644 ${user.username}`).addFields(
      { name: "\u0627\u0644\u0623\u0633\u0645", value: user.username, inline: true },
      { name: "\u0627\u0644\u0623\u064A\u062F\u064A", value: user.id, inline: true },
      { name: "\u062F\u062E\u0644 \u0627\u0644\u0633\u064A\u0631\u0641\u0631", value: `<t:${Math.floor(member.joinedTimestamp / 1e3)}:R>`, inline: true },
      { name: "\u0623\u0646\u0634\u0623 \u0627\u0644\u062D\u0633\u0627\u0628", value: `<t:${Math.floor(user.createdTimestamp / 1e3)}:R>`, inline: true },
      { name: "\u0627\u0644\u0631\u062A\u0628", value: member.roles.cache.filter((r) => r.name !== "@everyone").map((r) => r.toString()).join(" ") || "\u0644\u0627 \u064A\u0648\u062C\u062F" }
    ).setColor(user.accentColor || 5793266);
    if (user.bannerURL()) {
      embed.setImage(user.bannerURL({ size: 1024 }));
    }
    return embed;
  } catch (e) {
    console.error(e);
    return new EmbedBuilder().setDescription("Could not fetch user profile.").setColor(16711680);
  }
}
import { guildConfigs, saveBotConfigs, globalState, saveDatabase, databasePath, supportTickets, initDatabase as initBotDatabase } from "./botDb";
const activeReplicaGames = /* @__PURE__ */ new Map();
const activeTicketCreations = /* @__PURE__ */ new Set();
try {
  if (globalState.botCredentials) {
    let credentialsChanged = false;
    if (!DISCORD_BOT_TOKEN && globalState.botCredentials.DISCORD_BOT_TOKEN) {
      DISCORD_BOT_TOKEN = cleanEnvVar(globalState.botCredentials.DISCORD_BOT_TOKEN);
      process.env.DISCORD_BOT_TOKEN = DISCORD_BOT_TOKEN;
      credentialsChanged = true;
    }
    if (!DISCORD_CLIENT_ID && globalState.botCredentials.DISCORD_CLIENT_ID) {
      DISCORD_CLIENT_ID = cleanEnvVar(globalState.botCredentials.DISCORD_CLIENT_ID);
      process.env.DISCORD_CLIENT_ID = DISCORD_CLIENT_ID;
      credentialsChanged = true;
    }
    if (!DISCORD_CLIENT_SECRET && globalState.botCredentials.DISCORD_CLIENT_SECRET) {
      DISCORD_CLIENT_SECRET = cleanEnvVar(globalState.botCredentials.DISCORD_CLIENT_SECRET);
      process.env.DISCORD_CLIENT_SECRET = DISCORD_CLIENT_SECRET;
      credentialsChanged = true;
    }
    if (credentialsChanged) {
      updateEnvFile({
        DISCORD_BOT_TOKEN,
        DISCORD_CLIENT_ID,
        DISCORD_CLIENT_SECRET
      });
      console.log("[Bot Core] Loaded and restored credentials from persistent web state.");
    }
  }
} catch (e) {
  console.error("[Bot Core] Error restoring credentials on boot:", e);
}
let supabaseClient = null;
async function getSupabase() {
  return null;
}
async function initDatabase() {
  const db = await getSupabase();
  if (!db) {
    console.log("No SUPABASE_URL & SUPABASE_KEY set. Operating on decoupled database sync (MySQL/Local)...");
    await initBotDatabase().catch(err => {
      console.error("Failed to initialize bot local/MySQL database:", err);
    });
    return;
  }
  try {
    console.log("Fetching globalState from Supabase (table: global_settings)...");
    const { data: globalData, error: globalErr } = await db.from("global_settings").select("value").eq("id", "globalState").single();
    if (globalData && globalData.value) {
      Object.assign(globalState, globalData.value);
      console.log("Loaded globalState from Supabase successfully!");
    } else {
      if (globalErr) console.warn("Supabase global_settings note:", globalErr.message);
      console.log("globalState not found in Supabase. Saving local snapshot...");
      await db.from("global_settings").upsert({ id: "globalState", value: { ...globalState } });
    }
    console.log("Fetching guild configs from Supabase (table: guild_configs)...");
    const { data: configRows, error: configErr } = await db.from("guild_configs").select("*");
    if (configRows && Array.isArray(configRows)) {
      for (const row of configRows) {
        if (row.id && row.config) {
          guildConfigs.set(row.id, row.config);
        }
      }
      console.log(`Loaded ${configRows.length} guild configs from Supabase successfully!`);
    } else {
      if (configErr) console.warn("Supabase guild_configs note:", configErr.message);
      console.log("guild_configs table is empty on Supabase. Seeding existing configs...");
      for (const [guildId, config] of guildConfigs.entries()) {
        await db.from("guild_configs").upsert({ id: guildId, config });
      }
    }
    try {
      console.log("Fetching support tickets from Supabase (table: support_tickets)...");
      const { data: ticketsData } = await db.from("support_tickets").select("tickets").eq("id", "allTickets").single();
      if (ticketsData && ticketsData.tickets) {
        supportTickets.length = 0;
        if (Array.isArray(ticketsData.tickets)) {
          supportTickets.push(...ticketsData.tickets);
        }
        saveDatabase();
        console.log("Loaded support tickets from Supabase successfully!");
      }
    } catch (ticketErr) {
      console.log("Supabase support_tickets table not available, using local file backup.");
    }
  } catch (e) {
    console.error("Error initializing database from Supabase:", e);
  }
}
initDatabase();
function saveConfigs(guildId, saveGlobal) {
  try {
    saveDatabase();
  } catch (e) {
    console.error("Error saving config to disk:", e);
  }
  (async () => {
    const db = await getSupabase();
    if (db) {
      try {
        if (!guildId || saveGlobal) {
          await db.from("global_settings").upsert({ id: "globalState", value: { ...globalState } });
        }
        if (guildId) {
          const config = guildConfigs.get(guildId);
          if (config) {
            await db.from("guild_configs").upsert({ id: guildId, config });
          }
        } else {
          for (const [gId, config] of guildConfigs.entries()) {
            await db.from("guild_configs").upsert({ id: gId, config });
          }
        }
      } catch (err) {
        console.error("Error saving configs to Supabase:", err);
      }
    }
  })();
}
function isGuildPremium(guildId) {
  const config = guildConfigs.get(guildId);
  if (!config || !config.premiumExpiry) return false;
  return config.premiumExpiry > Date.now();
}
function isUserPremium(userId) {
  const expiry = globalState.premiumUsers[userId];
  return !!(expiry && expiry > Date.now());
}
async function handleScriptSearch(source, query, isPremiumSearch, lang = "ar", prefix = "!") {
  const isSlash = source.isChatInputCommand?.() || false;
  const channel = source.channel;
  const author = isSlash ? source.user : source.author;
  const guild = source.guild;
  let initialMsg = null;
  try {
    if (isSlash) {
      await source.deferReply().catch(() => {
      });
    } else {
      await channel.sendTyping();
    }
    const searchingEmbed = new EmbedBuilder().setDescription(lang === "ar" ? `-# \u062C\u0627\u0631\u064A \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0633\u0643\u0631\u0628\u062A ${isPremiumSearch ? "\u0645\u062A\u0642\u062F\u0645" : ""} \u0645\u0648\u062B\u0648\u0642 \u0644\u0643 <a:Reload:1503390770491818088>.` : `-# Currently searching for a reliable ${isPremiumSearch ? "advanced script" : "script"} for you <a:Reload:1503390770491818088>.`).setColor(5793266);
    if (isSlash) {
      initialMsg = await source.editReply({ embeds: [searchingEmbed] });
    } else {
      initialMsg = await source.reply({ embeds: [searchingEmbed] });
    }
    await new Promise((resolve) => setTimeout(resolve, 3e3));
    const searchUrl = `https://scriptblox.com/api/script/search?q=${encodeURIComponent(query)}&max=100`;
    let scripts = [];
    try {
      const response = await fetch(searchUrl);
      const data = await response.json();
      scripts = data.result?.scripts || [];
    } catch (apiErr) {
      console.error("ScriptBlox API Err:", apiErr);
    }
    if (scripts.length > 0) {
      const q = query.toLowerCase();
      const score = (s) => {
        const title = (s.title || "").toLowerCase();
        const game = (s.game?.name || "").toLowerCase();
        const desc = (s.description || "").toLowerCase();
        let points = 0;
        if (isPremiumSearch) {
          if (title.includes(q)) points += 150;
          if (desc.includes(q)) points += 80;
          if (game.includes(q)) points += 30;
        } else {
          if (game.includes(q)) points += 100;
          if (title.includes(q)) points += 80;
        }
        const words = q.split(/\s+/);
        words.forEach((w) => {
          if (w.length > 2) {
            if (title.includes(w)) points += 20;
            if (game.includes(w)) points += 15;
            if (desc.includes(w)) points += 5;
          }
        });
        return points + Math.random() * 10;
      };
      scripts.sort((a, b) => score(b) - score(a));
    }
    if (scripts.length === 0) {
      const suggestText = lang === "ar" ? " \u062C\u0631\u0628 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0643\u0644\u0645\u0627\u062A \u0645\u0641\u062A\u0627\u062D\u064A\u0629 \u0623\u062E\u0631\u0649 \u0623\u0648 \u062D\u0627\u0648\u0644 \u0627\u0644\u0628\u062D\u062B \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629." : " Try using different keywords or search in English.";
      const noFoundText = lang === "ar" ? isPremiumSearch ? "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0633\u0643\u0631\u0628\u062A\u0627\u062A \u0644\u0647\u0630\u0647 \u0627\u0644\u0643\u0644\u0645\u0629." : "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0633\u0643\u0631\u0628\u062A\u0627\u062A \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0627\u0628." : isPremiumSearch ? "No scripts found for that keyword." : "No scripts found for that map.";
      const noFoundEmbed = {
        embeds: [new EmbedBuilder().setDescription(`${noFoundText}${suggestText}`).setColor(16711680)],
        components: []
      };
      if (isSlash) return await source.editReply(noFoundEmbed);
      return await initialMsg.edit(noFoundEmbed);
    }
    let currentIndex = 0;
    async function generateScriptEmbed(index) {
      const script = scripts[index];
      if (!script) return { embeds: [], components: [] };
      let imageUrl = script.thumbnail || script.game?.imageUrl || script.game?.image || "";
      const ensureAbsolute = (url) => {
        if (!url) return "";
        let processed = url.trim();
        if (processed.startsWith("//")) processed = "https:" + processed;
        else if (processed.startsWith("/")) processed = "https://scriptblox.com" + processed;
        else if (processed && !processed.startsWith("http") && !processed.startsWith("data:")) processed = "https://scriptblox.com" + (processed.startsWith("/") ? "" : "/") + processed;
        return processed;
      };
      imageUrl = ensureAbsolute(imageUrl);
      const title = (script.title || "").toLowerCase();
      const desc = (script.description || "").toLowerCase();
      const isKeyless = title.includes("keyless") || desc.includes("keyless") || title.includes("no key") || desc.includes("no key");
      let hasKey = script.key === true || script.key === "true" || script.isKey === true || script.keySystem === true;
      if (!hasKey && !isKeyless) {
        hasKey = title.includes("key") || desc.includes("key system") || desc.includes("key:");
      }
      const embed = new EmbedBuilder().setColor(isPremiumSearch ? 16753920 : 5793266).setTitle((script.title || "Script Found").substring(0, 250)).setDescription(lang === "ar" ? `>>> **\u0627\u0633\u0645 \u0627\u0644\u0645\u0627\u0628 <:Map:1503387738752291009>: ${script.game?.name || "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}
\u0648\u062C\u0648\u062F \u0627\u0644\u0645\u0641\u062A\u0627\u062D <:Key:1503388343738568815>: ${hasKey ? "\u0646\u0639\u0645" : "\u0644\u0627"}**
-# \u0645\u0644\u0627\u062D\u0638\u0629 <:Warn:1459314982574489876>: \u0633\u0643\u0631\u0628\u062A\u0627\u062A\u0646\u0627 \u062C\u0645\u064A\u0639\u0647\u0627 \u0645\u0648\u062B\u0648\u0642\u0629 \u0648\u0644\u0627 \u0646\u0627\u062A\u064A \u0628\u0647\u0627 \u0625\u0644\u0627 \u0645\u0646 \u0645\u0635\u0627\u062F\u0631 \u0645\u0648\u062B\u0648\u0642\u0629` : `>>> **Map Name <:Map:1503387738752291009>: ${script.game?.name || "Unknown"}
Has Key <:Key:1503388343738568815>: ${hasKey ? "Yes" : "No"}**
-# Note <:Warn:1459314982574489876>: All our scripts are verified and come from trusted sources.`).setFooter({ text: `Page ${index + 1} of ${scripts.length}${isPremiumSearch ? " \u2022 Premium Search" : ""}` });
      if (imageUrl) embed.setImage(imageUrl);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("script_back").setEmoji("1503395637918695464").setStyle(ButtonStyle.Secondary).setDisabled(index === 0),
        new ButtonBuilder().setCustomId("script_next").setEmoji("1503395635339067563").setStyle(ButtonStyle.Secondary).setDisabled(index === scripts.length - 1),
        new ButtonBuilder().setCustomId("script_copy").setEmoji("1503387387185860629").setStyle(ButtonStyle.Success)
      );
      return { embeds: [embed], components: [row] };
    }
    const initialPage = await generateScriptEmbed(0);
    if (isSlash) {
      await source.editReply(initialPage);
    } else {
      await initialMsg.edit(initialPage);
    }
    const collector = initialMsg.createMessageComponentCollector({ time: 3e5 });
    collector.on("collect", async (i) => {
      if (i.user.id !== author.id) {
        const warning = lang === "ar" ? `> **\u0627\u0644\u0628\u062D\u062B \u0644\u064A\u0633 \u0644\u0643 \u0642\u0645 \u0628\u0627\u0644\u0628\u062D\u062B \u0639\u0628\u0631 \u0627\u0645\u0631 \`${prefix}${isPremiumSearch ? "fscript" : "script"} [query]\`**` : `> **This search is not for you. Search using \`${prefix}${isPremiumSearch ? "fscript" : "script"} [query]\`**`;
        return i.reply({ content: warning, ephemeral: true });
      }
      try {
        if (i.customId === "script_next") {
          currentIndex++;
          const page = await generateScriptEmbed(currentIndex);
          await i.update(page);
        } else if (i.customId === "script_back") {
          currentIndex--;
          const page = await generateScriptEmbed(currentIndex);
          await i.update(page);
        } else if (i.customId === "script_copy") {
          const scriptCode = scripts[currentIndex].script || "No script code available.";
          const codeResponse = scriptCode.length > 950 ? scriptCode.substring(0, 950) + "..." : scriptCode;
          const label = lang === "ar" ? "\u0644\u0644\u062C\u0648\u0627\u0644:" : "For Mobile:";
          await i.reply({ content: `\`\`\`lua
${codeResponse}
\`\`\`
${label}
\`${codeResponse}\``, ephemeral: true });
        }
      } catch (err) {
        console.error("Collector error:", err?.rawError || err);
      }
    });
  } catch (err) {
    console.error("Script search error:", err);
    const errorMsg = "An error occurred during search.";
    if (isSlash) await source.editReply({ content: errorMsg, embeds: [], components: [] }).catch(() => {
    });
    else if (initialMsg) initialMsg.edit({ content: errorMsg, embeds: [], components: [] }).catch(() => {
    });
  }
}
const guildInvites = /* @__PURE__ */ new Map();
async function checkAndJoinVoiceChannel(guildId) {
  const guild = discordClient.guilds.cache.get(guildId);
  if (!guild || !guild.ownerId) return;
  if (!isUserPremium(guild.ownerId)) return;
  const config = guildConfigs.get(guildId) || {};
  if (config.premiumVoiceChannelId) {
    const channel = guild.channels.cache.get(config.premiumVoiceChannelId);
    if (channel && channel.isVoiceBased()) {
      try {
        joinVoiceChannel({
          channelId: channel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false
        });
      } catch (err) {
        console.error(`Failed to join voice channel in ${guildId}:`, err);
      }
    }
  }
}
// Removed 15-minute inactive ticket auto-close interval as requested
const azkarIntervals = new Map();
const activeDMSubmissions = new Map();

const azkarCollection = [
  {
    title: "الدعاء عند سماع صياح الديك ونهيق الحمار",
    text: "إِذَا سَمِعْتُمْ صِيَاحَ الدِّيَكَةِ فَاسْأَلُوا اللَّهَ مِنْ فَضْلِهِ، فَإِنَّهَا رَأَتْ مَلَكًا، وَإِذَا سَمِعْتُمْ نَهِيقَ الْحِمَارِ فَتَعَوَّذُوا بِاللَّهِ مِنَ الشَّيْطَانِ، فَإِنَّهُ رَأَى شَيْطَانًا.",
    reference: "صحيح البخاري (٣٣٠٣)، صحيح مسلم (٢٧٢٩)"
  },
  {
    title: "فضيلة سبحان الله وبحمده",
    text: "مَنْ قَالَ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، فِي يَوْمٍ مِائَةَ مَرَّةٍ، حُطَّتْ خَطَايَاهُ، وَإِنْ كَانَتْ مِثْلَ زَبَدِ الْبَحْرِ.",
    reference: "صحيح البخاري (٦٤٠٥)، صحيح مسلم (٢٦٩١)"
  },
  {
    title: "الاستغفار وسعة الرزق والفرج",
    text: "مَنْ لَزِمَ الِاسْتِغْفَارَ جَعَلَ اللَّهُ لَهُ مِنْ كُلِّ ضِيقٍ مَخْرَجًا، وَمِنْ كُلِّ هَمٍّ فَرَجًا، وَرَزَقَهُ مِنْ حَيْثُ لَا يَحْتَسِبُ.",
    reference: "سنن أبي داود (١٥١٨)، سنن ابن ماجه (٣٨١٩)"
  },
  {
    title: "سيد الاستغفار وأعظمه ثواباً",
    text: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.",
    reference: "صحيح البخاري (٦٣٠٦)"
  },
  {
    title: "دعاء الكرب والهم العظيم",
    text: "لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ السَّمَوَاتِ وَرَبُّ الْأَرْضِ رَبُّ الْعَرْشِ الْكَرِيمِ.",
    reference: "صحيح البخاري (٦٣٤٦)، صحيح مسلم (٢٧٣٠)"
  },
  {
    title: "من كنوز الجنة العظيمة الشأن",
    text: "قال رسول الله ﷺ: يا عبد الله بن قيس، ألا أدلك على كنز من كنوز الجنة? فقلت: بلى يا رسول الله، قال: قل لا حول ولا قوة إلا بالله.",
    reference: "صحيح البخاري (٦٣٨٤)، صحيح مسلم (٢٧٠٤)"
  },
  {
    title: "فضل الصلاة والتسليم على النبي ﷺ",
    text: "قال رسول الله ﷺ: مَنْ صَلَّى عَلَيَّ صَلَاةً وَاحِدَةً، صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا.",
    reference: "صحيح مسلم (٣٨٤)"
  },
  {
    title: "دعاء ذي النون للاستجابة والفرج",
    text: "لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ",
    reference: "سورة الأنبياء، آية ٨٧ / سنن الترمذي (٣٥٠٥)"
  },
  {
    title: "ثبات القلب على دين الله وطاعته",
    text: "يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ، وَاللَّهُمَّ إِنِّي أَسْأَلُكَ نَفْساً بِكَ مُطْمَئِنَّةً.",
    reference: "سنن الترمذي (٣٥٢٢)، مسند أحمد (٢٦١٣٤)"
  },
  {
    title: "كلمتان خفيفتان حبيبتان للرحمن",
    text: "كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ.",
    reference: "صحيح البخاري (٦٤٠٦)، صحيح مسلم (٢٦٩٤)"
  },
  {
    title: "دعاء صلاح الدين والدنيا والآخرة",
    text: "اللَّهُمَّ أَصْلِحْ لِي دِينِي الَّذِي هُوَ عِصْمَةُ أَمْرِي، وَأَصْلِحْ لِي دُنْيَايَ الَّتِي فِيهَا مَعَاشِي، وَأَصْلِحْ لِي آخِرَتِي الَّتِي فِيهَا مَعَادِي.",
    reference: "صحيح مسلم (٢٧٢٠)"
  },
  {
    title: "الاستعاذة من العجز والكسل والشرور",
    text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَالْجُبْنِ وَالْهَرَمِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، وَمِنْ فِتْنَةِ الْمَحْيَا وَالْمَمَاتِ.",
    reference: "صحيح البخاري (٦٣٦٧)، صحيح مسلم (٢٧٠٦)"
  },
  {
    title: "عظيم فضل قراءة آية الكرسي",
    text: "قال رسول الله ﷺ: مَنْ قَرَأَ آيَةَ الْكُرْسِيِّ دُبُرَ كُلِّ صَلَاةٍ مَكْتُوبَةٍ لَمْ يَمْنَعْهُ مِنْ دُخُولِ الْجَنَّةِ إِلَّا أَنْ يَمُوتَ.",
    reference: "عمل اليوم والليلة للنسائي (١٠٠)"
  },
  {
    title: "طلب تيسير الأمور والرحمة والهدى",
    text: "رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا.",
    reference: "سورة الكهف، آية ١٠"
  },
  {
    title: "دعاء وجع البدن والمرض والآلام",
    text: "ضَعْ يَدَكَ عَلَى الَّذِي تَأَلَّمَ مِنْ جَسَدِكَ وَقُلْ: بِاسْمِ اللَّهِ (ثَلَاثًا)، وَقُلْ سَبْعَ مَرَّاتٍ: أَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ.",
    reference: "صحيح مسلم (٢٢٠٢)"
  },
  {
    title: "فضل الوضوء والذكر بعده ورتبته العالية",
    text: "مَنْ تَوَضَّأَ فَأَحْسَنَ الْوُضُوءَ ثُمَّ قَالَ: أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ، فُتِحَتْ لَهُ أَبْوَابُ الْجَنَّةِ الثَّمَانِيَةُ يَدْخُلُ مِنْ أَيِّهَا شَاءَ.",
    reference: "صحيح مسلم (٢٣٤)، سنن الترمذي (٥٥)"
  },
  {
    title: "الدعاء بين الأذان والإقامة المستجاب",
    text: "الدُّعَاءُ لَا يُرَدُّ بَيْنَ الْأَذَانِ وَالْإِقَامَةِ، فَادْعُوا اللَّهَ تَعَالَى وَاسْأَلُوهُ الْعَفْوَ وَالعَافِيَةَ.",
    reference: "سنن أبي داود (٥٢١)، سنن الترمذي (٢١٢)"
  },
  {
    title: "دعاء الاستخارة وتفويض الأمور كلها لله",
    text: "اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ.",
    reference: "صحيح البخاري (١١٦٢)"
  },
  {
    title: "دعاء كفارة المجلس لمحو الزلات والغفران",
    text: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ.",
    reference: "سنن الترمذي (٣٤٣٣)، سنن النسائي الكبرى (١٠٢٤١)"
  },
  {
    title: "دعاء الخروج من البيت لنيل كفاية الله وحفظه",
    text: "بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ. يُقَالُ لَهُ: هُدِيتَ، وَكُفِيتَ، وَوُقِيتَ، وَتَنَحَّى عَنْهُ الشَّيْطَانُ.",
    reference: "سنن أبي داود (٥٠٩٥)، سنن الترمذي (٣٤٢٦)"
  },
  {
    title: "عظيم فضل قراءة الإخلاص والمعوذتين",
    text: "قُلْ هُوَ اللَّهُ أَحَدٌ، وَالْمُعَوِّذَتَيْنِ حِينَ تُمْسِي وَتُصْبِحُ ثَلَاثَ مَرَّاتٍ تَكْفِيكَ مِنْ كُلِّ شَيْءٍ.",
    reference: "سنن أبي داود (٥٠٨٢)، سنن الترمذي (٣٥٧٥)"
  },
  {
    title: "دعاء الحفظ والوقاية التامة من كل مكروه وشر",
    text: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ (ثَلَاثَ مَرَّاتٍ) لَمْ يَضُرَّهُ شَيْءٌ.",
    reference: "سنن أبي داود (٥٠٨٨)، سنن الترمذي (٣٣٨٨)"
  }
];

function drawAzkarCard(titleText, bodyText) {
  const canvas = createCanvas(1000, 420);
  const ctx = canvas.getContext("2d");

  // Solid background matching the user's exact uploaded image hue
  ctx.fillStyle = "#8c668b";
  ctx.fillRect(0, 0, 1000, 420);

  // Draw elegant background calligraphic decorations (faded Arabic glyphs & symbols)
  // to replicate the high-end traditional pattern texture in the user's uploaded image.
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.045)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const bgLetters = [
    { text: "ﷺ", font: "90px 'Traditional Arabic', 'Amiri', 'serif'", x: 120, y: 100 },
    { text: "ﷻ", font: "110px 'Traditional Arabic', 'Amiri', 'serif'", x: 880, y: 320 },
    { text: "ذ", font: "180px 'Traditional Arabic', 'Amiri', 'serif'", x: 150, y: 300 },
    { text: "ك", font: "220px 'Traditional Arabic', 'Amiri', 'serif'", x: 820, y: 120 },
    { text: "ر", font: "160px 'Traditional Arabic', 'Amiri', 'serif'", x: 500, y: 220 },
    { text: "أ", font: "140px 'Traditional Arabic', 'Amiri', 'serif'", x: 320, y: 140 },
    { text: "د", font: "150px 'Traditional Arabic', 'Amiri', 'serif'", x: 680, y: 280 }
  ];

  for (const item of bgLetters) {
    ctx.font = item.font;
    ctx.fillText(item.text, item.x, item.y);
  }
  
  // Faint decorative thin curves for extra artistic depth
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(500, 210, 180, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(500, 210, 320, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Draw Title text (centered at top, clean white, modern elegant spacing)
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = "26px 'Traditional Arabic', 'Amiri', 'Cairo', 'Georgia', 'serif'";
  ctx.textAlign = "center";
  
  // Add a subtle drop-shadow to the text to elevate it over the background pattern
  ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;
  ctx.fillText(titleText, 500, 85);

  // Main Supplication / Hadith text wrapping
  const maxWidth = 840;
  const lineHeight = 46;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px 'Traditional Arabic', 'Amiri', 'Cairo', 'Georgia', 'serif'";
  ctx.textAlign = "center";

  // Slightly stronger shadow for main body text to match the beautiful contrast of the uploaded design
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  const words = bodyText.split(" ");
  let line = "";
  const lines = [];
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());

  // Center vertical placement of lines
  let startY = 220 - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 500, startY);
    startY += lineHeight;
  }

  // Draw Bottom Watermark Footer with opacity & clean spacing (requested wording: "NTL BOT")
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.font = "14px 'Calibri', 'Arial', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("أذكار و أدعية مأثورة • NTL BOT 🌸", 500, 375);

  return canvas.toBuffer();
}

function sendAzkar(guildId) {
  const guild = discordClient.guilds.cache.get(guildId);
  if (!guild) return;
  const config = guildConfigs.get(guildId) || {};
  if (!config.azkar || !config.azkar.enabled || !config.azkar.channelId) return;
  const channel = guild.channels.cache.get(config.azkar.channelId);
  if (!channel || !channel.isTextBased()) return;
  
  // Choose random supplication from the collection
  const selected = azkarCollection[Math.floor(Math.random() * azkarCollection.length)];
  
  try {
    const buffer = drawAzkarCard(selected.title, selected.text);
    const attachment = new AttachmentBuilder(buffer, { name: "azkar.png" });
    
    const embed = new EmbedBuilder()
      .setTitle("ذكـر 🌸")
      .setDescription(`✨ **${selected.title}**\n\n**المرجع:** ${selected.reference}\n\n*تأمل الذكر واستحضر النية والتسبيح 🌸*`)
      .setColor(0x8c668b) // Soft premium purple matching background
      .setImage("attachment://azkar.png");
      
    // إنشاء صف الأزرار الجديد (زر اذكار وزر البوت للموقع)
    const azkarButtonsRow = new ActionRowBuilder().addComponents(
        // زر اذكار
        new ButtonBuilder()
            .setCustomId('azkar_start')
            .setLabel('اذكار')
            .setEmoji('1513454643483644014') // إيموجي المسبحة rosary
            .setStyle(ButtonStyle.Primary),
            
        // زر الانتقال للموقع (يحمل إيموجي البوت فقط وبدون كتابة)
        new ButtonBuilder()
            .setURL('https://ntl-bot-da3m.onrender.com/')
            .setEmoji('1511327391669026916') // إيموجي Ntlbot
            .setStyle(ButtonStyle.Link)
    );
      
    let mentionContent = "";
    if (config.azkar.mentionType === "everyone") {
      mentionContent = "@everyone";
    } else if (config.azkar.mentionType === "here") {
      mentionContent = "@here";
    } else if (config.azkar.mentionType === "role" && config.azkar.mentionRoleId) {
      mentionContent = `<@&${config.azkar.mentionRoleId}>`;
    }

    channel.send({
      content: mentionContent || undefined,
      embeds: [embed],
      files: [attachment],
      components: [azkarButtonsRow]
    }).catch(console.error);
  } catch (error) {
    console.error("Failed to generate and send Azkar card:", error);
  }
}

export function setupAzkarInterval(guildId) {
  if (azkarIntervals.has(guildId)) clearInterval(azkarIntervals.get(guildId));
  const config = guildConfigs.get(guildId) || {};
  if (config.azkar && config.azkar.enabled && config.azkar.channelId) {
    const minutes = parseInt(config.azkar.intervalMinutes) || 15;
    const interval = setInterval(() => sendAzkar(guildId), minutes * 60 * 1000);
    azkarIntervals.set(guildId, interval);
  }
}

discordClient.on("ready", async () => {
  console.log(`Discord bot logged in as ${discordClient.user?.tag}!`);
  for (const guildId of discordClient.guilds.cache.keys()) {
    const guild = discordClient.guilds.cache.get(guildId);
    setupAzkarInterval(guildId);
    try {
      const invites = await guild.invites.fetch();
      const inviteMap = /* @__PURE__ */ new Map();
      invites.forEach((inv) => inviteMap.set(inv.code, inv.uses || 0));
      guildInvites.set(guildId, inviteMap);
      guild.voiceStates.cache.forEach((state) => {
        const isActive = !!state.channelId && !state.selfDeaf && !state.selfMute && !state.serverDeaf && !state.serverMute;
        if (isActive && state.member && !state.member.user.bot) {
          voiceActiveUsers.set(state.member.id, { guildId, timestamp: Date.now() });
        }
      });
      takeGuildSnapshot(guild).catch(() => null);
      checkAndJoinVoiceChannel(guildId);
    } catch (e) {
      console.log(`Could not fetch data for ${guild.name}`);
    }
  }
});
discordClient.on("error", (error) => {
  console.error("Discord client encountered an error:", error);
});
discordClient.on("inviteCreate", (invite) => {
  if (!invite.guild) return;
  const invites = guildInvites.get(invite.guild.id);
  if (invites) invites.set(invite.code, invite.uses || 0);
});
discordClient.on("inviteDelete", (invite) => {
  if (!invite.guild) return;
  const invites = guildInvites.get(invite.guild.id);
  if (invites) invites.delete(invite.code);
});
discordClient.on("guildCreate", async (guild) => {
  console.log(`[Bot Joined Guild] Joined: ${guild.name} (${guild.id})`);
  takeGuildSnapshot(guild).catch(() => null);
  try {
    const invites = await guild.invites.fetch().catch(() => null);
    if (invites) {
      const inviteMap = /* @__PURE__ */ new Map();
      invites.forEach((inv) => inviteMap.set(inv.code, inv.uses || 0));
      guildInvites.set(guild.id, inviteMap);
    }
  } catch (err) {
  }
  try {
    const ownerId = "1179133837930938470";
    const owner = await discordClient.users.fetch(ownerId).catch(() => null);
    if (owner) {
      let inviteUrl = "\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u063A\u064A\u0631 \u0643\u0627\u0641\u064A\u0629 \u0644\u0644\u0631\u0627\u0628\u0637";
      const channel = guild.channels.cache.find((c) => c.isTextBased() && c.permissionsFor(guild.members.me)?.has("CreateInstantInvite"));
      if (channel) {
        const invite = await channel.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
        if (invite) inviteUrl = invite.url;
      }
      await owner.send(`\u{1F4E5} **\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0628\u0648\u062A \u0644\u0633\u064A\u0631\u0641\u0631 \u062C\u062F\u064A\u062F \u064A\u0627 \u0628\u0637\u0644!**
\u2022 **\u0627\u0633\u0645 \u0627\u0644\u0633\u064A\u0631\u0641\u0631:** ${guild.name}
\u2022 **\u0627\u0644\u0623\u064A\u062F\u064A:** \`${guild.id}\`
\u2022 **\u0639\u062F\u062F \u0627\u0644\u0623\u0639\u0636\u0627\u0621:** \`${guild.memberCount}\`
\u2022 **\u0627\u0644\u0645\u0627\u0644\u0643:** <@${guild.ownerId}> (\u0627\u0644\u0623\u064A\u062F\u064A: \`${guild.ownerId}\`)
\u{1F517} **\u0631\u0627\u0628\u0637 \u062F\u0639\u0648\u0629 \u0627\u0644\u0633\u064A\u0631\u0641\u0631:** ${inviteUrl}`).catch(() => null);
    }
  } catch (error) {
    console.error("Error notifying owner on guildCreate:", error);
  }
});
import { getBucketKey, calculateLevelFromTotalXp, getXpRequired } from "../src/levellingLogic.js";
import { handleLevellingCommands } from "../src/discordLevelUI.js";
const voiceActiveUsers = /* @__PURE__ */ new Map();
const chatCooldowns = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of voiceActiveUsers.entries()) {
    const elapsedMinutes = Math.floor((now - data.timestamp) / 6e4);
    if (elapsedMinutes > 0) {
      const lConf = getLevellingConfig(data.guildId);
      const voiceConf = lConf.voice;
      const config = guildConfigs.get(data.guildId) || { usersXP: {} };
      if (!config.usersXP) config.usersXP = {};
      if (!config.usersXP[userId]) {
        config.usersXP[userId] = { chatXP: 0, voiceXP: 0, chatMessageCount: 0, voiceMinuteCount: 0 };
      }
      const actualUserXP = config.usersXP[userId];
      actualUserXP.voiceMinuteCount = (actualUserXP.voiceMinuteCount || 0) + elapsedMinutes;
      let baseRate = voiceConf.earnRate !== void 0 ? Number(voiceConf.earnRate) : 10;
      const earnIncrease = voiceConf.earnIncrease ? Number(voiceConf.earnIncrease) : 0;
      const earnIncreaseInterval = voiceConf.earnIncreaseInterval ? Number(voiceConf.earnIncreaseInterval) : 60;
      let totalXpToAward = 0;
      if (earnIncrease > 0 && earnIncreaseInterval > 0) {
        const currentMultiplier = Math.floor(actualUserXP.voiceMinuteCount / earnIncreaseInterval);
        totalXpToAward = (baseRate + currentMultiplier * earnIncrease) * elapsedMinutes;
      } else {
        totalXpToAward = baseRate * elapsedMinutes;
      }
      console.log(`[Voice XP Interval] Awarding ${totalXpToAward} XP to user ${userId} for ${elapsedMinutes} minutes.`);
      addUserXp(data.guildId, userId, "voice", totalXpToAward);
      data.timestamp += elapsedMinutes * 6e4;
    }
  }
}, 6e4);
function getLevellingConfig(guildId) {
  let config = guildConfigs.get(guildId);
  if (!config) {
    config = { language: "ar", commands: {}, usersXP: {} };
    guildConfigs.set(guildId, config);
  }
  let changed = false;
  if (!config.levelling) {
    config.levelling = {
      enabled: false,
      commandChannels: [],
      restrictedRoles: [],
      levelUpChannelId: "",
      levelUpMessage: "\u{1F389} \u0645\u0628\u0631\u0648\u0643 {user}! \u0644\u0642\u062F \u0627\u0646\u062A\u0642\u0644\u062A \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 {oldLevel} \u0625\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 {newLevel}!",
      levelUpMessageType: "text",
      levelUpEmbedDescription: "",
      chat: {
        enabled: true,
        xpMode: "scaling",
        staticLevels: [],
        baseXp: 300,
        incrementXp: 150,
        everyNLevels: 1,
        intervals: [],
        rewards: [],
        earnRate: 20,
        earnIncrease: 0,
        earnIncreaseInterval: 5,
        cooldown: 10
      },
      voice: {
        enabled: true,
        xpMode: "scaling",
        staticLevels: [],
        baseXp: 300,
        incrementXp: 150,
        everyNLevels: 1,
        intervals: [],
        rewards: [],
        earnRate: 15,
        earnIncrease: 0,
        earnIncreaseInterval: 60
      }
    };
    changed = true;
  } else {
    if (config.levelling.enabled === void 0) {
      config.levelling.enabled = false;
      changed = true;
    }
    if (!config.levelling.chat) {
      config.levelling.chat = {
        enabled: true,
        xpMode: "scaling",
        staticLevels: [],
        baseXp: 300,
        incrementXp: 150,
        everyNLevels: 1,
        intervals: [],
        rewards: [],
        earnRate: 20,
        earnIncrease: 0,
        earnIncreaseInterval: 5,
        cooldown: 10
      };
      changed = true;
    } else {
      if (config.levelling.chat.baseXp === void 0) {
        config.levelling.chat.baseXp = 300;
        changed = true;
      }
      if (config.levelling.chat.incrementXp === void 0) {
        config.levelling.chat.incrementXp = 150;
        changed = true;
      }
      if (config.levelling.chat.earnRate === void 0) {
        config.levelling.chat.earnRate = 20;
        changed = true;
      }
      if (config.levelling.chat.cooldown === void 0) {
        config.levelling.chat.cooldown = 10;
        changed = true;
      }
    }
    if (!config.levelling.voice) {
      config.levelling.voice = {
        enabled: true,
        xpMode: "scaling",
        staticLevels: [],
        baseXp: 300,
        incrementXp: 150,
        everyNLevels: 1,
        intervals: [],
        rewards: [],
        earnRate: 15,
        earnIncrease: 0,
        earnIncreaseInterval: 60
      };
      changed = true;
    } else {
      if (config.levelling.voice.baseXp === void 0) {
        config.levelling.voice.baseXp = 300;
        changed = true;
      }
      if (config.levelling.voice.incrementXp === void 0) {
        config.levelling.voice.incrementXp = 150;
        changed = true;
      }
      if (config.levelling.voice.earnRate === void 0) {
        config.levelling.voice.earnRate = 15;
        changed = true;
      }
    }
  }
  if (changed) {
    saveConfigs();
  }
  const levelling = config.levelling;
  const defaultType = {
    enabled: true,
    xpMode: "scaling",
    staticLevels: [],
    baseXp: 300,
    incrementXp: 150,
    everyNLevels: 1,
    intervals: [],
    rewards: [],
    earnRate: void 0,
    earnIncrease: 0,
    earnIncreaseInterval: void 0,
    cooldown: void 0
  };
  return {
    enabled: !!levelling.enabled,
    commandChannels: levelling.commandChannels || [],
    restrictedRoles: levelling.restrictedRoles || [],
    levelUpChannelId: levelling.levelUpChannelId || "",
    levelUpMessage: levelling.levelUpMessage || "\u{1F389} \u0645\u0628\u0631\u0648\u0643 {user}! \u0644\u0642\u062F \u0627\u0646\u062A\u0642\u0644\u062A \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 {oldLevel} \u0625\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 {newLevel}!",
    levelUpMessageType: levelling.levelUpMessageType || "text",
    levelUpEmbedDescription: levelling.levelUpEmbedDescription || "",
    levelUpEmbedImageUrl: levelling.levelUpEmbedImageUrl || "",
    chat: { earnRate: 20, earnIncreaseInterval: 5, cooldown: 10, ...defaultType, ...levelling.chat || {} },
    voice: { earnRate: 15, earnIncreaseInterval: 60, ...defaultType, ...levelling.voice || {} }
  };
}
function addUserXp(guildId, userId, type, amount, triggerChannelId) {
  let config = guildConfigs.get(guildId);
  if (!config) {
    config = { language: "ar", commands: {}, usersXP: {} };
    guildConfigs.set(guildId, config);
  }
  if (!config.usersXP) config.usersXP = {};
  if (!config.usersXP[userId]) {
    config.usersXP[userId] = { chatXP: 0, voiceXP: 0 };
  }
  const userXP = config.usersXP[userId];
  const lConf = getLevellingConfig(guildId);
  const typeConfig = type === "chat" ? lConf.chat : lConf.voice;
  if (!typeConfig.enabled) return;
  const oldCalculated = calculateLevelFromTotalXp(typeConfig, type === "chat" ? userXP.chatXP : userXP.voiceXP);
  if (type === "chat") {
    userXP.chatXP += amount;
  } else {
    userXP.voiceXP += amount;
  }
  saveConfigs();
  const dKey = getBucketKey("day");
  const wKey = getBucketKey("week");
  const mKey = getBucketKey("month");
  const yKey = getBucketKey("year");
  if (userXP.lastDay !== dKey) {
    userXP.lastDay = dKey;
    userXP.chatDaily = 0;
    userXP.voiceDaily = 0;
  }
  if (userXP.lastWeek !== wKey) {
    userXP.lastWeek = wKey;
    userXP.chatWeekly = 0;
    userXP.voiceWeekly = 0;
  }
  if (userXP.lastMonth !== mKey) {
    userXP.lastMonth = mKey;
    userXP.chatMonthly = 0;
    userXP.voiceMonthly = 0;
  }
  if (userXP.lastYear !== yKey) {
    userXP.lastYear = yKey;
    userXP.chatYearly = 0;
    userXP.voiceYearly = 0;
  }
  if (type === "chat") {
    userXP.chatDaily = (userXP.chatDaily || 0) + amount;
    userXP.chatWeekly = (userXP.chatWeekly || 0) + amount;
    userXP.chatMonthly = (userXP.chatMonthly || 0) + amount;
    userXP.chatYearly = (userXP.chatYearly || 0) + amount;
  } else {
    userXP.voiceDaily = (userXP.voiceDaily || 0) + amount;
    userXP.voiceWeekly = (userXP.voiceWeekly || 0) + amount;
    userXP.voiceMonthly = (userXP.voiceMonthly || 0) + amount;
    userXP.voiceYearly = (userXP.voiceYearly || 0) + amount;
  }
  const newCalculated = calculateLevelFromTotalXp(typeConfig, type === "chat" ? userXP.chatXP : userXP.voiceXP);
  if (newCalculated.level > oldCalculated.level) {
    const guild = discordClient.guilds.cache.get(guildId);
    if (guild) {
      const member = guild.members.cache.get(userId);
      if (member && Array.isArray(typeConfig.rewards)) {
        typeConfig.rewards.forEach((r) => {
          if (r.level === newCalculated.level && r.roleId) {
            member.roles.add(r.roleId).catch(console.error);
          }
        });
      }
      if (lConf.levelUpMessage) {
        const hasLevelUpChannel = !!lConf.levelUpChannelId;
        const targetChannelId = lConf.levelUpChannelId || triggerChannelId;
        if (targetChannelId) {
          const channel = guild.channels.cache.get(targetChannelId);
          if (channel && channel.isTextBased()) {
            const replacer = (text) => text.replace(/\{user\}/g, `<@${userId}>`)
                                            .replace(/\{oldLevel\}/g, String(oldCalculated.level))
                                            .replace(/\{newLevel\}/g, String(newCalculated.level))
                                            .replace(/\{next_level\}/g, String(newCalculated.level + 1));
            
            const sendOptions = {};
            if (lConf.levelUpMessageType === "embed") {
              const embed = new EmbedBuilder()
                .setDescription(replacer(lConf.levelUpEmbedDescription || ""))
                .setColor(5793266);
              if (lConf.levelUpEmbedImageUrl) {
                embed.setImage(lConf.levelUpEmbedImageUrl);
              }
              sendOptions.embeds = [embed];
            } else {
              sendOptions.content = replacer(lConf.levelUpMessage);
            }
            
            channel.send(sendOptions).then((msg) => {
              if (!hasLevelUpChannel) {
                setTimeout(() => {
                  msg.delete().catch(() => null);
                }, 3000);
              }
            }).catch(console.error);
          }
        }
      }
    }
  }
  saveConfigs();
}
discordClient.on("voiceStateUpdate", (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;
  const guildId = newState.guild.id || oldState.guild.id;
  const config = guildConfigs.get(guildId);
  if (!config?.levelling?.enabled) return;
  const isActive = !!newState.channelId && !newState.selfDeaf && !newState.selfMute && !newState.serverDeaf && !newState.serverMute;
  const wasActive = !!oldState.channelId && !oldState.selfDeaf && !oldState.selfMute && !oldState.serverDeaf && !oldState.serverMute;
  logVoiceUpdate(oldState, newState);
  console.log(`[Voice State Update] User: ${member.user.tag} (ID: ${member.id}) | wasActive: ${wasActive} | isActive: ${isActive}`);
  if (isActive && !wasActive) {
    console.log(`[Voice Join] User ${member.user.tag} registered as active in voice.`);
    voiceActiveUsers.set(member.id, { guildId, timestamp: Date.now() });
  } else if (!isActive && wasActive) {
    const data = voiceActiveUsers.get(member.id);
    if (data) {
      voiceActiveUsers.delete(member.id);
      const seconds = Math.floor((Date.now() - data.timestamp) / 1e3);
      const xpEarned = Math.floor(seconds / 60 * 10);
      console.log(`[Voice Leave] User ${member.user.tag} left voice or muted. Stayed active for: ${seconds}s. Earned: ${xpEarned} XP.`);
      if (xpEarned > 0) {
        addUserXp(guildId, member.id, "voice", xpEarned);
      }
    } else {
      console.log(`[Voice Leave] User ${member.user.tag} left voice, but had no existing active session data in Map.`);
    }
  }
});
async function logVoiceUpdate(oldState, newState) {
  const member = newState.member || oldState.member;
  const logEmbed = new EmbedBuilder().setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() }).setTimestamp();
  let changes = [];
  if (oldState.channelId !== newState.channelId) {
    if (!oldState.channelId && newState.channelId) changes.push(`Joined: <#${newState.channelId}>`);
    else if (oldState.channelId && !newState.channelId) changes.push(`Left: <#${oldState.channelId}>`);
    else changes.push(`Moved: <#${oldState.channelId}> to <#${newState.channelId}>`);
  }
  if (oldState.selfMute !== newState.selfMute) changes.push(`Self Mute: ${newState.selfMute ? "On" : "Off"}`);
  if (oldState.serverMute !== newState.serverMute) changes.push(`Server Mute: ${newState.serverMute ? "On" : "Off"}`);
  if (oldState.selfDeaf !== newState.selfDeaf) changes.push(`Self Deaf: ${newState.selfDeaf ? "On" : "Off"}`);
  if (oldState.serverDeaf !== newState.serverDeaf) changes.push(`Server Deaf: ${newState.serverDeaf ? "On" : "Off"}`);
  if (changes.length === 0) return;
  logEmbed.setTitle("Voice State Update").setDescription(changes.join("\n"));
  await sendServerLog(newState.guild, "voiceChannelChannel", logEmbed);
}
const guildBackupStates = /* @__PURE__ */ new Map();
async function takeGuildSnapshot(guild) {
  try {
    const backup = {
      channels: /* @__PURE__ */ new Map(),
      roles: /* @__PURE__ */ new Map()
    };
    const channels = await guild.channels.fetch().catch(() => guild.channels.cache);
    for (const [chId, ch] of channels) {
      if (!ch) continue;
      const overwrites = [];
      if (ch.permissionOverwrites && ch.permissionOverwrites.cache) {
        for (const [owId, ow] of ch.permissionOverwrites.cache) {
          overwrites.push({
            id: ow.id,
            type: ow.type,
            allow: ow.allow.bitfield.toString(),
            deny: ow.deny.bitfield.toString()
          });
        }
      }
      backup.channels.set(chId, {
        id: ch.id,
        name: ch.name,
        type: ch.type,
        position: ch.position,
        parentId: ch.parentId,
        topic: ch.topic || null,
        nsfw: !!ch.nsfw,
        rateLimitPerUser: ch.rateLimitPerUser || 0,
        permissionOverwrites: overwrites
      });
    }
    const roles = await guild.roles.fetch().catch(() => guild.roles.cache);
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    for (const [rId, role] of roles) {
      if (!role || role.managed || role.id === guild.id) continue;
      const memberIds = [];
      for (const [mId, m] of members) {
        if (m && m.roles && m.roles.cache.has(rId)) {
          memberIds.push(mId);
        }
      }
      backup.roles.set(rId, {
        id: role.id,
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        position: role.position,
        permissions: role.permissions.bitfield.toString(),
        mentionable: role.mentionable,
        memberIds
      });
    }
    guildBackupStates.set(guild.id, backup);
    console.log(`[Backup System] Created fresh state snapshot for guild: ${guild.name} (${guild.id})`);
  } catch (error) {
    console.error(`[Backup System] Error refreshing backup for ${guild.id}:`, error);
  }
}
const getAuditLogExecutor = async (guild, actionType) => {
  try {
    const fetchedLogs = await guild.fetchAuditLogs({
      limit: 1,
      type: actionType
    });
    const auditEntry = fetchedLogs.entries.first();
    if (!auditEntry) return null;
    const timeDifference = Date.now() - auditEntry.createdTimestamp;
    if (timeDifference > 15e3) return null;
    return auditEntry.executor;
  } catch (error) {
    console.error("Failed to fetch audit logs for Anti-Raid:", error);
    return null;
  }
};
const getPunishmentNameAr = (p) => {
  switch (p) {
    case "demote":
      return "\u0633\u062D\u0628 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0631\u062A\u0628\u0648\u064A\u0629 \u0628\u0634\u0643\u0644 \u0643\u0627\u0645\u0644";
    case "kick":
      return "\u0637\u0631\u062F \u0641\u0648\u0631\u064A \u0645\u0646 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 (Kick)";
    case "ban":
      return "\u062D\u0638\u0631 \u0646\u0647\u0627\u0626\u064A \u0648\u0634\u0627\u0645\u0644 (Ban)";
    default:
      return "\u062A\u062D\u0630\u064A\u0631 \u0645\u0633\u062C\u0644 \u0641\u0642\u0637";
  }
};
const handleAntiRaidViolation = async (guild, executorId, actionName) => {
  try {
    const config = guildConfigs.get(guild.id);
    if (!config) return;
    if (executorId === guild.client.user?.id || executorId === guild.ownerId) {
      return;
    }
    const supportAdmins = globalState.supportAdmins || {};
    if (supportAdmins[executorId]) {
      return;
    }
    const member = await guild.members.fetch(executorId).catch(() => null);
    if (!member) return;
    const security = config.security || {
      punishment: "none"
    };
    const punishment = security.punishment;
    if (!punishment || punishment === "none") return;
    console.log(`[Security Alert] Anti-Raid Violation in ${guild.name} by ${member.user.tag}: ${actionName}. Punishment: ${punishment}`);
    const owner = await guild.members.fetch(guild.ownerId).catch(() => null);
    if (owner) {
      const isAr = config.language === "ar" || !config.language;
      const text = isAr ? `\u{1F6A8} **\u062A\u0646\u0628\u064A\u0647 \u0623\u0645\u0646\u064A \u0639\u0627\u062C\u0644 \u0648\u062E\u0627\u0635 (NTL Protection):**
\u0642\u0627\u0645 \u0627\u0644\u0639\u0636\u0648 <@${executorId}> (\u0627\u0633\u0645 \u062D\u0633\u0627\u0628\u0647: **${member.user.tag}**) \u0628\u0640 **${actionName}** \u0641\u064A \u0633\u064A\u0631\u0641\u0631\u0643: **${guild.name}**!
\u0648\u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0625\u0639\u062F\u0627\u062F\u0627\u062A\u0643\u060C \u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u0639\u0642\u0648\u0628\u0629 \u0641\u0648\u0631\u064A\u0629 \u0639\u0644\u064A\u0647: **[ ${getPunishmentNameAr(punishment)} ]** \u0648\u062A\u0635\u0644\u064A\u062D \u0627\u0644\u0636\u0631\u0631 \u0627\u0644\u0630\u064A \u062A\u0633\u0628\u0628 \u0641\u064A\u0647 \u0628\u0627\u0644\u0643\u0627\u0645\u0644.` : `\u{1F6A8} **Urgent Security Alert (NTL Protection):**
Member <@${executorId}> (**${member.user.tag}**) triggered violation: **${actionName}** in your guild: **${guild.name}**!
Your security setting automatically applied: **[ ${punishment.toUpperCase()} ]** and rollback procedures have been completed successfully.`;
      await owner.send(text).catch(() => null);
    }
    if (punishment === "demote") {
      const highestMe = guild.members.me.roles.highest.position;
      const manageableRoles = member.roles.cache.filter((r) => r.id !== guild.id && r.position < highestMe);
      for (const [rId, rObj] of manageableRoles) {
        await member.roles.remove(rObj).catch(() => null);
      }
    } else if (punishment === "kick") {
      if (member.kickable) {
        await member.kick(`Anti-Raid Protection: ${actionName}`).catch(() => null);
      }
    } else if (punishment === "ban") {
      if (member.bannable) {
        await guild.members.ban(executorId, { reason: `Anti-Raid Protection: ${actionName}` }).catch(() => null);
      }
    }
  } catch (error) {
    console.error("Error in handleAntiRaidViolation:", error);
  }
};
const sendServerLog = async (guild, logTypeKey, embed) => {
  try {
    const config = guildConfigs.get(guild.id);
    if (!config || !config.logs || !config.logs.enabled) return;
    const channelId = config.logs[logTypeKey];
    if (!channelId) return;
    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] }).catch(() => null);
    }
  } catch (err) {
    console.error(`[Logging System] Error sending log for ${logTypeKey}:`, err);
  }
};
discordClient.on("messageUpdate", async (oldMessage, newMessage) => {
  try {
    if (!newMessage.guild) return;
    if (newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    const config = guildConfigs.get(newMessage.guild.id);
    const isAr = config?.language === "ar" || !config?.language;
    const embed = new EmbedBuilder();
    if (isAr) {
      embed.setTitle("\u{1F4DD} \u0631\u0633\u0627\u0644\u0629 \u0645\u0639\u062F\u0651\u0644\u0629").setDescription(`**\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0631\u0633\u0627\u0644\u0629<:Send:1504828192773509180>**
-#  ~~                                                                                                                                                                   ~~
**\u0628\u0648\u0627\u0633\u0637\u0629<:Person:1504602083377287230>: <@${newMessage.author.id}>**
**\u0641\u064A \u0631\u0648\u0645<:Hashtag:1503025347254554704>: <#${newMessage.channel.id}>**
-#  ~~                                                                                                                                                                   ~~
**\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0642\u0628\u0644 \u0627\u0644\u062A\u0639\u062F\u064A\u0644:**
\`\`\`${oldMessage.content || "\u0645\u062D\u062A\u0648\u0649 \u0641\u0627\u0631\u063A \u0623\u0648 \u0645\u0631\u0641\u0642"}\`\`\`
**\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u062A\u0639\u062F\u064A\u0644:**
\`\`\`${newMessage.content || "\u0645\u062D\u062A\u0648\u0649 \u0641\u0627\u0631\u063A \u0623\u0648 \u0645\u0631\u0641\u0642"}\`\`\``).setColor("#FFA500").setTimestamp();
    } else {
      embed.setTitle("\u{1F4DD} Message Updated").setDescription(`Message edited by <@${newMessage.author.id}> in <#${newMessage.channel.id}>`).addFields(
        { name: "Before:", value: oldMessage.content || "*Empty content or attachment*" },
        { name: "After:", value: newMessage.content || "*Empty content or attachment*" },
        { name: "User ID:", value: `\`${newMessage.author.id}\``, inline: true },
        { name: "Message ID:", value: `\`${newMessage.id}\``, inline: true }
      ).setColor("#FFA500").setTimestamp();
    }
    await sendServerLog(newMessage.guild, "messageUpdateChannel", embed);
  } catch (error) {
    console.error("Error in messageUpdate log listener:", error);
  }
});
discordClient.on("messageDelete", async (message) => {
  try {
    if (!message.guild) return;
    if (message.author?.id === message.client.user?.id) {
      const config2 = guildConfigs.get(message.guild.id);
      if (config2 && config2.logs && config2.logs.enabled) {
        const logs = config2.logs;
        const logChannels = [
          logs.messageDeleteChannel,
          logs.messageUpdateChannel,
          logs.timeoutAddChannel,
          logs.timeoutRemoveChannel,
          logs.banAddChannel,
          logs.banRemoveChannel,
          logs.nicknameChangeChannel,
          logs.channelCreateChannel,
          logs.channelUpdateChannel,
          logs.channelDeleteChannel,
          logs.roleCreateChannel,
          logs.roleUpdateChannel,
          logs.roleDeleteChannel
        ].filter(Boolean);
        if (logChannels.includes(message.channel.id)) {
          const isPremium = config2.premiumExpiry && config2.premiumExpiry > Date.now();
          if (isPremium) {
            let executorId = "";
            try {
              const fetchedLogs = await message.guild.fetchAuditLogs({
                limit: 1,
                type: 72
                // MessageDelete
              });
              const deletionLog = fetchedLogs.entries.first();
              if (deletionLog) {
                const { executor, target } = deletionLog;
                if (target.id === message.author.id && Date.now() - deletionLog.createdTimestamp < 15e3) {
                  executorId = executor.id;
                }
              }
            } catch (err) {
              console.error("[Anti-Log-Bypass] Failed to fetch audit log:", err);
            }
            const alertText = executorId ? `\u26A0\uFE0F **[Premium Anti-Log-Bypass]** \u0642\u0627\u0645 <@${executorId}> \u0628\u062D\u0630\u0641 \u0631\u0633\u0627\u0644\u0629 \u062A\u0633\u062C\u064A\u0644 \u0645\u0646 \u0647\u0630\u0647 \u0627\u0644\u063A\u0631\u0641\u0629! \u062A\u0645\u062A \u0625\u0639\u0627\u062F\u0629 \u0625\u0631\u0633\u0627\u0644\u0647\u0627 \u0644\u0644\u062A\u0648\u062B\u064A\u0642 \u0648\u0627\u0644\u0634\u0641\u0627\u0641\u064A\u0629 \u0627\u0644\u062A\u0627\u0645\u0629.` : `\u26A0\uFE0F **[Premium Anti-Log-Bypass]** \u062A\u0645 \u062D\u0630\u0641 \u0631\u0633\u0627\u0644\u0629 \u062A\u0633\u062C\u064A\u0644 \u0645\u0646 \u0647\u0630\u0647 \u0627\u0644\u063A\u0631\u0641\u0629! \u062A\u0645\u062A \u0625\u0639\u0627\u062F\u0629 \u0625\u0631\u0633\u0627\u0644\u0647\u0627 \u0644\u0644\u062A\u0648\u062B\u064A\u0642 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B.`;
            await message.channel.send({
              content: alertText + (message.content ? `

__\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0623\u0635\u0644\u064A:__
${message.content}` : ""),
              embeds: message.embeds
            }).catch(() => null);
            try {
              const ownerId = message.guild.ownerId;
              const owner = await message.guild.members.fetch(ownerId).catch(() => null);
              if (owner) {
                const isAr2 = config2.language === "ar" || !config2.language;
                const dmEmbed = new EmbedBuilder().setTitle(isAr2 ? "\u{1F6A8} \u062A\u0646\u0628\u064A\u0647 \u0645\u062D\u0627\u0648\u0644\u0629 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u0633\u062C\u0644 (Anti-Log-Bypass Alert)" : "\u{1F6A8} Anti-Log-Bypass Attempt").setDescription(isAr2 ? `
**\u0627\u0644\u0633\u064A\u0631\u0641\u0631:** ${message.guild.name}
**\u0627\u0644\u0642\u0646\u0627\u0629:** <#${message.channel.id}>
**\u0627\u0644\u0641\u0627\u0639\u0644:** ${executorId ? `<@${executorId}>` : "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641 (\u0642\u062F \u064A\u0643\u0648\u0646 \u062D\u0630\u0641\u0647\u0627 \u0628\u0646\u0641\u0633\u0647 \u0623\u0648 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0628\u0648\u062A \u0645\u062D\u062F\u0648\u062F\u0629)"}
**\u0627\u0644\u0625\u062C\u0631\u0627\u0621:** \u062D\u0627\u0648\u0644 \u0627\u0644\u0641\u0627\u0639\u0644 \u062D\u0630\u0641 \u0631\u0633\u0627\u0644\u0629 \u062A\u0648\u062B\u064A\u0642 \u0647\u0627\u0645\u0629 \u0645\u0646 \u0642\u0646\u0648\u0627\u062A \u0627\u0644\u0644\u0648\u062C\u060C \u0648\u062A\u0645 \u0643\u0634\u0641 \u0627\u0644\u062A\u062C\u0627\u0648\u0632 \u0648\u0625\u0639\u0627\u062F\u0629 \u0625\u0631\u0633\u0627\u0644\u0647\u0627 \u0648\u0645\u0633\u062A\u0646\u062F\u0627\u062A\u0647\u0627 \u0643\u0627\u0645\u0644\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0628\u0641\u0636\u0644 \u0627\u0634\u062A\u0631\u0627\u0643 \u0627\u0644\u0628\u0631\u064A\u0645\u064A\u0648\u0645 \u0627\u0644\u0646\u0634\u0637!
                  ` : `
**Server:** ${message.guild.name}
**Channel:** <#${message.channel.id}>
**User:** ${executorId ? `<@${executorId}>` : "Unknown (or deleted by author)"}
**Info:** Action log deletion attempt countered and log re-sent! Detailed alert saved.
                  `).setColor("#FF0000").setTimestamp();
                await owner.send({ embeds: [dmEmbed] }).catch(() => null);
              }
            } catch (dmErr) {
              console.error("[Anti-Log-Bypass] Owner DM notify error:", dmErr);
            }
            return;
          }
        }
      }
    }
    if (message.author?.bot) return;
    const config = guildConfigs.get(message.guild.id);
    const isAr = config?.language === "ar" || !config?.language;
    let deleterText = isAr ? "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641 (\u0635\u0627\u062D\u0628 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0623\u0648 \u0628\u0648\u062A)" : "Unknown (author or bot)";
    try {
      const fetchedLogs = await message.guild.fetchAuditLogs({
        limit: 1,
        type: 72
        // MessageDelete
      });
      const deletionEntry = fetchedLogs.entries.first();
      if (deletionEntry) {
        const { executor, target } = deletionEntry;
        if (target.id === message.author.id && Date.now() - deletionEntry.createdTimestamp < 15e3) {
          deleterText = `<@${executor.id}> (\`${executor.tag}\`)`;
        }
      }
    } catch {
    }
    const embed = new EmbedBuilder();
    if (isAr) {
      embed.setTitle("\u{1F5D1}\uFE0F \u0631\u0633\u0627\u0644\u0629 \u0645\u062D\u0630\u0648\u0641\u0629").setDescription(`**\u062A\u0645 \u062D\u0630\u0641 \u0631\u0633\u0627\u0644\u0629<:Send:1504828192773509180>**
-#  ~~                                                                                                                                                                   ~~
**\u0628\u0648\u0627\u0633\u0637\u0629<:Person:1504602083377287230>: <@${message.author.id}>**
**\u0641\u064A \u0631\u0648\u0645<:Hashtag:1503025347254554704>: <#${message.channel.id}>**
-#  ~~                                                                                                                                                                   ~~
**\u0627\u0644\u0631\u0633\u0627\u0644\u0629:**
\`\`\`${message.content || "\u0645\u062D\u062A\u0648\u0649 \u0641\u0627\u0631\u063A \u0623\u0648 \u0645\u0631\u0641\u0642"}\`\`\``).setColor("#DC3545").setTimestamp();
    } else {
      embed.setTitle("\u{1F5D1}\uFE0F Message Deleted").setDescription(`Message deleted by ${deleterText}`).addFields(
        { name: "Author:", value: `<@${message.author.id}> (\`${message.author.tag}\`)`, inline: true },
        { name: "Channel:", value: `<#${message.channel.id}>`, inline: true },
        { name: "Content:", value: message.content || "*Empty content or attachment*" }
      ).setColor("#DC3545").setTimestamp();
    }
    await sendServerLog(message.guild, "messageDeleteChannel", embed);
  } catch (error) {
    console.error("Error in messageDelete log listener:", error);
  }
});
discordClient.on("guildMemberUpdate", async (oldMember, newMember) => {
  try {
    const config = guildConfigs.get(newMember.guild.id);
    const isAr = config?.language === "ar" || !config?.language;
    if (oldMember.nickname !== newMember.nickname) {
      const embed = new EmbedBuilder();
      if (isAr) {
        embed.setTitle("\u{1F464} \u062A\u0639\u062F\u064A\u0644 \u0644\u0642\u0628 \u0627\u0644\u0639\u0636\u0648").setDescription(`**\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0644\u0642\u0628<:Nickname:1508405058687991879>**
-#  ~~                                                                                                                                                                   ~~
**\u0628\u0648\u0627\u0633\u0637\u0629<:Person:1504602083377287230>: <@${newMember.id}>**
-#  ~~                                                                                                                                                                   ~~
**\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0642\u062F\u064A\u0645:**
\`\`\`${oldMember.nickname || oldMember.user.username}\`\`\`
**\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u062C\u062F\u064A\u062F:**
\`\`\`${newMember.nickname || newMember.user.username}\`\`\``).setColor("#6F42C1").setTimestamp();
      } else {
        embed.setTitle("\u{1F464} Nickname Changed").setDescription("Member changed nickname or was updated by a manager").addFields(
          { name: "Member:", value: `<@${newMember.id}>`, inline: true },
          { name: "Old Nickname:", value: oldMember.nickname || oldMember.user.username, inline: true },
          { name: "New Nickname:", value: newMember.nickname || newMember.user.username, inline: true }
        ).setColor("#6F42C1").setTimestamp();
      }
      await sendServerLog(newMember.guild, "nicknameChangeChannel", embed);
    }
    if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
      const isAdded = newMember.communicationDisabledUntilTimestamp && newMember.communicationDisabledUntilTimestamp > Date.now();
      if (isAdded) {
        const diffMs = newMember.communicationDisabledUntilTimestamp - Date.now();
        const minutes = Math.round(diffMs / 6e4);
        let modText = isAr ? "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641" : "Unknown";
        try {
          const executor = await getAuditLogExecutor(newMember.guild, 24);
          if (executor) modText = `<@${executor.id}> (\`${executor.tag}\`)`;
        } catch {
        }
        const embed = new EmbedBuilder();
        if (isAr) {
          embed.setTitle("\u23F3 \u062A\u0637\u0628\u064A\u0642 \u0643\u062A\u0645 \u062A\u0627\u064A\u0645 \u0623\u0648\u062A").setDescription(`**\u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u062A\u0627\u064A\u0645 \u0623\u0648\u062A<:Timeout1:1508405017173037056>**
-#  ~~                                                                                                                                                                   ~~
**\u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641<:Person:1504602083377287230>: <@${newMember.id}>**
**\u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644: ${modText}**
**\u0627\u0644\u0645\u062F\u0629: ${minutes} \u062F\u0642\u064A\u0642\u0629**
-#  ~~                                                                                                                                                                   ~~`).setColor("#FFC107").setTimestamp();
        } else {
          embed.setTitle("\u23F3 Timeout Applied").setDescription("Timeout applied to member").addFields(
            { name: "Target Member:", value: `<@${newMember.id}> (\`${newMember.user.tag}\`)`, inline: true },
            { name: "Moderator:", value: modText, inline: true },
            { name: "Duration:", value: `${minutes} minutes`, inline: true }
          ).setColor("#FFC107").setTimestamp();
        }
        await sendServerLog(newMember.guild, "timeoutAddChannel", embed);
      } else {
        let modText = isAr ? "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641" : "Unknown";
        try {
          const executor = await getAuditLogExecutor(newMember.guild, 24);
          if (executor) modText = `<@${executor.id}> (\`${executor.tag}\`)`;
        } catch {
        }
        const embed = new EmbedBuilder();
        if (isAr) {
          embed.setTitle("\u2705 \u0625\u0632\u0627\u0644\u0629 \u062A\u0627\u064A\u0645 \u0623\u0648\u062A \u0627\u0644\u0639\u0636\u0648").setDescription(`**\u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u062A\u0627\u064A\u0645 \u0623\u0648\u062A \u0627\u0644\u0643\u062A\u0645<:Timeout1:1508405017173037056>**
-#  ~~                                                                                                                                                                   ~~
**\u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u062D\u0631\u0631<:Person:1504602083377287230>: <@${newMember.id}>**
**\u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644: ${modText}**
-#  ~~                                                                                                                                                                   ~~`).setColor("#20C997").setTimestamp();
        } else {
          embed.setTitle("\u2705 Timeout Removed").setDescription("Timeout has been lifted for the member").addFields(
            { name: "Target Member:", value: `<@${newMember.id}>`, inline: true },
            { name: "Moderator:", value: modText, inline: true }
          ).setColor("#20C997").setTimestamp();
        }
        await sendServerLog(newMember.guild, "timeoutRemoveChannel", embed);
      }
    }
  } catch (error) {
    console.error("Error in guildMemberUpdate logging listener:", error);
  }
});
discordClient.on("guildBanAdd", async (ban) => {
  try {
    const config = guildConfigs.get(ban.guild.id);
    const isAr = config?.language === "ar" || !config?.language;
    let modText = isAr ? "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641" : "Unknown";
    try {
      const executor = await getAuditLogExecutor(ban.guild, 22);
      if (executor) modText = `<@${executor.id}> (\`${executor.tag}\`)`;
    } catch {
    }
    const embed = new EmbedBuilder();
    if (isAr) {
      embed.setTitle("\u{1F6A8} \u062D\u0638\u0631 \u0639\u0636\u0648 \u0646\u0647\u0627\u0626\u064A\u0627\u064B").setDescription(`**\u062A\u0645 \u062D\u0638\u0631 \u0639\u0636\u0648 \u0646\u0647\u0627\u0626\u064A\u0627\u064B<:Ban:1508405013561741402>**
-#  ~~                                                                                                                                                                   ~~
**\u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u062D\u0638\u0648\u0631<:Person:1504602083377287230>: <@${ban.user.id}>**
**\u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644: ${modText}**
**\u0627\u0644\u0633\u0628\u0628<:Reason:1504600051073155165>:**
\`\`\`${ban.reason || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}\`\`\`
-#  ~~                                                                                                                                                                   ~~`).setColor("#8B0000").setTimestamp();
    } else {
      embed.setTitle("\u{1F6A8} Member Banned").setDescription("Member was permanently banned from the community").addFields(
        { name: "Banned User:", value: `<@${ban.user.id}> (\`${ban.user.tag}\`)`, inline: true },
        { name: "Banned By:", value: modText, inline: true },
        { name: "Reason:", value: ban.reason || "Not specified" }
      ).setColor("#8B0000").setTimestamp();
    }
    await sendServerLog(ban.guild, "banAddChannel", embed);
  } catch (error) {
    console.error("Error in guildBanAdd log listener:", error);
  }
});
discordClient.on("guildBanRemove", async (ban) => {
  try {
    const config = guildConfigs.get(ban.guild.id);
    const isAr = config?.language === "ar" || !config?.language;
    let modText = isAr ? "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641" : "Unknown";
    try {
      const executor = await getAuditLogExecutor(ban.guild, 23);
      if (executor) modText = `<@${executor.id}> (\`${executor.tag}\`)`;
    } catch {
    }
    const embed = new EmbedBuilder();
    if (isAr) {
      embed.setTitle("\u{1F513} \u0625\u0644\u063A\u0627\u0621 \u062D\u0638\u0631 \u0627\u0644\u0639\u0636\u0648").setDescription(`**\u062A\u0645 \u0641\u0643 \u0648\u0625\u0644\u063A\u0627\u0621 \u062D\u0638\u0631 \u0627\u0644\u0639\u0636\u0648<:Ban:1508405013561741402>**
-#  ~~                                                                                                                                                                   ~~
**\u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u0639\u0641\u064A<:Person:1504602083377287230>: <@${ban.user.id}>**
**\u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644: ${modText}**
-#  ~~                                                                                                                                                                   ~~`).setColor("#28A745").setTimestamp();
    } else {
      embed.setTitle("\u{1F513} Member Unbanned").setDescription("Member ban lifted and access restored").addFields(
        { name: "User:", value: `<@${ban.user.id}> (\`${ban.user.tag}\`)`, inline: true },
        { name: "Unbanned By:", value: modText, inline: true }
      ).setColor("#28A745").setTimestamp();
    }
    await sendServerLog(ban.guild, "banRemoveChannel", embed);
  } catch (error) {
    console.error("Error in guildBanRemove log listener:", error);
  }
});
discordClient.on("channelCreate", async (channel) => {
  if (!channel.guild) return;
  const config = guildConfigs.get(channel.guild.id);
  const isEnabled = config?.security?.channelsCreateProtection;
  const executor = await getAuditLogExecutor(channel.guild, 10);
  if (isEnabled && executor && executor.id !== channel.guild.client.user?.id) {
    await handleAntiRaidViolation(channel.guild, executor.id, config.language === "ar" ? "\u0625\u0646\u0634\u0627\u0621 \u063A\u0631\u0641 \u0648\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u0647\u0627" : "Unauthorized Channel Creation");
    await channel.delete("Anti-Raid: Prevent Unauthorized Room Creation").catch(() => null);
  } else {
    takeGuildSnapshot(channel.guild).catch(() => null);
  }
  const isAr = config?.language === "ar" || !config?.language;
  const logEmbed = new EmbedBuilder();
  if (isAr) {
    logEmbed.setTitle("\u{1F4C1} \u0642\u0646\u0627\u0629 \u062C\u062F\u064A\u062F\u0629 \u0645\u0646\u0634\u0623\u0629").setDescription(`**\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0642\u0646\u0627\u0629 \u062C\u062F\u064A\u062F\u0629<:Hashtag:1503025347254554704>**
-#  ~~                                                                                                                                                                   ~~
**\u0627\u0633\u0645 \u0627\u0644\u0642\u0646\u0627\u0629: \`${channel.name}\`**
**\u0646\u0648\u0639 \u0627\u0644\u0642\u0646\u0627\u0629:** ${channel.type === ChannelType.GuildText ? "\u0631\u0648\u0645 \u0643\u062A\u0627\u0628\u064A" : channel.type === ChannelType.GuildVoice ? "\u0631\u0648\u0645 \u0635\u0648\u062A\u064A" : "\u0623\u062E\u0631\u0649"}
**\u0627\u0644\u0645\u0646\u0634\u0626 (\u0627\u0644\u0641\u0627\u0639\u0644)<:Person:1504602083377287230>:** ${executor ? `<@${executor.id}>` : "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}
-#  ~~                                                                                                                                                                   ~~`).setColor("#198754").setTimestamp();
  } else {
    logEmbed.setTitle("\u{1F4C1} Channel Created").setDescription(`New channel **${channel.name}** has been created`).addFields(
      { name: "Type:", value: channel.type === ChannelType.GuildText ? "Text" : channel.type === ChannelType.GuildVoice ? "Voice" : `${channel.type}`, inline: true },
      { name: "Channel ID:", value: `\`${channel.id}\``, inline: true },
      { name: "Created By:", value: executor ? `<@${executor.id}>` : "Unknown", inline: true }
    ).setColor("#198754").setTimestamp();
  }
  await sendServerLog(channel.guild, "channelCreateChannel", logEmbed);
});
discordClient.on("channelUpdate", async (oldChannel, newChannel) => {
  if (!newChannel.guild) return;
  const config = guildConfigs.get(newChannel.guild.id);
  const isEnabled = config?.security?.channelsCreateProtection;
  const executor = await getAuditLogExecutor(newChannel.guild, 11);
  if (isEnabled && executor && executor.id !== newChannel.guild.client.user?.id) {
    await handleAntiRaidViolation(newChannel.guild, executor.id, config.language === "ar" ? "\u062A\u0639\u062F\u064A\u0644 \u063A\u0631\u0641 \u0648\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0633\u064A\u0631\u0641\u0631" : "Unauthorized Channel Settings Update");
    const snapshot = guildBackupStates.get(newChannel.guild.id);
    const backup = snapshot?.channels.get(newChannel.id);
    if (backup) {
      await newChannel.edit({
        name: backup.name,
        type: backup.type,
        topic: backup.topic,
        nsfw: backup.nsfw,
        rateLimitPerUser: backup.rateLimitPerUser,
        parent: backup.parentId,
        position: backup.position
      }).catch(() => null);
      if (newChannel.permissionOverwrites) {
        const existingOverwrites = backup.permissionOverwrites.map((o) => ({
          id: o.id,
          type: o.type,
          allow: BigInt(o.allow),
          deny: BigInt(o.deny)
        }));
        await newChannel.permissionOverwrites.set(existingOverwrites).catch(() => null);
      }
    }
  } else {
    takeGuildSnapshot(newChannel.guild).catch(() => null);
  }
  const isAr = config?.language === "ar" || !config?.language;
  const oldName = oldChannel.name;
  const newName = newChannel.name;
  if (oldName !== newName) {
    const logEmbed = new EmbedBuilder();
    if (isAr) {
      logEmbed.setTitle("\u2699\uFE0F \u0631\u0648\u0645 \u0645\u0639\u062F\u0651\u0644 (\u0627\u0644\u0623\u0633\u0645)").setDescription(`**\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0627\u0633\u0645 \u0627\u0644\u0642\u0646\u0627\u0629<:Hashtag:1503025347254554704>**
-#  ~~                                                                                                                                                                   ~~
**\u0627\u0644\u0642\u0646\u0627\u0629 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641\u0629: <#${newChannel.id}>**
**\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0642\u062F\u064A\u0645:** \`${oldName}\`
**\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u062C\u062F\u064A\u062F:** \`${newName}\`
**\u0627\u0644\u0641\u0627\u0639\u0644 \u0644\u0644\u0639\u0645\u0644\u064A\u0629<:Person:1504602083377287230>:** ${executor ? `<@${executor.id}>` : "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}
-#  ~~                                                                                                                                                                   ~~`).setColor("#E0A800").setTimestamp();
    } else {
      logEmbed.setTitle("\u2699\uFE0F Channel Updated (Rename)").setDescription(`Channel <#${newChannel.id}> was renamed`).addFields(
        { name: "Old Name:", value: `\`${oldName}\``, inline: true },
        { name: "New Name:", value: `\`${newName}\``, inline: true },
        { name: "Executor:", value: executor ? `<@${executor.id}>` : "Unknown", inline: true }
      ).setColor("#E0A800").setTimestamp();
    }
    await sendServerLog(newChannel.guild, "channelUpdateChannel", logEmbed);
  }
});
discordClient.on("channelDelete", async (channel) => {
  if (!channel.guild) return;
  const config = guildConfigs.get(channel.guild.id);
  const isEnabled = config?.security?.channelsDeleteProtection;
  const channelNameLower = channel.name?.toLowerCase() || "";
  const isTicketChannel = channelNameLower.startsWith("ticket-") || channelNameLower.includes("ticket") || channelNameLower.includes("\u062A\u0643\u062A") || channel.topic?.includes("TicketOwner:") || (config?.tickets?.activeTickets || []).includes(channel.id);
  if (isTicketChannel && config && config.tickets && config.tickets.activeTickets) {
    config.tickets.activeTickets = config.tickets.activeTickets.filter((id) => id !== channel.id);
    guildConfigs.set(channel.guild.id, config);
    saveConfigs();
  }
  const executor = await getAuditLogExecutor(channel.guild, 12);
  if (isEnabled && executor && executor.id !== channel.guild.client.user?.id && !isTicketChannel) {
    await handleAntiRaidViolation(channel.guild, executor.id, config.language === "ar" ? "\u062D\u0630\u0641 \u063A\u0631\u0641 \u0648\u0631\u0648\u0645\u0627\u062A \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0634\u0643\u0644 \u0645\u0634\u0628\u0648\u0647" : "Unauthorized Channel Deletion");
    const snapshot = guildBackupStates.get(channel.guild.id);
    const backup = snapshot?.channels.get(channel.id);
    if (backup) {
      const createdChannel = await channel.guild.channels.create({
        name: backup.name,
        type: backup.type,
        topic: backup.topic,
        nsfw: backup.nsfw,
        rateLimitPerUser: backup.rateLimitPerUser,
        parent: backup.parentId,
        position: backup.position,
        permissionOverwrites: backup.permissionOverwrites.map((o) => ({
          id: o.id,
          type: o.type,
          allow: BigInt(o.allow),
          deny: BigInt(o.deny)
        })),
        reason: "Anti-Raid Auto-Restore Deleted Channel"
      }).catch(() => null);
      if (createdChannel) {
        setTimeout(() => takeGuildSnapshot(channel.guild), 5e3);
      }
    }
  }
  const isAr = config?.language === "ar" || !config?.language;
  const logEmbed = new EmbedBuilder();
  if (isAr) {
    logEmbed.setTitle("\u{1F5D1}\uFE0F \u0631\u0648\u0645 \u0645\u062D\u0630\u0648\u0641").setDescription(`**\u062A\u0645 \u062D\u0630\u0641 \u0642\u0646\u0627\u0629 \u0645\u0646 \u0627\u0644\u0633\u064A\u0631\u0641\u0631<:Hashtag:1503025347254554704>**
-#  ~~                                                                                                                                                                   ~~
**\u0627\u0633\u0645 \u0627\u0644\u0631\u0648\u0645 \u0627\u0644\u0645\u062D\u0630\u0648\u0641: \`${channel.name}\`**
**\u062D\u0630\u0641\u062A \u0628\u0648\u0627\u0633\u0637\u0629<:Person:1504602083377287230>:** ${executor ? `<@${executor.id}>` : "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}
-#  ~~                                                                                                                                                                   ~~`).setColor("#C82333").setTimestamp();
  } else {
    logEmbed.setTitle("\u{1F5D1}\uFE0F Channel Deleted").setDescription(`Channel **${channel.name}** was deleted from the server`).addFields(
      { name: "Channel ID:", value: `\`${channel.id}\``, inline: true },
      { name: "Executor:", value: executor ? `<@${executor.id}>` : "Unknown", inline: true }
    ).setColor("#C82333").setTimestamp();
  }
  await sendServerLog(channel.guild, "channelDeleteChannel", logEmbed);
});
discordClient.on("roleCreate", async (role) => {
  const config = guildConfigs.get(role.guild.id);
  const isEnabled = config?.security?.rolesCreateProtection;
  const executor = await getAuditLogExecutor(role.guild, 30);
  if (isEnabled && executor && executor.id !== role.guild.client.user?.id) {
    await handleAntiRaidViolation(role.guild, executor.id, config.language === "ar" ? "\u0625\u0646\u0634\u0627\u0621 \u0631\u062A\u0628 \u062C\u062F\u064A\u062F\u0629 \u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u0647\u0627" : "Unauthorized Role Creation");
    await role.delete("Anti-Raid: Prevent Unauthorized Role-Group").catch(() => null);
  } else {
    takeGuildSnapshot(role.guild).catch(() => null);
  }
  const isAr = config?.language === "ar" || !config?.language;
  const logEmbed = new EmbedBuilder();
  if (isAr) {
    logEmbed.setTitle("\u{1F3A8} \u0631\u062A\u0628\u0629 \u062C\u062F\u064A\u062F\u0629 \u0645\u0646\u0634\u0623\u0629").setDescription(`**\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0631\u062A\u0628\u0629 \u062C\u062F\u064A\u062F\u0629<:Role:1508405188338258061>**
-#  ~~                                                                                                                                                                   ~~
**\u0627\u0633\u0645 \u0627\u0644\u0631\u062A\u0628\u0629: \`${role.name}\`**
**\u0627\u0644\u0641\u0627\u0639\u0644 \u0644\u0644\u0635\u0646\u0639<:Person:1504602083377287230>:** ${executor ? `<@${executor.id}>` : "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}
-#  ~~                                                                                                                                                                   ~~`).setColor("#007BFF").setTimestamp();
  } else {
    logEmbed.setTitle("\u{1F3A8} Role Created").setDescription(`A new role **${role.name}** has been created`).addFields(
      { name: "Role ID:", value: `\`${role.id}\``, inline: true },
      { name: "Created By:", value: executor ? `<@${executor.id}>` : "Unknown", inline: true }
    ).setColor("#007BFF").setTimestamp();
  }
  await sendServerLog(role.guild, "roleCreateChannel", logEmbed);
});
discordClient.on("roleUpdate", async (oldRole, newRole) => {
  const config = guildConfigs.get(newRole.guild.id);
  const isEnabled = config?.security?.rolesCreateProtection;
  const executor = await getAuditLogExecutor(newRole.guild, 31);
  if (isEnabled && executor && executor.id !== newRole.guild.client.user?.id) {
    await handleAntiRaidViolation(newRole.guild, executor.id, config.language === "ar" ? "\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0648\u0627\u0644\u0631\u062A\u0628 \u0628\u0627\u0644\u062E\u0637\u0623" : "Unauthorized Role Settings Edit");
    const snapshot = guildBackupStates.get(newRole.guild.id);
    const backup = snapshot?.roles.get(newRole.id);
    if (backup) {
      await newRole.edit({
        name: backup.name,
        color: backup.color,
        hoist: backup.hoist,
        mentionable: backup.mentionable,
        permissions: BigInt(backup.permissions)
      }).catch(() => null);
    }
  } else {
    takeGuildSnapshot(newRole.guild).catch(() => null);
  }
  const isAr = config?.language === "ar" || !config?.language;
  const oldName = oldRole.name;
  const newName = newRole.name;
  if (oldName !== newName) {
    const logEmbed = new EmbedBuilder();
    if (isAr) {
      logEmbed.setTitle("\u{1F6E0}\uFE0F \u0631\u062A\u0628\u0629 \u0645\u0639\u062F\u0644\u0629 (\u062A\u063A\u064A\u064A\u0631 \u0627\u0633\u0645)").setDescription(`**\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0627\u0633\u0645 \u0627\u0644\u0631\u062A\u0628\u0629<:Role:1508405188338258061>**
-#  ~~                                                                                                                                                                   ~~
**\u0627\u0644\u0631\u062A\u0628\u0629 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641\u0629: <@&${newRole.id}>**
**\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0642\u062F\u064A\u0645:** \`${oldName}\`
**\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u062C\u062F\u064A\u062F:** \`${newName}\`
**\u0627\u0644\u0645\u0633\u0624\u0648\u0644 (\u0627\u0644\u0641\u0627\u0639\u0644)<:Person:1504602083377287230>:** ${executor ? `<@${executor.id}>` : "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}
-#  ~~                                                                                                                                                                   ~~`).setColor("#D39E00").setTimestamp();
    } else {
      logEmbed.setTitle("\u{1F6E0}\uFE0F Role Modified (Rename)").setDescription("Role name was updated").addFields(
        { name: "Old Name:", value: `\`${oldName}\``, inline: true },
        { name: "New Name:", value: `\`${newName}\``, inline: true },
        { name: "Executor:", value: executor ? `<@${executor.id}>` : "Unknown", inline: true }
      ).setColor("#D39E00").setTimestamp();
    }
    await sendServerLog(newRole.guild, "roleUpdateChannel", logEmbed);
  }
});
discordClient.on("roleDelete", async (role) => {
  const config = guildConfigs.get(role.guild.id);
  const isEnabled = config?.security?.rolesDeleteProtection;
  const executor = await getAuditLogExecutor(role.guild, 32);
  if (isEnabled && executor && executor.id !== role.guild.client.user?.id) {
    await handleAntiRaidViolation(role.guild, executor.id, config.language === "ar" ? "\u062D\u0630\u0641 \u0631\u062A\u0628 \u0648\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062E\u0627\u062F\u0645 \u0628\u0627\u0644\u0643\u0627\u0645\u0644" : "Unauthorized Role Deletion");
    const snapshot = guildBackupStates.get(role.guild.id);
    const backup = snapshot?.roles.get(role.id);
    if (backup) {
      const createdRole = await role.guild.roles.create({
        name: backup.name,
        color: backup.color,
        hoist: backup.hoist,
        mentionable: backup.mentionable,
        permissions: BigInt(backup.permissions),
        reason: "Anti-Raid Auto-Restore Deleted Role"
      }).catch(() => null);
      if (createdRole) {
        for (const mId of backup.memberIds) {
          const m = await role.guild.members.fetch(mId).catch(() => null);
          if (m) {
            await m.roles.add(createdRole).catch(() => null);
          }
        }
        setTimeout(() => takeGuildSnapshot(role.guild), 5e3);
      }
    }
  }
  const isAr = config?.language === "ar" || !config?.language;
  const logEmbed = new EmbedBuilder();
  if (isAr) {
    logEmbed.setTitle("\u{1F6A8} \u0631\u062A\u0628\u0629 \u0645\u062D\u0630\u0648\u0641\u0629 \u0645\u0646 \u0627\u0644\u0633\u064A\u0631\u0641\u0631").setDescription(`**\u062A\u0645 \u062D\u0630\u0641 \u0631\u062A\u0628\u0629 \u0645\u0646 \u0627\u0644\u0633\u064A\u0631\u0641\u0631<:Role:1508405188338258061>**
-#  ~~                                                                                                                                                                   ~~
**\u0627\u0633\u0645 \u0627\u0644\u0631\u062A\u0628\u0629 \u0627\u0644\u0645\u062D\u0630\u0648\u0641\u0629: \`${role.name}\`**
**\u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0639\u0646 \u0627\u0644\u062D\u0630\u0641<:Person:1504602083377287230>:** ${executor ? `<@${executor.id}>` : "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}
-#  ~~                                                                                                                                                                   ~~`).setColor("#B51A1A").setTimestamp();
  } else {
    logEmbed.setTitle("\u{1F6A8} Role Deleted").setDescription(`Role **${role.name}** was deleted from the guild`).addFields(
      { name: "Role ID:", value: `\`${role.id}\``, inline: true },
      { name: "Executor:", value: executor ? `<@${executor.id}>` : "Unknown", inline: true }
    ).setColor("#B51A1A").setTimestamp();
  }
  await sendServerLog(role.guild, "roleDeleteChannel", logEmbed);
});
discordClient.on("guildMemberAdd", async (member) => {
  const config = guildConfigs.get(member.guild.id);
  if (config && config.autoRolesEnabled && config.autoRoles && config.autoRoles.length > 0) {
    for (const roleId of config.autoRoles) {
      if (roleId) {
        await member.roles.add(roleId).catch((err) => {
          console.error(`Failed to assign autoRole ${roleId}:`, err);
        });
      }
    }
  }
  if (member.user.bot && config && config.security?.botsProtection) {
    try {
      const executor = await getAuditLogExecutor(member.guild, 28);
      const inviterId = executor ? executor.id : "Unknown";
      await handleAntiRaidViolation(
        member.guild,
        inviterId,
        config.language === "ar" ? "\u062F\u0639\u0648\u0629 \u0648\u0625\u062F\u062E\u0627\u0644 \u0628\u0648\u062A \u0645\u062C\u0647\u0648\u0644 \u0644\u0644\u0633\u064A\u0631\u0641\u0631" : "Inviting unauthorized bot account"
      );
      await member.ban({ reason: "ntl security: unauthorized bot invite protection" }).catch(async () => {
        await member.kick("ntl security: bot invite protection").catch(() => null);
      });
      return;
    } catch (e) {
      console.error("Bots protection invite block failed:", e);
    }
  }
  if (!config || !config.welcome) return;
  const wConf = config.welcome;
  let inviter = "Unknown";
  let finalInviteLink = "";
  try {
    const newInvites = await member.guild.invites.fetch();
    const oldInvites = guildInvites.get(member.guild.id);
    if (oldInvites) {
      const usedInvite = newInvites.find((inv) => inv.uses && inv.uses > (oldInvites.get(inv.code) || 0));
      if (usedInvite) {
        inviter = usedInvite.inviter?.username || "Unknown";
        finalInviteLink = usedInvite.url;
      }
    }
    const newInviteMap = /* @__PURE__ */ new Map();
    newInvites.forEach((inv) => newInviteMap.set(inv.code, inv.uses || 0));
    guildInvites.set(member.guild.id, newInviteMap);
  } catch (e) {
    console.log("Could not process invites for guildMemberAdd", e);
  }
  if (!finalInviteLink) {
    try {
      const channels = await member.guild.channels.fetch();
      const textChannel = channels.find((c) => c?.isTextBased());
      if (textChannel && textChannel.isTextBased() && "createInvite" in textChannel) {
        const inv = await textChannel.createInvite({ maxAge: 0, maxUses: 0 });
        finalInviteLink = inv.url;
      }
    } catch (e) {
    }
  }
  if (!finalInviteLink) {
    finalInviteLink = "https://discord.gg/";
  }
  const accountAgeMs = Date.now() - member.user.createdTimestamp;
  const days = Math.floor(accountAgeMs / (1e3 * 60 * 60 * 24));
  const accountAgeStr = days === 0 ? "\u0627\u0644\u064A\u0648\u0645" : (() => {
    if (days === 1) return "\u064A\u0648\u0645 \u0648\u0627\u062D\u062F";
    if (days === 2) return "\u064A\u0648\u0645\u0627\u0646";
    if (days > 2 && days < 11) return `${days} \u0623\u064A\u0627\u0645`;
    return `${days} \u064A\u0648\u0645`;
  })();
  if (wConf.dmEnabled !== false && wConf.dmMessage) {
    try {
      const dmMsg = wConf.dmMessage.replace(/\[user\]/g, member.user.username).replace(/\[server\]/g, member.guild.name).replace(/\[membercount\]/g, String(member.guild.memberCount)).replace(/\[Invitedby\]/g, inviter).replace(/\[accountage\]/g, accountAgeStr);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel(member.guild.name.substring(0, 80)).setStyle(ButtonStyle.Link).setURL(finalInviteLink)
      );
      await member.send({ content: dmMsg, components: [row] });
    } catch (err) {
      console.log(`Could not send DM to ${member.user?.tag || "unknown"}:`, err);
    }
  }
  if (wConf.channelId && wConf.message) {
    try {
      const channel = member.guild.channels.cache.get(wConf.channelId);
      if (channel && channel.isTextBased()) {
        const msg = wConf.message.replace(/\[user\]/g, `<@${member.id}>`).replace(/\[server\]/g, member.guild.name).replace(/\[membercount\]/g, String(member.guild.memberCount)).replace(/\[Invitedby\]/g, inviter).replace(/\[accountage\]/g, accountAgeStr);
        let attachment;
        try {
          const { createCanvas, loadImage } = await import("canvas");
          const canvas = createCanvas(800, 450);
          const ctx = canvas.getContext("2d");
          if (wConf.bgUrl) {
            try {
              const bg = await loadImage(wConf.bgUrl);
              ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
              ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            } catch (e) {
              ctx.fillStyle = "#000000";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
          } else {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const textX = centerX + (wConf.textPos?.x || 0);
          const textY = centerY + (wConf.textPos?.y || 70);
          ctx.font = `900 ${wConf.textSize || 20}px sans-serif`;
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          ctx.fillText(member.user.username, textX, textY);
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          const avatarX = centerX + (wConf.avatarPos?.x || 0);
          const avatarY = centerY + (wConf.avatarPos?.y || -20);
          const avatarSize = wConf.avatarSize || 96;
          let avatar;
          try {
            const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 }) || "https://i.pravatar.cc/150";
            avatar = await loadImage(avatarUrl);
          } catch (e) {
            avatar = await loadImage("https://i.pravatar.cc/150");
          }
          ctx.save();
          ctx.translate(avatarX, avatarY);
          ctx.beginPath();
          const halfSize = avatarSize / 2;
          const shape = wConf.avatarShape || "circle";
          if (shape === "circle") {
            ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
          } else if (shape === "square") {
            ctx.roundRect(-halfSize, -halfSize, avatarSize, avatarSize, avatarSize * 0.1);
          } else if (shape === "diamond") {
            ctx.moveTo(0, -halfSize);
            ctx.lineTo(halfSize, 0);
            ctx.lineTo(0, halfSize);
            ctx.lineTo(-halfSize, 0);
            ctx.closePath();
          } else if (shape === "triangle") {
            ctx.moveTo(0, -halfSize);
            ctx.lineTo(-halfSize, halfSize);
            ctx.lineTo(halfSize, halfSize);
            ctx.closePath();
          }
          ctx.clip();
          ctx.drawImage(avatar, -halfSize, -halfSize, avatarSize, avatarSize);
          ctx.restore();
          ctx.save();
          ctx.translate(avatarX, avatarY);
          ctx.beginPath();
          if (shape === "circle") {
            ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
          } else if (shape === "square") {
            ctx.roundRect(-halfSize, -halfSize, avatarSize, avatarSize, avatarSize * 0.1);
          } else if (shape === "diamond") {
            ctx.moveTo(0, -halfSize);
            ctx.lineTo(halfSize, 0);
            ctx.lineTo(0, halfSize);
            ctx.lineTo(-halfSize, 0);
            ctx.closePath();
          } else if (shape === "triangle") {
            ctx.moveTo(0, -halfSize);
            ctx.lineTo(-halfSize, halfSize);
            ctx.lineTo(halfSize, halfSize);
            ctx.closePath();
          }
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
          ctx.restore();
          attachment = new AttachmentBuilder(canvas.toBuffer(), { name: "welcome.png" });
        } catch (e) {
          console.error("Error generating welcome image:", e);
        }
        if (attachment) {
          await channel.send({ content: msg, files: [attachment] });
        } else {
          await channel.send(msg);
        }
      }
    } catch (err) {
      console.log("Could not send welcome message to channel:", err);
    }
  }
});
discordClient.on("guildMemberRemove", async (member) => {
  const config = guildConfigs.get(member.guild.id);
  if (!config || !config.autoFeatures || !config.autoFeatures.bye || !config.autoFeatures.bye.enabled) return;
  const byeConf = config.autoFeatures.bye;
  if (!byeConf.channelId) return;
  try {
    const channel = member.guild.channels.cache.get(byeConf.channelId);
    if (channel && channel.isTextBased()) {
      const lang = config.language || "ar";
      const rawMsg = byeConf.message || (lang === "ar" ? "\u0648\u062F\u0627\u0639\u0627\u064B [user]\u060C \u0646\u062A\u0645\u0646\u0649 \u0644\u0643 \u062D\u0638\u0627\u064B \u0645\u0648\u0641\u0642\u0627\u064B!" : "Goodbye [user], we wish you the best of luck!");
      const textMsg = rawMsg.replace(/\[user\]/g, member.user.username).replace(/\[server\]/g, member.guild.name).replace(/\[membercount\]/g, String(member.guild.memberCount));
      const options = { content: textMsg };
      if (byeConf.lineUrl) {
        if (byeConf.lineUrl.startsWith("data:image")) {
          const base64Data = byeConf.lineUrl.split(";base64,").pop();
          options.files = [new AttachmentBuilder(Buffer.from(base64Data, "base64"), { name: "bye.png" })];
        } else if (byeConf.lineUrl.includes("/uploads/")) {
          const uploadsIdx = byeConf.lineUrl.indexOf("/uploads/");
          const filename = byeConf.lineUrl.substring(uploadsIdx + "/uploads/".length);
          const localPath = path.join(process.cwd(), "uploads", filename);
          if (fs.existsSync(localPath)) {
            options.files = [new AttachmentBuilder(localPath, { name: "bye.png" })];
          } else {
            options.files = [new AttachmentBuilder(byeConf.lineUrl, { name: "bye.png" })];
          }
        } else {
          options.files = [new AttachmentBuilder(byeConf.lineUrl, { name: "bye.png" })];
        }
      }
      await channel.send(options);
    }
  } catch (err) {
    console.error("Error sending bye room message:", err);
  }
});
async function applyAutoModPunishment(member, type, duration, unit, reason, channel, language) {
  if (!member) return;
  const isAr = language === "ar" || !language;
  if (!type || type === "none" || type === "warn") {
    return;
  }
  if (type === "kick") {
    if (member.kickable) {
      await member.kick(reason).catch(() => null);
      await channel.send(isAr ? `\u{1F6B7} \u062A\u0645 \u0637\u0631\u062F \u0627\u0644\u0639\u0636\u0648 <@${member.id}> \u0628\u0633\u0628\u0628 \u0645\u062E\u0627\u0644\u0641\u0629 \u0642\u0648\u0627\u0646\u064A\u0646 \u0627\u0644\u0631\u0642\u0627\u0628\u0629 \u0648\u0627\u0644\u062D\u0645\u0627\u064A\u0629!` : `\u{1F6B7} Member <@${member.id}> was kicked due to auto protection mechanisms.`).catch(() => null);
    }
  } else if (type === "ban") {
    if (member.bannable) {
      await member.ban({ reason }).catch(() => null);
      await channel.send(isAr ? `\u{1F528} \u062A\u0645 \u062D\u0638\u0631 \u0627\u0644\u0639\u0636\u0648 <@${member.id}> \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0628\u0633\u0628\u0628 \u0645\u062E\u0627\u0644\u0641\u0629 \u0642\u0648\u0627\u0646\u064A\u0646 \u0627\u0644\u0631\u0642\u0627\u0628\u0629 \u0648\u0627\u0644\u062D\u0645\u0627\u064A\u0629!` : `\u{1F528} Member <@${member.id}> was banned permanently due to auto protection mechanisms.`).catch(() => null);
    }
  } else if (type === "timeout") {
    let ms = 0;
    const durVal = duration || 5;
    if (unit === "days") ms = durVal * 24 * 60 * 60 * 1e3;
    else if (unit === "hours") ms = durVal * 60 * 60 * 1e3;
    else ms = durVal * 60 * 1e3;
    try {
      const highestMe = member.guild.members.me.roles.highest.position;
      const memHighest = member.roles.highest.position;
      if (memHighest < highestMe && member.id !== member.guild.ownerId) {
        await member.timeout(ms, reason).catch(() => null);
        const unitStrAr = unit === "days" ? "\u0623\u064A\u0627\u0645" : unit === "hours" ? "\u0633\u0627\u0639\u0627\u062A" : "\u062F\u0642\u0627\u0626\u0642";
        const unitStrEn = unit || "minutes";
        await channel.send(isAr ? `\u{1F507} \u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u0648\u0642\u062A \u0645\u0633\u062A\u0642\u0637\u0639 (\u062A\u0627\u064A\u0645 \u0623\u0648\u062A) \u0639\u0644\u0649 \u0627\u0644\u0639\u0636\u0648 <@${member.id}> \u0644\u0645\u062F\u0629 **${durVal} ${unitStrAr}** \u0644\u0644\u0631\u0642\u0627\u0628\u0629 \u0648\u0627\u0644\u062D\u0645\u0627\u064A\u0629!` : `\u{1F507} <@${member.id}> was timed out for **${durVal} ${unitStrEn}** due to auto protection mechanisms.`).catch(() => null);
      }
    } catch (e) {
      console.error("[AutoMod Punishment] Timeout action failed:", e);
    }
  }
}
discordClient.on("autoModerationActionExecution", async (execution) => {
  const guild = execution.guild;
  if (!guild) return;
  const guildConfig = guildConfigs.get(guild.id);
  if (!guildConfig) return;
  const security = guildConfig.security || {};
  const ruleId = execution.ruleId;
  const rule = await guild.autoModerationRules.fetch(ruleId).catch(() => null);
  const ruleName = rule?.name || "";
  const isBlockedWords = ruleName === "[Bot] AutoMod Blocked Words";
  const isLinkProtection = ruleName === "[Bot] AutoMod Link Protection";
  if (!isBlockedWords && !isLinkProtection) return;
  const member = await guild.members.fetch(execution.userId).catch(() => null);
  if (!member) return;
  const isAr = guildConfig.language === "ar" || !guildConfig.language;
  if (isBlockedWords) {
    const wordPunishment = security.wordPunishment || "none";
    const wordDuration = security.wordPunishmentDuration || 5;
    const wordUnit = security.wordPunishmentUnit || "minutes";
    if (wordPunishment === "timeout") {
      let ms = 0;
      const durVal = wordDuration || 5;
      if (wordUnit === "days") ms = durVal * 24 * 60 * 60 * 1e3;
      else if (wordUnit === "hours") ms = durVal * 60 * 60 * 1e3;
      else ms = durVal * 60 * 1e3;
      try {
        const highestMe = guild.members.me.roles.highest.position;
        const memHighest = member.roles.highest.position;
        if (memHighest < highestMe && member.id !== guild.ownerId) {
          await member.timeout(ms, isAr ? "\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0643\u0644\u0645\u0627\u062A \u0645\u062D\u0638\u0648\u0631\u0629" : "Using blacklisted words").catch(() => null);
          console.log(`[AutoMod] Silently timed out ${member.user?.tag} for ${durVal} ${wordUnit}`);
        }
      } catch (e) {
        console.error("[AutoMod Punishment] Timeout failed:", e);
      }
    } else if (wordPunishment !== "none" && wordPunishment !== "warn") {
      await applyAutoModPunishment(
        member,
        wordPunishment,
        wordDuration,
        wordUnit,
        isAr ? "\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0643\u0644\u0645\u0627\u062A \u0645\u062D\u0638\u0648\u0631\u0629" : "Using blacklisted words",
        { send: async () => null },
        // silent
        guildConfig.language
      );
    }
  } else if (isLinkProtection) {
    const linkPunishment = security.linkPunishment || "none";
    const linkDuration = security.linkPunishmentDuration || 5;
    const linkUnit = security.linkPunishmentUnit || "minutes";
    if (linkPunishment === "timeout") {
      let ms = 0;
      const durVal = linkDuration || 5;
      if (linkUnit === "days") ms = durVal * 24 * 60 * 60 * 1e3;
      else if (linkUnit === "hours") ms = durVal * 60 * 60 * 1e3;
      else ms = durVal * 60 * 1e3;
      try {
        const highestMe = guild.members.me.roles.highest.position;
        const memHighest = member.roles.highest.position;
        if (memHighest < highestMe && member.id !== guild.ownerId) {
          await member.timeout(ms, isAr ? "\u0646\u0634\u0631 \u0631\u0648\u0627\u0628\u0637 \u0625\u0639\u0644\u0627\u0646\u064A\u0629 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D\u0629" : "Posting forbidden links").catch(() => null);
          console.log(`[AutoMod] Silently timed out ${member.user?.tag} for ${durVal} ${linkUnit}`);
        }
      } catch (e) {
        console.error("[AutoMod Punishment] Timeout failed:", e);
      }
    } else if (linkPunishment !== "none" && linkPunishment !== "warn") {
      await applyAutoModPunishment(
        member,
        linkPunishment,
        linkDuration,
        linkUnit,
        isAr ? "\u0646\u0634\u0631 \u0631\u0648\u0627\u0628\u0637 \u0625\u0639\u0644\u0627\u0646\u064A\u0629 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D\u0629" : "Posting forbidden links",
        { send: async () => null },
        // silent
        guildConfig.language
      );
    }
  }
});
const botComms = [
  {
    id: "timeout",
    englishName: "Timeout",
    arabicName: "\u062A\u0627\u064A\u0645 \u0627\u0648\u062A",
    description: "\u0645\u0646\u0639 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0646 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0626\u0644\u060C \u0639\u0645\u0644 \u0631\u064A\u0627\u0643\u0634\u0646\u060C \u0627\u0648 \u062F\u062E\u0648\u0644 \u0644\u0644\u0631\u0648\u0645\u0627\u062A \u0635\u0648\u062A\u064A\u0629",
    shortcuts: ["timeout", "mute", "\u0643\u062A\u0645", "\u062A\u0648", "to"],
    usage: "/timeout [user]\n/timeout [user] (time)\n/timeout [user] (reason)",
    examples: [
      "/timeout <@!1179133837930938470>",
      "/timeout <@!1179133837930938470> 1h",
      "/timeout <@!1179133837930938470> Spamming"
    ]
  },
  {
    id: "untimeout",
    englishName: "Untimeout",
    arabicName: "\u0625\u0632\u0627\u0644\u0629 \u062A\u0627\u064A\u0645 \u0627\u0648\u062A",
    description: "\u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u0633\u062A\u0642\u0637\u0639 \u0648\u0625\u0639\u0627\u062F\u0629 \u062A\u0641\u0639\u064A\u0644 \u0642\u062F\u0631\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0639\u0644\u0649 \u0627\u0644\u0643\u0644\u0627\u0645 \u0648\u0627\u0644\u062A\u0641\u0627\u0639\u0644",
    shortcuts: ["untimeout", "unmute", "\u0641\u0643-\u0643\u062A\u0645", "un"],
    usage: "/untimeout [user]",
    examples: [
      "/untimeout <@!1179133837930938470>"
    ]
  },
  {
    id: "role",
    englishName: "Role",
    arabicName: "\u0631\u062A\u0628\u0629 / \u062F\u0648\u0631",
    description: "\u0625\u0639\u0637\u0627\u0621 \u0623\u0648 \u0625\u0632\u0627\u0644\u0629 \u0631\u062A\u0628\u0629 \u0645\u062D\u062F\u062F\u0629 \u0645\u0646 \u0639\u0636\u0648 \u0645\u0639\u064A\u0646 \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631",
    shortcuts: ["role", "\u0631\u062A\u0628\u0629", "\u0631\u0648\u0644"],
    usage: "/role [user] [role]",
    examples: [
      "/role <@!1179133837930938470> @Admin"
    ]
  },
  {
    id: "ban",
    englishName: "Ban",
    arabicName: "\u062D\u0638\u0631",
    description: "\u062D\u0638\u0631 \u0639\u0636\u0648 \u0628\u0634\u0643\u0644 \u0646\u0647\u0627\u0626\u064A \u0648\u0645\u0624\u0628\u062F \u0645\u0646 \u062F\u062E\u0648\u0644 \u0627\u0644\u0633\u064A\u0631\u0641\u0631",
    shortcuts: ["ban", "\u062D\u0638\u0631", "\u0628\u0627\u0646"],
    usage: "/ban [user] [reason]",
    examples: [
      "/ban <@!1179133837930938470> Trolling"
    ]
  },
  {
    id: "unban",
    englishName: "Unban",
    arabicName: "\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u0638\u0631",
    description: "\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u0638\u0631 \u0639\u0646 \u0639\u0636\u0648 \u0644\u062A\u0645\u0643\u064A\u0646\u0647 \u0645\u0646 \u0645\u0639\u0627\u0648\u062F\u0629 \u062F\u062E\u0648\u0644 \u0627\u0644\u0633\u064A\u0631\u0641\u0631",
    shortcuts: ["unban", "\u0641\u0643-\u062D\u0638\u0631", "\u0641\u0643-\u0628\u0627\u0646"],
    usage: "/unban [user_id]",
    examples: [
      "/unban 1179133837930938470"
    ]
  },
  {
    id: "hide",
    englishName: "Hide",
    arabicName: "\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0642\u0646\u0627\u0629",
    description: "\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0631\u0648\u0645 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0639\u0646 \u0631\u062A\u0628\u0629 \u0627\u0644\u062C\u0645\u064A\u0639 (everyone) \u0648\u0628\u0627\u0642\u064A \u0627\u0644\u0623\u0639\u0636\u0627\u0621",
    shortcuts: ["hide", "\u0625\u062E\u0641\u0627\u0621", "\u0627\u062E\u0641\u0627\u0621", "#hide"],
    usage: "/hide\n\u0627\u0648 \u0627\u062E\u062A\u0635\u0627\u0631 \u0645\u0628\u0627\u0634\u0631: #hide",
    examples: [
      "#hide",
      "/hide"
    ]
  },
  {
    id: "lock",
    englishName: "Lock",
    arabicName: "\u0642\u0641\u0644 \u0627\u0644\u0642\u0646\u0627\u0629",
    description: "\u0642\u0641\u0644 \u0627\u0644\u0631\u0648\u0645 \u0644\u0645\u0646\u0639 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0648\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0640 Threads \u0645\u0646 \u0642\u0628\u0644 \u0627\u0644\u0623\u0639\u0636\u0627\u0621",
    shortcuts: ["lock", "\u0642\u0641\u0644"],
    usage: "/lock\n\u0627\u0648 \u0627\u0644\u0627\u062E\u062A\u0635\u0627\u0631 \u0627\u0644\u0643\u062A\u0627\u0628\u064A: !lock",
    examples: [
      "/lock",
      "!lock"
    ]
  },
  {
    id: "unlock",
    englishName: "Unlock",
    arabicName: "\u0641\u062A\u062D \u0627\u0644\u0642\u0646\u0627\u0629",
    description: "\u0641\u062A\u062D \u0627\u0644\u0631\u0648\u0645 \u0627\u0644\u0645\u063A\u0644\u0642\u0629 \u0648\u0625\u0639\u0627\u062F\u0629 \u062A\u0645\u0643\u064A\u0646 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0648\u0628\u0627\u0642\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A",
    shortcuts: ["unlock", "\u0641\u062A\u062D"],
    usage: "/unlock\n\u0627\u0648 \u0627\u0644\u0627\u062E\u062A\u0635\u0627\u0631 \u0627\u0644\u0643\u062A\u0627\u0628\u064A: !unlock",
    examples: [
      "/unlock",
      "!unlock"
    ]
  },
  {
    id: "warn",
    englishName: "Warn",
    arabicName: "\u062A\u062D\u0630\u064A\u0631",
    description: "\u0625\u0631\u0633\u0627\u0644 \u062A\u062D\u0630\u064A\u0631 \u0644\u0639\u0636\u0648 \u0628\u0633\u0628\u0628 \u0645\u062E\u0627\u0644\u0641\u0629 \u0627\u0644\u0642\u0648\u0627\u0639\u062F. \u062A\u0631\u0627\u0643\u0645 \u0627\u0644\u062A\u062D\u0630\u064A\u0631\u0627\u062A \u064A\u0633\u0628\u0628 \u0639\u0642\u0648\u0628\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0629.",
    shortcuts: ["warn", "\u062A\u062D\u0630\u064A\u0631", "\u0645\u062E\u0627\u0644\u0641\u0629"],
    usage: "/warn [user] (reason)",
    examples: [
      "/warn <@!1179133837930938470> Spamming"
    ]
  },
  {
    id: "unwarn",
    englishName: "Unwarn",
    arabicName: "\u0625\u0644\u063A\u0627\u0621 \u062A\u062D\u0630\u064A\u0631",
    description: "\u0625\u0632\u0627\u0644\u0629 \u062A\u062D\u0630\u064A\u0631 \u0645\u062D\u062F\u062F \u0644\u0639\u0636\u0648 \u0628\u0627\u0644\u0633\u064A\u0631\u0641\u0631",
    shortcuts: ["unwarn", "\u0625\u0644\u063A\u0627\u0621-\u062A\u062D\u0630\u064A\u0631", "\u0627\u0632\u0627\u0644\u0629-\u062A\u062D\u0630\u064A\u0631", "\u062D\u0630\u0641-\u062A\u062D\u0630\u064A\u0631"],
    usage: "/unwarn [user] [warning_index]",
    examples: [
      "/unwarn <@!1179133837930938470> 1"
    ]
  },
  {
    id: "warnings",
    englishName: "Warnings",
    arabicName: "\u0627\u0644\u062A\u062D\u0630\u064A\u0631\u0627\u062A",
    description: "\u0639\u0631\u0636 \u0642\u0627\u0626\u0645\u0629 \u0628\u0643\u0627\u0641\u0629 \u062A\u062D\u0630\u064A\u0631\u0627\u062A \u0627\u0644\u0639\u0636\u0648 \u0648\u062A\u0641\u0627\u0635\u064A\u0644\u0647\u0627 \u0648\u0623\u0648\u0642\u0627\u062A\u0647\u0627 \u0648\u0627\u0644\u0645\u0633\u0624\u0648\u0644\u064A\u0646 \u0639\u0646\u0647\u0627",
    shortcuts: ["warnings", "\u062A\u062D\u0630\u064A\u0631\u0627\u062A", "\u0639\u0631\u0636-\u0627\u0644\u062A\u062D\u0630\u064A\u0631\u0627\u062A"],
    usage: "/warnings [user]",
    examples: [
      "/warnings <@!1179133837930938470>"
    ]
  }
];
function getShortcutMatch(text, guildConfig) {
  const normalized = text.toLowerCase().trim();
  let clean = normalized;
  let hasPrefix = false;
  if (/^[!\-#\.\/$]/.test(normalized)) {
    clean = normalized.substring(1).trim();
    hasPrefix = true;
  }
  const matchedComm = botComms.find((c) => {
    const isStaticMatch = c.shortcuts.some((sh) => sh.toLowerCase() === clean || sh.toLowerCase() === normalized);
    if (isStaticMatch) return true;
    if (guildConfig?.commands?.[c.id]?.aliases) {
      const customAliases = guildConfig.commands[c.id].aliases || [];
      return customAliases.some((sh) => sh.toLowerCase() === clean || sh.toLowerCase() === normalized);
    }
    return false;
  });
  return { matchedComm, clean, hasPrefix };
}
function sendCommandHelpEmbed(message, c, guildConfig) {
  const allShortcuts = [...c.shortcuts, ...guildConfig?.commands?.[c.id]?.aliases || []];
  const shortcutsStr = allShortcuts.map((sh) => `\`${sh}\``).join(" \u060C ");
  const exEmoji = {
    timeout: "\u23F3",
    untimeout: "\u{1F50A}",
    role: "\u{1F3F7}\uFE0F",
    ban: "\u{1F528}",
    unban: "\u{1F513}",
    hide: "\u{1F441}\uFE0F\u200D\u{1F5E8}\uFE0F",
    lock: "\u{1F512}",
    unlock: "\u{1F513}",
    warn: "\u26A0\uFE0F",
    unwarn: "\u2728",
    warnings: "\u{1F4CB}"
  };
  const emoji = exEmoji[c.id] || "\u2699\uFE0F";
  const embed = new EmbedBuilder().setTitle(`${emoji} \u0627\u0644\u0623\u0645\u0631: ${c.englishName} | ${c.arabicName}`).setDescription(`**\u0627\u0644\u0634\u0631\u062D:**
> ${c.description}

-#  ~~                                                                                                                                                                   ~~
**\u0627\u0644\u0623\u062E\u062A\u0635\u0627\u0631\u0627\u062A:**
${shortcutsStr}

-#  ~~                                                                                                                                                                   ~~
**\u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645:**
\`\`\`
${c.usage}
\`\`\`

-#  ~~                                                                                                                                                                   ~~
**\u0623\u0645\u062B\u0644\u0647 \u0644\u0644\u0623\u0645\u0631:**
${c.examples.join("\n")}`).setColor("#3498DB");
  if (message.guild) {
    const iconUrl = message.guild.iconURL({ size: 1024 });
    if (iconUrl) {
      embed.setThumbnail(iconUrl);
    }
  }
  return message.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false }
  }).catch(() => null);
}
function parseDuration(durationStr) {
  if (!durationStr) return 10 * 60 * 1e3;
  const num = parseInt(durationStr, 10);
  if (isNaN(num)) return 10 * 60 * 1e3;
  const unit = durationStr.replace(String(num), "").toLowerCase().trim();
  if (unit === "d" || unit === "y" || unit === "day" || unit === "days") return num * 24 * 60 * 60 * 1e3;
  if (unit === "h" || unit === "hour" || unit === "hours") return num * 60 * 60 * 1e3;
  if (unit === "m" || unit === "min" || unit === "mins" || unit === "minute" || unit === "minutes") return num * 60 * 1e3;
  if (unit === "s" || unit === "sec" || unit === "secs" || unit === "second" || unit === "seconds") return num * 1e3;
  return num * 60 * 1e3;
}
async function runModAction(actionId, guild, channel, executor, targetId, args, replyTarget, isSlash) {
  const config = guildConfigs.get(guild.id) || {};
  try {
    switch (actionId) {
      case "timeout": {
        if (!targetId) {
          return replyTarget.reply({ content: "\u26A0\uFE0F \u064A\u062C\u0628 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0639\u0636\u0648 \u0644\u0644\u062A\u0637\u0628\u064A\u0642 \u0639\u0644\u064A\u0647.", ephemeral: true }).catch(() => null);
        }
        const member = await guild.members.fetch(targetId).catch(() => null);
        if (!member) {
          return replyTarget.reply({ content: "\u26A0\uFE0F \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0639\u0636\u0648 \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631.", ephemeral: true }).catch(() => null);
        }
        const isOwner = guild.ownerId === executor.id;
        if (!isOwner && member.roles.highest.position >= executor.roles.highest.position) {
          return replyTarget.reply({ content: `**\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0639\u0637\u0627\u0621 \u0648\u0642\u062A \u0645\u0633\u062A\u0642\u0637\u0639 \u0644\u0640<@${targetId}>\u{1F644}.**`, ephemeral: true }).catch(() => null);
        }
        if (member.id === guild.ownerId) {
          return replyTarget.reply({ content: "\u274C \u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u062A\u0637\u0628\u064A\u0642 \u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621 \u0639\u0644\u0649 \u0645\u0627\u0644\u0643 \u0627\u0644\u0633\u064A\u0631\u0641\u0631.", ephemeral: true }).catch(() => null);
        }
        let durationStr = args[0] || "";
        let reason = args.slice(1).join(" ") || "\u062A\u0645 \u0627\u0644\u0643\u062A\u0645 \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629";
        let ms = 10 * 60 * 1e3;
        if (durationStr) {
          if (/^\d+[dmhs]$/i.test(durationStr) || /^\d+$/.test(durationStr)) {
            ms = parseDuration(durationStr);
          } else {
            reason = args.join(" ");
          }
        }
        await member.timeout(ms, reason);
        const textReply = `**\u0644\u0642\u062F \u062A\u0645 \u0625\u0639\u0637\u0627\u0621 *\u0648\u0642\u062A \u0645\u0633\u062A\u0642\u0637\u0639* \u0644\u0640<@${targetId}> <:Timeout1:1508405017173037056>**`;
        if (isSlash) {
          await replyTarget.reply({ content: textReply }).catch(() => null);
        } else {
          await replyTarget.reply({ content: textReply, allowedMentions: { repliedUser: false } }).catch(() => null);
        }
        break;
      }
      case "untimeout": {
        if (!targetId) {
          return replyTarget.reply({ content: "\u26A0\uFE0F \u064A\u062C\u0628 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0639\u0636\u0648 \u0644\u0644\u062A\u0637\u0628\u064A\u0642 \u0639\u0644\u064A\u0647.", ephemeral: true }).catch(() => null);
        }
        const member = await guild.members.fetch(targetId).catch(() => null);
        if (!member) {
          return replyTarget.reply({ content: "\u26A0\uFE0F \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0639\u0636\u0648 \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631.", ephemeral: true }).catch(() => null);
        }
        const isOwner = guild.ownerId === executor.id;
        if (!isOwner && member.roles.highest.position >= executor.roles.highest.position) {
          return replyTarget.reply({ content: `**\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0639\u0637\u0627\u0621 \u0648\u0642\u062A \u0645\u0633\u062A\u0642\u0637\u0639 \u0644\u0640<@${targetId}>\u{1F644}.**`, ephemeral: true }).catch(() => null);
        }
        await member.timeout(null, "\u0625\u0632\u0627\u0644\u0629 \u0643\u062A\u0645 \u0627\u0644\u062A\u0627\u064A\u0645 \u0623\u0648\u062A");
        const textReply = `**\u0644\u0642\u062F \u062A\u0645 \u0625\u0632\u0627\u0644\u0629 *\u0648\u0642\u062A \u0645\u0633\u062A\u0642\u0637\u0639* \u0644\u0640<@${targetId}> <:Timeout1:1508405017173037056>**`;
        if (isSlash) {
          await replyTarget.reply({ content: textReply }).catch(() => null);
        } else {
          await replyTarget.reply({ content: textReply, allowedMentions: { repliedUser: false } }).catch(() => null);
        }
        break;
      }
      case "role": {
        if (!targetId) {
          return replyTarget.reply({ content: "\u26A0\uFE0F \u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645: `!role @\u0627\u0644\u0639\u0636\u0648 @\u0627\u0644\u0631\u062A\u0628\u0629`", ephemeral: true }).catch(() => null);
        }
        const member = await guild.members.fetch(targetId).catch(() => null);
        if (!member) {
          return replyTarget.reply({ content: "\u26A0\uFE0F \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0639\u0636\u0648 \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631.", ephemeral: true }).catch(() => null);
        }
        let targetRole = null;
        if (isSlash) {
          targetRole = replyTarget.options.getRole("role");
        } else {
          targetRole = replyTarget.mentions.roles.first();
          if (!targetRole) {
            const roleIdentifier = args.filter((a) => !a.includes(targetId) && !a.match(/<@!?\d+>/)).join(" ");
            const roleIdMatch = roleIdentifier.match(/\d{17,20}/)?.[0];
            
            targetRole = guild.roles.cache.get(roleIdMatch || roleIdentifier) ||
              guild.roles.cache.find((r) => r.name.toLowerCase() === roleIdentifier.toLowerCase()) ||
              guild.roles.cache.find((r) => r.name.toLowerCase().includes(roleIdentifier.toLowerCase()));
          }
        }
        if (!targetRole) {
          return replyTarget.reply({ content: "\u26A0\uFE0F \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0631\u062A\u0628\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629.", ephemeral: true }).catch(() => null);
        }
        const isOwner = guild.ownerId === executor.id;
        if (!isOwner && member.roles.highest.position >= executor.roles.highest.position) {
          return replyTarget.reply({ content: `**\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0639\u0637\u0627\u0621 \u0648\u0642\u062A \u0645\u0633\u062A\u0642\u0637\u0639 \u0644\u0640<@${targetId}>\u{1F644}.**`, ephemeral: true }).catch(() => null);
        }
        if (!isOwner && targetRole.position >= executor.roles.highest.position) {
          return replyTarget.reply({ content: `**\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0639\u0637\u0627\u0621 \u0648\u0642\u062A \u0645\u0633\u062A\u0642\u0637\u0639 \u0644\u0640<@${targetId}>\u{1F644}.**`, ephemeral: true }).catch(() => null);
        }
        const hasRole = member.roles.cache.has(targetRole.id);
        const embed = new EmbedBuilder();
        if (hasRole) {
          await member.roles.remove(targetRole.id);
          embed.setDescription(`**\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0631\u0648\u0644\u0627\u062A \u0644\u0640<@${targetId}> - <@&${targetRole.id}> <:Role:1508405188338258061> **`).setColor(13840175);
        } else {
          await member.roles.add(targetRole.id);
          embed.setDescription(`**\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0631\u0648\u0644\u0627\u062A \u0644\u0640<@${targetId}> + <@&${targetRole.id}> <:Role:1508405188338258061> **`).setColor(3046706);
        }
        if (isSlash) {
          await replyTarget.reply({ embeds: [embed] }).catch(() => null);
        } else {
          await replyTarget.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => null);
        }
        break;
      }
      case "ban": {
        if (!targetId) {
          return replyTarget.reply({ content: "\u26A0\uFE0F \u064A\u062C\u0628 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u062D\u0638\u0631\u0647.", ephemeral: true }).catch(() => null);
        }
        const member = await guild.members.fetch(targetId).catch(() => null);
        if (member) {
          const isOwner = guild.ownerId === executor.id;
          if (!isOwner && member.roles.highest.position >= executor.roles.highest.position) {
            return replyTarget.reply({ content: `**\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0639\u0637\u0627\u0621 \u0648\u0642\u062A \u0645\u0633\u062A\u0642\u0637\u0639 \u0644\u0640<@${targetId}>\u{1F644}.**`, ephemeral: true }).catch(() => null);
          }
          if (member.id === guild.ownerId) {
            return replyTarget.reply({ content: `**\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0639\u0637\u0627\u0621 \u0648\u0642\u062A \u0645\u0633\u062A\u0642\u0637\u0639 \u0644\u0640<@${targetId}>\u{1F644}.**`, ephemeral: true }).catch(() => null);
          }
        }
        const reason = args.join(" ") || "\u062A\u0645 \u0627\u0644\u062D\u0638\u0631 \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629";
        await guild.members.ban(targetId, { reason }).catch((err) => {
          console.error("Ban API failed:", err);
        });
        const replyTxt = `**\u062A\u0645 \u062D\u0638\u0631 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 <@${targetId}> \u0645\u0646 \u0627\u0644\u0633\u064A\u0631\u0641\u0631<:Ban:1508405013561741402>**`;
        if (isSlash) {
          await replyTarget.reply({ content: replyTxt }).catch(() => null);
        } else {
          await replyTarget.reply({ content: replyTxt, allowedMentions: { repliedUser: false } }).catch(() => null);
        }
        break;
      }
      case "unban": {
        if (!targetId) {
          return replyTarget.reply({ content: "\u26A0\uFE0F \u064A\u062C\u0628 \u062A\u062D\u062F\u064A\u062F \u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0636\u0648 (ID) \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0625\u0644\u063A\u0627\u0621 \u062D\u0638\u0631\u0647.", ephemeral: true }).catch(() => null);
        }
        await guild.members.unban(targetId).catch((err) => {
          console.error("Unban API failed:", err);
        });
        const replyTxt = `**\u062A\u0645 \u0641\u0643 \u062D\u0638\u0631 <@${targetId}> <:Ban:1508405013561741402>**`;
        if (isSlash) {
          await replyTarget.reply({ content: replyTxt }).catch(() => null);
        } else {
          await replyTarget.reply({ content: replyTxt, allowedMentions: { repliedUser: false } }).catch(() => null);
        }
        break;
      }
      case "hide": {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          ViewChannel: false
        });
        const replyTxt = `**\u062A\u0645 \u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0631\u0648\u0645 \u0639\u0646 \u0627\u0644\u062C\u0645\u064A\u0639 \u0628\u0646\u062C\u0627\u062D <:Hashtag:1503025347254554704>**`;
        if (isSlash) {
          await replyTarget.reply({ content: replyTxt }).catch(() => null);
        } else {
          await replyTarget.reply({ content: replyTxt, allowedMentions: { repliedUser: false } }).catch(() => null);
        }
        break;
      }
      case "lock": {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: false,
          CreatePublicThreads: false,
          CreatePrivateThreads: false,
          SendMessagesInThreads: false
        });
        const replyTxt = `**\u062A\u0645 \u0642\u0641\u0644 \u0627\u0644\u0631\u0648\u0645 \u0628\u0646\u062C\u0627\u062D<:lock:1508473927347736726>**`;
        if (isSlash) {
          await replyTarget.reply({ content: replyTxt }).catch(() => null);
        } else {
          await replyTarget.reply({ content: replyTxt, allowedMentions: { repliedUser: false } }).catch(() => null);
        }
        break;
      }
      case "unlock": {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: null,
          CreatePublicThreads: null,
          CreatePrivateThreads: null,
          SendMessagesInThreads: null
        });
        const replyTxt = `**\u062A\u0645 \u0641\u062A\u062D \u0627\u0644\u0631\u0648\u0645 \u0628\u0646\u062C\u0627\u062D<:unlock:1508473929813987369>**`;
        if (isSlash) {
          await replyTarget.reply({ content: replyTxt }).catch(() => null);
        } else {
          await replyTarget.reply({ content: replyTxt, allowedMentions: { repliedUser: false } }).catch(() => null);
        }
        break;
      }
      case "warn": {
        if (!targetId) {
          return replyTarget.reply({ content: "\u26A0\uFE0F \u064A\u062C\u0628 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u0631\u0627\u062F \u062A\u062D\u0630\u064A\u0631\u0647.", ephemeral: true }).catch(() => null);
        }
        const member = await guild.members.fetch(targetId).catch(() => null);
        if (!member) {
          return replyTarget.reply({ content: "\u26A0\uFE0F \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0639\u0636\u0648 \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631.", ephemeral: true }).catch(() => null);
        }
        const isOwner = guild.ownerId === executor.id;
        if (!isOwner && member.roles.highest.position >= executor.roles.highest.position) {
          return replyTarget.reply({ content: `**\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0639\u0637\u0627\u0621 \u0648\u0642\u062A \u0645\u0633\u062A\u0642\u0637\u0639 \u0644\u0640<@${targetId}>\u{1F644}.**`, ephemeral: true }).catch(() => null);
        }
        const reason = args.join(" ") || "\u0644\u0627 \u064A\u0648\u062C\u062F \u0633\u0628\u0628";
        if (!config.warnings) config.warnings = {};
        if (!config.warnings[targetId]) config.warnings[targetId] = [];
        const warnObj = {
          id: crypto.randomUUID().substring(0, 8),
          timestamp: Date.now(),
          moderatorId: executor.id,
          reason
        };
        config.warnings[targetId].push(warnObj);
        saveConfigs(guild.id);
        const replyTxt = `**\u062A\u0645 \u062A\u062D\u0630\u064A\u0631 <@${targetId}> <:warn:1508476358219661322>**`;
        if (isSlash) {
          await replyTarget.reply({ content: replyTxt }).catch(() => null);
        } else {
          await replyTarget.reply({ content: replyTxt, allowedMentions: { repliedUser: false } }).catch(() => null);
        }
        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1e3;
        const activeWarns = config.warnings[targetId].filter((w) => w.timestamp >= threeDaysAgo);
        const count = activeWarns.length;
        if (count >= 2) {
          let mins = 10;
          if (count === 2) mins = 10;
          else if (count === 3) mins = 30;
          else if (count === 4) mins = 60;
          else mins = (count - 3) * 60;
          const msTimeout = mins * 60 * 1e3;
          await member.timeout(msTimeout, `\u062A\u0644\u0642\u064A \u0639\u062F\u062F ${count} \u062A\u062D\u0630\u064A\u0631\u0627\u062A \u0645\u062A\u062A\u0627\u0644\u064A\u0629 \u062E\u0644\u0627\u0644 3 \u0623\u064A\u0627\u0645`).catch(() => null);
          let durationLabel = `${mins} \u062F\u0642\u064A\u0642\u0629`;
          if (mins >= 60) {
            durationLabel = `${Math.floor(mins / 60)} \u0633\u0627\u0639\u0629`;
          }
          const escalationTxt = `**\u0644\u0642\u062F \u062A\u0645 \u0625\u0639\u0637\u0627\u0621 *\u0648\u0642\u062A \u0645\u0633\u062A\u0642\u0637\u0639* \u0644\u0640<@${targetId}> \u0644\u0645\u062F\u0629 ${durationLabel} \u0644\u062A\u0631\u0627\u0643\u0645 \u0627\u0644\u062A\u062D\u0630\u064A\u0631\u0627\u062A <:Timeout1:1508405017173037056>**`;
          await channel.send({ content: escalationTxt }).catch(() => null);
        }
        break;
      }
      case "unwarn": {
        if (!targetId) {
          return replyTarget.reply({ content: "\u26A0\uFE0F \u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645: `!unwarn @\u0627\u0644\u0639\u0636\u0648 [\u0631\u0642\u0645 \u0627\u0644\u062A\u062D\u0630\u064A\u0631]`", ephemeral: true }).catch(() => null);
        }
        const member = await guild.members.fetch(targetId).catch(() => null);
        if (member) {
          const isOwner = guild.ownerId === executor.id;
          if (!isOwner && member.roles.highest.position >= executor.roles.highest.position) {
            return replyTarget.reply({ content: `**\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0639\u0637\u0627\u0621 \u0648\u0642\u062A \u0645\u0633\u062A\u0642\u0637\u0639 \u0644\u0640<@${targetId}>\u{1F644}.**`, ephemeral: true }).catch(() => null);
          }
        }
        if (!config.warnings || !config.warnings[targetId] || config.warnings[targetId].length === 0) {
          return replyTarget.reply({ content: "\u26A0\uFE0F \u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u062D\u0630\u064A\u0631\u0627\u062A \u0644\u0639\u0631\u0636\u0647\u0627 \u0623\u0648 \u0625\u0632\u0627\u0644\u062A\u0647\u0627 \u0639\u0646 \u0647\u0630\u0627 \u0627\u0644\u0639\u0636\u0648.", ephemeral: true }).catch(() => null);
        }
        let num = NaN;
        if (args[0] && !isNaN(parseInt(args[0], 10))) {
          num = parseInt(args[0], 10);
        } else if (args[1] && !isNaN(parseInt(args[1], 10))) {
          num = parseInt(args[1], 10);
        }
        if (isSlash) {
          const slashIdx = replyTarget.options?.getInteger("index");
          if (slashIdx) num = slashIdx;
        }
        let idxToRemove = -1;
        if (!isNaN(num)) {
          idxToRemove = num - 1;
        } else {
          idxToRemove = config.warnings[targetId].length - 1;
        }
        if (idxToRemove < 0 || idxToRemove >= config.warnings[targetId].length) {
          return replyTarget.reply({ content: `\u26A0\uFE0F \u0631\u0642\u0645 \u0627\u0644\u062A\u062D\u0630\u064A\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D. \u0627\u0644\u0639\u0636\u0648 \u0644\u062F\u064A\u0647 \u0641\u0642\u0637 ${config.warnings[targetId].length} \u062A\u062D\u0630\u064A\u0631\u0627\u062A.`, ephemeral: true }).catch(() => null);
        }
        const removed = config.warnings[targetId].splice(idxToRemove, 1)[0];
        saveConfigs(guild.id);
        const replyTxt = `\u2705 **\u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u062A\u062D\u0630\u064A\u0631 \u0631\u0642\u0645 ${idxToRemove + 1} \u0628\u0646\u062C\u0627\u062D (\u0627\u0644\u0633\u0628\u0628: ${removed.reason})**`;
        if (isSlash) {
          await replyTarget.reply({ content: replyTxt }).catch(() => null);
        } else {
          await replyTarget.reply({ content: replyTxt, allowedMentions: { repliedUser: false } }).catch(() => null);
        }
        break;
      }
      case "warnings": {
        if (!targetId) {
          targetId = executor.id;
        }
        const list = config.warnings?.[targetId] || [];
        const userObj = await discordClient.users.fetch(targetId).catch(() => null);
        const embed = new EmbedBuilder().setTitle(`\u{1F4C2} \u062A\u062D\u0630\u064A\u0631\u0627\u062A \u0627\u0644\u0639\u0636\u0648: ${userObj?.tag || targetId}`).setColor(16295968).setTimestamp();
        if (list.length === 0) {
          embed.setDescription(`\u2705 \u0647\u0630\u0627 \u0627\u0644\u0639\u0636\u0648 \u0644\u064A\u0633 \u0644\u062F\u064A\u0647 \u0623\u064A \u062A\u062D\u0630\u064A\u0631\u0627\u062A \u062D\u0627\u0644\u064A\u0629.`);
        } else {
          let desc = `\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062A\u062D\u0630\u064A\u0631\u0627\u062A: **${list.length}**

`;
          list.forEach((w, idx) => {
            const dateStr = `<t:${Math.floor(w.timestamp / 1e3)}:F>`;
            desc += `**#${idx + 1} - \u0628\u0648\u0627\u0633\u0637\u0629 <@${w.moderatorId}>**
\u{1F4C5} \u0627\u0644\u0648\u0642\u062A: ${dateStr}
\u{1F4DD} \u0627\u0644\u0633\u0628\u0628: \`\`\`${w.reason}\`\`\`
`;
          });
          embed.setDescription(desc);
        }
        if (isSlash) {
          await replyTarget.reply({ embeds: [embed] }).catch(() => null);
        } else {
          await replyTarget.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => null);
        }
        break;
      }
      case "slowmode": {
        const isAdmin = executor.permissions.has("Administrator") || executor.permissions.has("ManageChannels");
        if (!isAdmin) {
          const lang = config.language || "ar";
          return await replyTarget.reply({ content: lang === "ar" ? "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631." : "You do not have permission to use this command.", ephemeral: true });
        }
        let seconds = 0;
        if (isSlash) {
          seconds = replyTarget.options.getInteger("seconds") ?? 0;
        } else {
          seconds = parseInt(args[0]) || 0;
        }
        if (channel && "setRateLimitPerUser" in channel) {
          await channel.setRateLimitPerUser(seconds).catch(() => {
          });
          const lang = config.language || "ar";
          const msg = lang === "ar" ? seconds === 0 ? "\u2705 \u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0628\u0637\u064A\u0621." : `\u2705 \u062A\u0645 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0628\u0637\u064A\u0621 \u0628\u0640 ${seconds} \u062B\u0627\u0646\u064A\u0629.` : seconds === 0 ? "\u2705 Slowmode disabled." : `\u2705 Slowmode set to ${seconds} seconds.`;
          if (isSlash) await replyTarget.reply({ content: msg });
          else await replyTarget.reply({ content: msg, allowedMentions: { repliedUser: false } });
        }
        break;
      }
    }
  } catch (err) {
    console.error(`Error executing action ${actionId}:`, err);
    try {
      const isPermissionErr = err.code === 50013 || err.code === 50001 || err.message && (err.message.toLowerCase().includes("permission") || err.message.toLowerCase().includes("privilege") || err.message.toLowerCase().includes("hierarchy") || err.message.toLowerCase().includes("missing access"));
      if (isPermissionErr) {
        await replyTarget.reply({ content: `**\u0644\u064A\u0633 \u0644\u062F\u064A \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0643\u0627\u0641\u064A\u0629\u{1F644}.**`, ephemeral: true }).catch(() => null);
      } else {
        await replyTarget.reply({ content: `\u274C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u0646\u0641\u064A\u0630 \u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621: ${err.message || err}`, ephemeral: true }).catch(() => null);
      }
    } catch {
    }
  }
}
const spamMap = /* @__PURE__ */ new Map();
discordClient.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (!message.guild || message.channel.type === ChannelType.DM) {
    const session = activeDMSubmissions.get(message.author.id);
    if (session) {
      await handleDMApplicationMessage(message, session);
    }
    return;
  }

  if (message.content === "-ارسال" && message.member?.permissions.has("Administrator")) {
    sendAzkar(message.guildId);
    return;
  }

  const config = guildConfigs.get(message.guildId) || {};
  const afkConf = config.afk;
  
  if (afkConf?.enabled) {
    // Check if user is AFK and returns (writing message back)
    if (afkConf.users && afkConf.users[message.author.id]) {
      const userData = afkConf.users[message.author.id];
      const mentions = userData.mentions || [];
      delete afkConf.users[message.author.id];
      guildConfigs.set(message.guildId, { ...config, afk: afkConf });
      saveBotConfigs();
      
      const mentionsCount = mentions.length;
      let description = `You recived ${mentionsCount} mentions\n\n`;
      mentions.forEach((m, i) => {
        const timeAgo = `<t:${Math.floor(m.timestamp / 1000)}:R>`;
        description += `<@${m.authorId}>, ${timeAgo} - [Click to view message](https://discord.com/channels/${message.guildId}/${m.channelId}/${m.messageId})\n`;
        if (i < mentionsCount - 1) description += "-# ~~                                                                                                                                                                   ~~\n";
      });
      
      const welcomeBackEmbed = new EmbedBuilder()
        .setTitle("You recived a message")
        .setDescription(description)
        .setColor(0x5865f2)
        .setAuthor({ name: message.member.displayName, iconURL: message.member.user.displayAvatarURL() });
      await message.reply({ embeds: [welcomeBackEmbed] });
    }

    // Check for AFK mentions
    if (message.mentions.users.size > 0) {
      for (const [userId, user] of message.mentions.users.entries()) {
        if (afkConf.users && afkConf.users[userId]) {
          const userData = afkConf.users[userId];
          if (!userData.mentions) userData.mentions = [];
          userData.mentions.push({ authorId: message.author.id, messageId: message.id, channelId: message.channelId, timestamp: Date.now() });
          guildConfigs.set(message.guildId, { ...config, afk: afkConf });
          saveBotConfigs();
            
          const mentionEmbed = new EmbedBuilder()
            .setDescription(`${user.displayName} is currently **AFK** - <t:${Math.floor(userData.timestamp / 1000)}:R> <:Afk:1513283458372473093>.${userData.reason ? `\nReason: \`\`\`${userData.reason}\`\`\`` : ""}`)
            .setColor(0xed4245);
          await message.channel.send({ embeds: [mentionEmbed] });
        }
      }
    }

    // Command trigger
    if (message.content.startsWith(afkConf.abbreviation || "!afk")) {
      const isChannelAllowed = afkConf.allowedChannels.length === 0 || afkConf.allowedChannels.includes(message.channelId);
      const isRoleAllowed = afkConf.allowedRoles.length === 0 || message.member.roles.cache.some(r => afkConf.allowedRoles.includes(r.id));
      
      if (isChannelAllowed && isRoleAllowed) {
        const reason = message.content.slice((afkConf.abbreviation || "!afk").length).trim();
        if (!afkConf.users) afkConf.users = {};
        afkConf.users[message.author.id] = { reason, timestamp: Date.now(), mentions: [] };
        guildConfigs.set(message.guildId, { ...config, afk: afkConf });
        saveBotConfigs();
        
        const setEmbed = new EmbedBuilder()
            .setAuthor({ name: message.member.displayName, iconURL: message.member.user.displayAvatarURL() })
            .setTitle("AFK set")
            .setDescription(`You are now afk in this server.${reason ? `\nReason: **${reason}**` : ""}`)
            .setColor(0x5865f2);
        await message.reply({ embeds: [setEmbed] });
        return;
      }
    }
  }

  const cleanContent = message.content.trim();
  const lowerContent = cleanContent.toLowerCase();
  const isRateCommand = lowerContent === "$\u062A\u0642\u064A\u064A\u0645" || lowerContent === "$rate" || lowerContent === "$review";
  const isClaimCommand = lowerContent === "$claim" || lowerContent === "$\u0627\u0633\u062A\u0644\u0627\u0645" || lowerContent === "$%D8%A7%D8%B3%D8%AA%D9%84%D8%A7%D9%85" || lowerContent === "$استلام" || lowerContent === "$\u0623\u0633\u062A\u0644\u0627\u0645" || lowerContent === "$%D8%A3%D8%B3%D8%AA%D9%84%D8%A7%D9%85" || lowerContent === "$أستلام";
  const isTicketCommand = lowerContent.startsWith("$close") || lowerContent.startsWith("$rename ") || lowerContent.startsWith("$add ") || lowerContent.startsWith("$remove ") || isRateCommand || isClaimCommand;
  if (isTicketCommand && message.guild) {
    let chan = message.channel;
    if (chan.id && (!chan.topic || chan.topic.trim().length === 0)) {
      try {
        const fetched = await message.guild.channels.fetch(chan.id).catch(() => null);
        if (fetched) {
          chan = fetched;
        }
      } catch (e) {
        console.error("Failed to fetch channel to read topic:", e);
      }
    }
    if (chan.topic?.includes("TicketOwner:")) {
      const topic = chan.topic || "";
      const metadata = {};
      topic.split("|").forEach((p) => {
        const [k, v] = p.split(":");
        if (k && v) metadata[k.trim()] = v.trim();
      });
      const config2 = guildConfigs.get(message.guildId) || {};
      const isOwner = message.author.id === metadata.TicketOwner;
      const isClaimer = message.author.id === metadata.Claimer;
      const isStaff = metadata.StaffRoles?.split(",").some((rid) => message.member?.roles.cache.has(rid)) || message.member?.permissions.has(PermissionFlagsBits.Administrator);
      if (isClaimCommand) {
        if (!isStaff) {
          await message.reply({ content: "**\u0644\u0627 \u064A\u0645\u0643\u0646 \u0644\u0623\u062D\u062F \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0625\u0644\u0627 \u0641\u0631\u064A\u0642 \u0627\u0644\u062F\u0639\u0645.**" }).then((m) => setTimeout(() => m.delete().catch(() => null), 5e3));
          return;
        }
        if (isOwner) {
          await message.reply({ content: "**عذراً، لا يمكن لصاحب التذكرة استلامها حتى لو كان من الدعم!**" }).then((m) => setTimeout(() => m.delete().catch(() => null), 5e3));
          return;
        }
        if (metadata.Claimer) {
          await message.reply({ content: `**هذه التذكرة مستلمة بالفعل بواسطة <@${metadata.Claimer}>**` }).then((m) => setTimeout(() => m.delete().catch(() => null), 5e3));
          return;
        }

        metadata.Claimer = message.author.id;
        const newTopic = Object.entries(metadata).map(([k, v]) => `${k}:${v}`).join("|");
        await message.channel.setTopic(newTopic).catch(() => {});

        const claimEmbed = new EmbedBuilder()
          .setDescription(`**\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 <@${message.author.id}><:Take:1503025317004968016>**`)
          .setColor(5793266);
        await message.channel.send({ embeds: [claimEmbed] }).catch(() => {});

        try {
          const botMessages = await message.channel.messages.fetch({ limit: 50 }).catch(() => null);
          if (botMessages) {
            const controlMsg = botMessages.find(m => m.author.id === discordClient.user.id && m.components?.some(row => row.components?.some(c => c.customId === "ticket_control_select")));
            if (controlMsg) {
              const oldRow = controlMsg.components[0];
              if (oldRow) {
                const select = StringSelectMenuBuilder.from(oldRow.components[0]);
                const options = select.options.map((opt) => {
                  const data = opt.data;
                  if (data.value === "ticket_claim") {
                    return { ...data, label: `Claimed by ${message.author.username}`, default: false };
                  }
                  return data;
                });
                select.setOptions(options);
                await controlMsg.edit({ components: [new ActionRowBuilder().addComponents(select)] }).catch(() => {});
              }
            }
          }
        } catch (e) {
          console.error("Error updating claim select from text command:", e);
        }
        return;
      }
      if (isRateCommand) {
        if (!isStaff && !isClaimer) {
          await message.reply({ content: "\u0644\u0627\u064A\u0645\u0643\u0646 \u0644\u0623\u062D\u062F \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0627\u0644\u0627 \u0627\u0644\u0645\u0633\u062A\u0644\u0645 \u0627\u0648 \u0641\u0631\u064A\u0642 \u0627\u0644\u062F\u0639\u0645." }).then((m) => setTimeout(() => m.delete().catch(() => null), 5e3));
          return;
        }
        if (isOwner) {
          await message.reply({ content: "**\u0639\u0630\u0631\u0627\u064B\u060C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0645\u063E\u0635\u0635 \u0644\u0645\u0633\u062A\u0644\u0645 \u0644\u064A\u0637\u0644\u0628 \u062A\u0642\u064A\u064A\u0645\u0643!**" }).then((m) => setTimeout(() => m.delete().catch(() => null), 5e3));
          return;
        }
        if (!metadata.Claimer) {
          await message.reply({ content: "**\u0639\u0630\u0631\u0627\u064B\u060C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0645\u0646 \u0642\u0628\u0644 \u0623\u064A \u0634\u062E\u0635 \u274C**" }).then((m) => setTimeout(() => m.delete().catch(() => null), 5e3));
          return;
        }
        if (metadata.Rated === "true" || ratedTickets.has(message.channelId)) {
          return await message.reply("\u0647\u0630\u0627 \u0627\u0644\u062A\u0643\u062E \u062A\u0645 \u062A\u0642\u064A\u064A\u0645\u0647 \u0628\u0627\u0641\u0639\u0644.").catch(() => {
          });
        }
        const isBrokerTicket = topic.includes("BrokerPanel:");
        const evaluationChannelId = metadata.EvaluationChannelId || config2.tickets?.evaluationChannelId;
        reviewerData.set(message.channelId, {
          rating: "",
          targetChannelId: evaluationChannelId || "",
          brokerId: metadata.Claimer || message.author.id,
          commodity: metadata.Commodity || "\u062F\u0639\u0645 \u0641\u0646\u064A"
        });
        const embed = new EmbedBuilder().setDescription("**\u064A\u0631\u062C\u0649 \u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0645\u0633\u062A\u0644\u0645 \u0628\u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0623\u062F\u0646\u0627\u0647 \u0627\u0644\u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0645\u0646\u0627\u0633\u0628 \u0644\u0643**").setColor(5793266);
        const select = new StringSelectMenuBuilder().setCustomId(isBrokerTicket ? "broker_rate_select" : "ticket_rate_select").setPlaceholder("\u0627\u062E\u062A\u0631 \u0627\u0644\u062A\u0642\u064A\u064A\u0645...");
        if (isBrokerTicket) {
          select.addOptions([
            { label: "\u0645\u0628\u062A\u062F\u0626", value: "\u0645\u0628\u062A\u062F\u0626", emoji: "\u2B50" },
            { label: "\u0645\u062A\u0648\u0633\u0637", value: "\u0645\u062A\u0648\u0633\u0637", emoji: "\u2B50\u2B50" },
            { label: "\u062C\u064A\u062F", value: "\u062C\u064A\u062F", emoji: "\u2B50\u2B50\u2B50" },
            { label: "\u062C\u064A\u062F \u062C\u062F\u0627\u064B", value: "\u062C\u064A\u062F \u062C\u062F\u0627\u064B", emoji: "\u2B50\u2B50\u2B50\u2B50" },
            { label: "\u0627\u0633\u0637\u0648\u0631\u064A", value: "\u0627\u0633\u0637\u0648\u0631\u064A", emoji: "\u{1F525}" }
          ]);
        } else {
          select.addOptions(
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => ({
              label: `\u062A\u0642\u064A\u064A\u0645: ${r}`,
              value: r.toString()
            }))
          );
        }
        await message.channel.send({ content: `<@${metadata.TicketOwner}>`, embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] }).catch(() => {
        });
        return;
      }
      if (isOwner || isClaimer || isStaff) {
        if (lowerContent.startsWith("$close")) {
          const args2 = cleanContent.slice("$close".length).trim();
          const reason = args2 || "\u062A\u0645 \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0628\u0623\u0645\u0631 \u0643\u062A\u0627\u0628\u064A";
          const statusMsg = await message.reply("**\u062C\u0627\u0631\u064A \u0645\u0639\u0627\u0644\u062C\u0629 \u0637\u0644\u0628 \u0627\u0644\u062D\u0630\u0641 \u0648\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0633\u062C\u0644... <a:Reload:1503390770491818088> **");
          const channel = message.channel;
          try {
            const fileName = await generateTranscript(channel).catch(() => null);
            await logBrokerEvaluationOnClose(message.guild, channel, metadata, fileName, message.author.id);
            const createdAt = metadata.CreatedAt ? parseInt(metadata.CreatedAt) : Date.now();
            const closedAt = Date.now();
            const openerId = metadata.TicketOwner;
            const closerId = message.author.id;
            const guildId = message.guild.id;
            const dmEmbed = new EmbedBuilder().setTitle("**\u062A\u0641\u0627\u0635\u064A\u0644 \u063A\u0644\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629**").setDescription(`
> \u062A\u0645 \u0641\u062A\u062D \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 <:Ticketopened:1504561972098895972> :
- <@${openerId || "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}>
> \u062A\u0645 \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 <:Ticketclosed:1504561975533768734> : 
- <@${closerId}>
> \u0648\u0642\u062A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 <:Timereal:1504562010459738223> :
- <t:${Math.floor(createdAt / 1e3)}:F>
> \u0648\u0642\u062A \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 <:Timereal:1504562010459738223> :
- <t:${Math.floor(closedAt / 1e3)}:F>
> \u0633\u0628\u0628 \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 <:Reason:1504600051073155165> :
\`\`\` ${reason} \`\`\`
             `).setColor(5793266).setThumbnail(message.guild.iconURL({ size: 1024 }) || "https://cdn.discordapp.com/embed/avatars/0.png");
            const appUrl = process.env.APP_URL || "https://localhost";
            const dmRowComponents = [];
            if (fileName) {
              dmRowComponents.push(
                new ButtonBuilder().setLabel("\u0639\u0631\u0636 \u0633\u062C\u0644 \u0627\u0644\u062A\u0630\u0643\u0631\u0629").setEmoji("1504600815158169734").setURL(`${appUrl}/transcripts/${fileName}`).setStyle(ButtonStyle.Link)
              );
            }
            dmRowComponents.push(
              new ButtonBuilder().setCustomId(`view_profile_${closerId}_${guildId}`).setLabel("\u0639\u0631\u0636 \u0628\u0631\u0648\u0641\u0627\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0644\u0645").setEmoji("1504602083377287230").setStyle(ButtonStyle.Secondary)
            );
            const dmRow = new ActionRowBuilder().addComponents(dmRowComponents);
            if (openerId && typeof openerId === "string" && openerId.trim().length > 0) {
              const opener = await message.guild.members.fetch(openerId).catch(() => null);
              if (opener) {
                await opener.send({ embeds: [dmEmbed], components: [dmRow] }).catch(() => {
                });
              }
            }
          } catch (err) {
            console.error("Error generating transcript or sending DM in text command:", err);
          }
          const config3 = guildConfigs.get(message.guild.id) || {};
          if (config3.tickets && config3.tickets.activeTickets) {
            config3.tickets.activeTickets = config3.tickets.activeTickets.filter((id) => id !== channel.id);
            guildConfigs.set(message.guild.id, config3);
            saveConfigs();
          }
          await statusMsg.edit(`**\u0633\u064A\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u062E\u0644\u0627\u0644 5 \u062B\u0648\u0627\u0646\u064A**
**\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0646\u0633\u062E\u0629 \u0645\u0646 \u0627\u0644\u0633\u062C\u0644 \u0625\u0644\u0649 \u0635\u0627\u062D\u0628 \u0627\u0644\u062A\u0630\u0643\u0631\u0629.**`).catch(() => {
          });
          setTimeout(() => {
            if (channel && typeof channel.delete === "function") {
              channel.delete().catch((e) => console.error("Failed to delete channel via text command:", e));
            }
          }, 5e3);
          return;
        }
        if (lowerContent.startsWith("$rename ")) {
          const newName = cleanContent.slice("$rename ".length).trim().replace(/ /g, "\u2800");
          if (!newName) {
            await message.reply("**\u0627\u0644\u0631\u062C\u0627\u0621 \u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u062C\u062F\u064A\u062F!**");
            return;
          }
          await message.reply(`**Done changed name to ${newName}**`).catch(() => {
          });
          await message.channel.setName(newName).catch(() => {
          });
          return;
        }
        if (lowerContent.startsWith("$add ")) {
          const arg = cleanContent.slice("$add ".length).trim();
          const targets = message.mentions.members;
          const addedNames = [];
          if (targets && targets.size > 0) {
            for (const [id, member] of targets) {
              await message.channel.permissionOverwrites.edit(id, { ViewChannel: true, SendMessages: true }).catch(() => {
              });
              addedNames.push(`<@${id}>`);
            }
          } else {
            const member = await message.guild.members.fetch(arg).catch(() => null);
            if (member) {
              await message.channel.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true }).catch(() => {
              });
              addedNames.push(`<@${member.id}>`);
            }
          }
          if (addedNames.length > 0) {
            await message.reply(`**Added/Updated ${addedNames.join(", ")}**`);
          } else {
            await message.reply("**\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u0631\u0627\u062F \u0625\u0636\u0627\u0641\u062A\u0647! \u064A\u0631\u062C\u0649 \u0639\u0645\u0644 \u0645\u0646\u0634\u0646 \u0644\u0644\u0639\u0636\u0648 \u0623\u0648 \u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u0623\u064A\u062F\u064A \u0627\u0644\u062E\u0627\u0635 \u0628\u0647.**");
          }
          return;
        }
        if (lowerContent.startsWith("$remove ")) {
          const arg = cleanContent.slice("$remove ".length).trim();
          const targets = message.mentions.members;
          const removedNames = [];
          if (targets && targets.size > 0) {
            for (const [id, member] of targets) {
              await message.channel.permissionOverwrites.delete(id).catch(() => {
              });
              removedNames.push(`<@${id}>`);
            }
          } else {
            const member = await message.guild.members.fetch(arg).catch(() => null);
            if (member) {
              await message.channel.permissionOverwrites.delete(member.id).catch(() => {
              });
              removedNames.push(`<@${member.id}>`);
            }
          }
          if (removedNames.length > 0) {
            await message.reply(`**Removed ${removedNames.join(", ")}**`);
          } else {
            await message.reply("**\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u0631\u0627\u062F \u0625\u0632\u0627\u0644\u062A\u0647! \u064A\u0631\u062C\u0649 \u0639\u0645\u0644 \u0645\u0646\u0634\u0646 \u0644\u0644\u0639\u0636\u0648 \u0623\u0648 \u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u0623\u064A\u062F\u064A \u0627\u0644\u062E\u0627\u0635 \u0628\u0647.**");
          }
          return;
        }
      } else {
        await message.reply("**\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u062A\u0646\u0641\u064A\u0630 \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0627\u0644\u0639\u0636\u0648\u064A \u062F\u0627\u062E\u0644 \u0627\u0644\u062A\u0643\u062A!**").catch(() => {
        });
        return;
      }
    }
  }
    const guildId = message.guild?.id;
    let guildConfig = guildId ? guildConfigs.get(String(guildId)) : null;
    if (!guildConfig && guildId) {
      guildConfig = {};
    }
    if (message.guild && guildConfig) {
      const imageChannels = guildConfig.autoFeatures?.imageChannels || [];
      if (imageChannels.includes(message.channel.id)) {
        const hasImage = message.attachments.some((a) => {
          const mimeMatches = a.contentType?.startsWith("image/");
          const extMatches = /\.(png|jpe?g|gif|webp|bmp)$/i.test(a.name || "");
          return mimeMatches || extMatches || a.width !== null;
        }) || message.embeds.some((e) => e.image || e.thumbnail);
        if (!hasImage) {
          await message.delete().catch(() => {
          });
          return;
        } else {
          await message.react("\u{1F5BC}\uFE0F").catch(() => {
          });
        }
      }
      const autolines = guildConfig.autoFeatures?.autolines || [];
      const matchedLine = autolines.find((l) => l.channelId === message.channel.id);
      if (matchedLine && matchedLine.lineUrl) {
        try {
          if (matchedLine.lineUrl.startsWith("data:image")) {
            const base64Data = matchedLine.lineUrl.split(";base64,").pop();
            await message.channel.send({
              files: [new AttachmentBuilder(Buffer.from(base64Data, "base64"), { name: "line.png" })]
            });
          } else if (matchedLine.lineUrl.includes("/uploads/")) {
            const uploadsIdx = matchedLine.lineUrl.indexOf("/uploads/");
            const filename = matchedLine.lineUrl.substring(uploadsIdx + "/uploads/".length);
            const localPath = path.join(process.cwd(), "uploads", filename);
            if (fs.existsSync(localPath)) {
              await message.channel.send({
                files: [new AttachmentBuilder(localPath, { name: "line.png" })]
              });
            } else {
              await message.channel.send({
                files: [new AttachmentBuilder(matchedLine.lineUrl, { name: "line.png" })]
              });
            }
          } else {
            await message.channel.send({
              files: [new AttachmentBuilder(matchedLine.lineUrl, { name: "line.png" })]
            });
          }
        } catch (err) {
          console.error("Failed to send automatic line decoration:", err);
        }
      }
      const autoReplies = guildConfig.autoReplies || [];
      if (autoReplies.length > 0) {
        const msgClean = message.content.trim().toLowerCase();
        const matchedReply = autoReplies.find((r) => {
          if (!r.trigger) return false;
          if (r.allowedRoles && Array.isArray(r.allowedRoles)) {
            const validRoles = r.allowedRoles.filter((rid) => rid && rid.trim() !== "");
            if (validRoles.length > 0) {
              const memberRoles = message.member?.roles.cache;
              if (!memberRoles) return false;
              const hasRole = validRoles.some((roleId) => memberRoles.has(roleId));
              if (!hasRole) return false;
            }
          }
          if (r.allowedChannels && Array.isArray(r.allowedChannels)) {
            const validChannels = r.allowedChannels.filter((cid) => cid && cid.trim() !== "");
            if (validChannels.length > 0) {
              const isAllowedChannel = validChannels.includes(message.channel.id);
              const parentId = message.channel.parentId || message.channel.parent?.id;
              const isAllowedCategory = parentId ? validChannels.includes(parentId) : false;
              if (!isAllowedChannel && !isAllowedCategory) return false;
            }
          }
          const triggerClean = r.trigger.trim().toLowerCase();
          return r.matchType ? r.matchType === "exact" ? msgClean === triggerClean : msgClean.includes(triggerClean) : msgClean === triggerClean || msgClean.includes(triggerClean);
        });
        if (matchedReply) {
          try {
            const isEmbed = !!matchedReply.isEmbed || matchedReply.replyType === "embed";
            if (isEmbed) {
              const embed = new EmbedBuilder().setDescription(matchedReply.replyText || " ").setColor(matchedReply.embedColor ? parseInt(matchedReply.embedColor.replace("#", ""), 16) || 5195493 : matchedReply.color ? parseInt(matchedReply.color.replace("#", ""), 16) || 5195493 : 5195493);
              const title = matchedReply.embedTitle || matchedReply.title;
              if (title) embed.setTitle(title);
              const footer = matchedReply.embedFooter || matchedReply.footer;
              if (footer) embed.setFooter({ text: footer });
              const files = [];
              const img = matchedReply.embedImage || matchedReply.imageUrl;
              if (img) {
                if (img.startsWith("data:image")) {
                  const rawParts = img.split(";base64,");
                  const mime = rawParts[0].split(":")[1] || "image/png";
                  const extension = mime.split("/")[1] || "png";
                  const base64Data = rawParts.pop();
                  const sf = new AttachmentBuilder(Buffer.from(base64Data, "base64"), { name: `reply_img.${extension}` });
                  files.push(sf);
                  embed.setImage(`attachment://reply_img.${extension}`);
                } else if (img.includes("/uploads/")) {
                  const uploadsIdx = img.indexOf("/uploads/");
                  const filename = img.substring(uploadsIdx + "/uploads/".length);
                  const localPath = path.join(process.cwd(), "uploads", filename);
                  if (fs.existsSync(localPath)) {
                    const extension = path.extname(filename).replace(".", "") || "png";
                    const sf = new AttachmentBuilder(localPath, { name: `reply_img.${extension}` });
                    files.push(sf);
                    embed.setImage(`attachment://reply_img.${extension}`);
                  } else {
                    embed.setImage(img);
                  }
                } else {
                  embed.setImage(img);
                }
              }
              await message.reply({
                embeds: [embed],
                files: files.length > 0 ? files : void 0
              });
            } else {
              await message.reply({ content: matchedReply.replyText });
            }
          } catch (err) {
            console.error("Failed to reply automatically:", err);
          }
        }
      }
    }
    if (message.guild && guildConfig) {
      const security = guildConfig.security || {};
      if (security.spamProtection) {
        try {
          const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
          if (member) {
            const isOwner = message.guild.ownerId === member.id;
            const isAdmin = member.permissions.has("Administrator") || member.permissions.has("ManageMessages");
            if (!isOwner && !isAdmin) {
              const userId = message.author.id;
              const guildId = message.guild.id;
              const key = `${guildId}-${userId}`;
              let tracker = spamMap.get(key);
              if (!tracker) {
                tracker = { timestamps: [], messages: [] };
                spamMap.set(key, tracker);
              }
              const now = Date.now();
              const limit = security.spamLimit || 5;
              const interval = (security.spamInterval || 5) * 1e3;
              tracker.timestamps.push(now);
              tracker.messages.push({ id: message.id, channelId: message.channel.id });
              const threshold = now - interval;
              let cutIdx = 0;
              while (cutIdx < tracker.timestamps.length && tracker.timestamps[cutIdx] < threshold) {
                cutIdx++;
              }
              if (cutIdx > 0) {
                tracker.timestamps = tracker.timestamps.slice(cutIdx);
                tracker.messages = tracker.messages.slice(cutIdx);
              }
              if (tracker.timestamps.length >= limit) {
                console.log(`[Anti-Spam] Action triggered for ${message.author.tag} in ${message.guild.name}`);
                const msgsToDelete = [...tracker.messages];
                tracker.timestamps = [];
                tracker.messages = [];
                if (security.spamDeleteAllComments !== false) {
                  for (const mInfo of msgsToDelete) {
                    try {
                      const ch = message.guild.channels.cache.get(mInfo.channelId);
                      if (ch && ch.isTextBased()) {
                        const msgObj = await ch.messages.fetch(mInfo.id).catch(() => null);
                        if (msgObj) {
                          await msgObj.delete().catch(() => null);
                        }
                      }
                    } catch (err) {
                    }
                  }
                } else {
                  await message.delete().catch(() => null);
                }
                const punishment = security.spamPunishment || "none";
                const duration = security.spamPunishmentDuration || 5;
                const unit = security.spamPunishmentUnit || "minutes";
                const isAr = guildConfig.language === "ar" || !guildConfig.language;
                if (punishment === "timeout") {
                  let ms = 0;
                  const durVal = duration || 5;
                  if (unit === "days") ms = durVal * 24 * 60 * 60 * 1e3;
                  else if (unit === "hours") ms = durVal * 60 * 60 * 1e3;
                  else ms = durVal * 60 * 1e3;
                  try {
                    const highestMe = message.guild.members.me.roles.highest.position;
                    const memHighest = member.roles.highest.position;
                    if (memHighest < highestMe) {
                      await member.timeout(ms, isAr ? "\u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0626\u0644 \u0633\u0628\u0627\u0645 \u0645\u062A\u0643\u0631\u0631\u0629" : "Spamming text channels").catch(() => null);
                    }
                  } catch (e) {
                    console.error("[Anti-Spam] Timeout application failure:", e);
                  }
                } else if (punishment === "kick") {
                  try {
                    const highestMe = message.guild.members.me.roles.highest.position;
                    const memHighest = member.roles.highest.position;
                    if (memHighest < highestMe) {
                      await member.kick(isAr ? "\u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0626\u0644 \u0633\u0628\u0627\u0645 \u0645\u062A\u0643\u0631\u0631\u0629" : "Spamming text channels").catch(() => null);
                    }
                  } catch (e) {
                  }
                } else if (punishment === "ban") {
                  try {
                    const highestMe = message.guild.members.me.roles.highest.position;
                    const memHighest = member.roles.highest.position;
                    if (memHighest < highestMe) {
                      await member.ban({ reason: isAr ? "\u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0626\u0644 \u0633\u0628\u0627\u0645 \u0645\u062A\u0643\u0631\u0631\u0629" : "Spamming text channels" }).catch(() => null);
                    }
                  } catch (e) {
                  }
                }
                return;
              }
            }
          }
        } catch (err) {
          console.error("[Anti-Spam] Error handling message check:", err);
        }
      }
    }
    if (message.guild && guildConfig) {
      const trimmedText = message.content.trim();
      if (trimmedText) {
        const wordList = trimmedText.split(/\s+/);
        const firstWord = wordList[0];
        const firstWordLower = firstWord.toLowerCase().trim();
        const prefixes = ["#", "!", "-", "/"];
        let isHelp = false;
        let searchedCommandName = "";
        if (prefixes.some((p) => firstWordLower === p + "help" || firstWordLower === p + "\u0645\u0633\u0627\u0639\u062F\u0629" || firstWordLower === p + "\u0645\u0633\u0627\u0639\u062F\u0647") || ["help", "\u0645\u0633\u0627\u0639\u062F\u0629", "\u0645\u0633\u0627\u0639\u062F\u0647"].includes(firstWordLower)) {
          isHelp = true;
          searchedCommandName = wordList.slice(1).join(" ").trim();
        }
        if (isHelp && searchedCommandName) {
          const commMatch = getShortcutMatch(searchedCommandName, guildConfig);
          if (commMatch.matchedComm) {
            await sendCommandHelpEmbed(message, commMatch.matchedComm, guildConfig);
            return;
          }
        }
        const matchResult = getShortcutMatch(firstWord, guildConfig);
        if (matchResult.matchedComm) {
          const c = matchResult.matchedComm;
          const noArgsNeeded = ["hide", "lock", "unlock"].includes(c.id);
          if (wordList.length === 1 && !noArgsNeeded) {
            await sendCommandHelpEmbed(message, c, guildConfig);
            return;
          }
          const isOwner = message.guild.ownerId === message.author.id;
          let hasPermission = isOwner;
          const cmdConfig = guildConfig.commands ? guildConfig.commands[c.id] : null;
          if (cmdConfig) {
            if (cmdConfig.channels && cmdConfig.channels.length > 0 && !cmdConfig.channels.includes(message.channel.id)) {
              return;
            }
            if (cmdConfig.roles && cmdConfig.roles.length > 0) {
              const memberRoles = message.member?.roles.cache;
              const hasRole = memberRoles?.some((r) => cmdConfig.roles.includes(r.id));
              if (hasRole) {
                hasPermission = true;
              }
            }
          }
          if (!hasPermission && message.member) {
            if (c.id === "timeout" || c.id === "untimeout" || c.id === "warn" || c.id === "unwarn" || c.id === "warnings") {
              hasPermission = message.member.permissions.has("ModerateMembers") || message.member.permissions.has("ManageMessages") || message.member.permissions.has("Administrator");
            } else if (c.id === "role") {
              hasPermission = message.member.permissions.has("ManageRoles") || message.member.permissions.has("Administrator");
            } else if (c.id === "ban" || c.id === "unban") {
              hasPermission = message.member.permissions.has("BanMembers") || message.member.permissions.has("Administrator");
            } else if (c.id === "hide" || c.id === "lock" || c.id === "unlock" || c.id === "slowmode") {
              hasPermission = message.member.permissions.has("ManageChannels") || message.member.permissions.has("Administrator");
            }
          }
          if (hasPermission) {
            let targetId = "";
            const mentionedUser = message.mentions.users.first();
            if (mentionedUser) {
              targetId = mentionedUser.id;
            } else if (wordList[1]) {
              const match = wordList[1].match(/\d{17,20}/);
              if (match) targetId = match[0];
            }
            const args2 = wordList.slice(1);
            await runModAction(c.id, message.guild, message.channel, message.member, targetId, args2, message, false);
            return;
          }
        }
      }
    }
    const ownerId = "1179133837930938470";
    if (message.author.id === ownerId) {
      const rawContent = message.content.trim();
      const hasCommand = rawContent.startsWith("!") || rawContent.startsWith("-");
      if (hasCommand) {
        const commandBody = rawContent.substring(1);
        const parts = commandBody.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        if (cmd === "\u062E\u0635\u0645" || cmd === "discount") {
          const percent = parseInt(parts[1]) || 10;
          const code = "DISC-" + crypto.randomBytes(4).toString("hex").toUpperCase();
          globalState.activeCodes[code] = { type: "discount", value: percent };
          saveConfigs();
          return message.reply(`\u2705 \u062A\u0645 \u062A\u0648\u0644\u064A\u062F \u0643\u0648\u062F \u062E\u0635\u0645 \u0628\u0646\u0633\u0628\u0629 (${percent}%): \`${code}\``);
        }
        if (cmd === "\u0628\u0631\u064A\u0645\u064A\u0648\u0645" || cmd === "premium") {
          const code = "PREM-" + crypto.randomBytes(4).toString("hex").toUpperCase();
          globalState.activeCodes[code] = { type: "premium", value: 30 };
          saveConfigs();
          return message.reply(`\u2705 \u062A\u0645 \u062A\u0648\u0644\u064A\u062F \u0643\u0648\u062F \u0628\u0631\u064A\u0645\u064A\u0648\u0645 \u0644\u0645\u062F\u0629 (30 \u064A\u0648\u0645): \`${code}\``);
        }
        if (cmd === "\u0628\u0631\u064A\u0645\u064A\u0648\u0645-\u062F\u0627\u0626\u0645" || cmd === "premium-lifetime") {
          const hundredYears = 100 * 365 * 24 * 60 * 60 * 1e3;
          const now = Date.now();
          globalState.premiumUsers[message.author.id] = now + hundredYears;
          let guildMsg = "";
          if (message.guild) {
            const existing = guildConfigs.get(message.guild.id) || {};
            guildConfigs.set(message.guild.id, { ...existing, premiumExpiry: now + hundredYears });
            guildMsg = `
\u{1F3E2} \u0648\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0628\u0631\u064A\u0645\u064A\u0648\u0645 \u0627\u0644\u062F\u0627\u0626\u0645 \u0644\u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0623\u064A\u0636\u0627\u064B: **${message.guild.name}**!`;
          }
          saveConfigs();
          return message.reply(`\u{1F451} **\u062A\u0647\u0627\u0646\u064A\u0646\u0627 \u064A\u0627 \u0628\u0637\u0644! \u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0628\u0631\u064A\u0645\u064A\u0648\u0645 \u062F\u0627\u0626\u0645 (\u0645\u062F\u0649 \u0627\u0644\u062D\u064A\u0627\u0629) \u0628\u0646\u062C\u0627\u062D!**
\u{1F464} \u062D\u0633\u0627\u0628\u0643 \u0627\u0644\u0622\u0646 \u064A\u0645\u062A\u0644\u0643 \u0628\u0631\u064A\u0645\u064A\u0648\u0645 \u062F\u0627\u0626\u0645.${guildMsg}`);
        }
        if (cmd === "\u0643\u0648\u062F-\u062F\u0627\u0626\u0645" || cmd === "lifetime-code") {
          const code = "LIFETIME-" + crypto.randomBytes(4).toString("hex").toUpperCase();
          globalState.activeCodes[code] = { type: "premium", value: 36500 };
          saveConfigs();
          return message.reply(`\u{1F451} **\u062A\u0645 \u062A\u0648\u0644\u064A\u062F \u0643\u0648\u062F \u0628\u0631\u064A\u0645\u064A\u0648\u0645 \u062F\u0627\u0626\u0645 (\u0645\u062F\u0649 \u0627\u0644\u062D\u064A\u0627\u0629) \u0628\u0646\u062C\u0627\u062D:**
\`${code}\``);
        }
        if (cmd === "\u0633\u064A\u0631\u0641\u0631" || cmd === "\u0633\u064A\u0631\u0641\u0631\u0627\u062A" || cmd === "servers") {
          const guilds = discordClient.guilds.cache;
          if (guilds.size === 0) {
            return message.reply(`\u2139\uFE0F \u0627\u0644\u0628\u0648\u062A \u063A\u064A\u0631 \u0645\u062A\u0648\u0627\u062C\u062F \u0641\u064A \u0623\u064A \u0633\u064A\u0631\u0641\u0631 \u062D\u0627\u0644\u064A\u0627\u064B.`);
          }
          await message.reply(`\u23F3 \u062C\u0627\u0631\u064A \u062C\u0631\u062F \u0627\u0644\u0633\u064A\u0631\u0641\u0631\u0627\u062A \u0627\u0644\u0645\u062A\u0648\u0627\u062C\u062F \u0628\u0647\u0627 \u0648\u062A\u0648\u0644\u064A\u062F \u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u062F\u0639\u0648\u0629...`);
          const listPromises = Array.from(guilds.values()).map(async (g) => {
            let inviteUrl = "\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u063A\u064A\u0631 \u0643\u0627\u0641\u064A\u0629 \u0644\u0644\u0631\u0627\u0628\u0637";
            try {
              const channel = g.channels.cache.find((c) => c.isTextBased() && c.permissionsFor(g.members.me)?.has("CreateInstantInvite"));
              if (channel) {
                const invite = await channel.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
                if (invite) inviteUrl = invite.url;
              }
            } catch (err) {
            }
            return `\u2022 **${g.name}**
  - \u0627\u0644\u0623\u064A\u062F\u064A: \`${g.id}\`
  - \u0627\u0644\u0623\u0639\u0636\u0627\u0621: \`${g.memberCount}\`
  - \u0627\u0644\u0631\u0627\u0628\u0637: ${inviteUrl}`;
          });
          const list = await Promise.all(listPromises);
          let currentMessage = `\u{1F4CA} **\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0633\u064A\u0631\u0641\u0631\u0627\u062A \u0627\u0644\u0645\u062A\u0648\u0627\u062C\u062F \u0628\u0647\u0627 \u0627\u0644\u0628\u0648\u062A (${guilds.size}):**

`;
          for (const item of list) {
            if ((currentMessage + item + "\n\n").length > 1950) {
              await message.reply(currentMessage).catch(() => null);
              currentMessage = "";
            }
            currentMessage += item + "\n\n";
          }
          if (currentMessage.trim()) {
            await message.reply(currentMessage).catch(() => null);
          }
          return;
        }
        if (cmd === "\u062A\u0635\u0641\u064A\u0631" || cmd === "resetxp") {
          if (!message.guild) {
            return message.reply(`\u274C \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u064A\u062C\u0628 \u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0647 \u062F\u0627\u062E\u0644 \u0633\u064A\u0631\u0641\u0631.`);
          }
          const config2 = guildConfigs.get(message.guild.id);
          if (config2) {
            config2.usersXP = {};
            saveConfigs();
            return message.reply(`\u2705 \u062A\u0645 \u062A\u0635\u0641\u064A\u0631 \u062C\u0645\u064A\u0639 \u0646\u0642\u0627\u0637 \u0627\u0644\u062E\u0628\u0631\u0629 (XP) \u0648\u0627\u0644\u0645\u0633\u062A\u0648\u064A\u0627\u062A \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u062C\u0627\u062D \u064A\u0627 \u0628\u0637\u0644!`);
          } else {
            return message.reply(`\u274C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0644\u0647\u0630\u0627 \u0627\u0644\u0633\u064A\u0631\u0641\u0631.`);
          }
        }
        if (cmd === "\u0627\u062F\u0645\u0646" || cmd === "admin") {
          const mentionedUser = message.mentions.users.first();
          let targetId = "";
          if (mentionedUser) {
            targetId = mentionedUser.id;
          } else {
            targetId = parts[1] || "";
          }
          if (!targetId || !targetId.match(/^\d{17,20}$/)) {
            return message.reply(`\u274C \u064A\u0631\u062C\u0649 \u0645\u0646\u0634\u0646 \u0627\u0644\u0639\u0636\u0648 \u0623\u0648 \u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u0623\u064A\u062F\u064A \u0627\u0644\u062E\u0627\u0635 \u0628\u0647 \u0628\u0634\u0643\u0644 \u0635\u062D\u064A\u062D. \u0645\u062B\u0627\u0644: \`-\u0627\u062F\u0645\u0646 @user\` \u0623\u0648 \`-\u0627\u062F\u0645\u0646 123456789012345678\``);
          }
          if (!globalState.supportAdmins) {
            globalState.supportAdmins = {};
          }
          globalState.supportAdmins[targetId] = true;
          saveConfigs();
          const userObj = discordClient.users.cache.get(targetId) || mentionedUser;
          const uName = userObj ? userObj.username : targetId;
          return message.reply(`\u{1F451} **\u0631\u0627\u0626\u0639!** \u062A\u0645 \u062A\u0639\u064A\u064A\u0646 **${uName}** \u0643\u0645\u0633\u0624\u0648\u0644 \u062F\u0639\u0645 \u0641\u0646\u064A (\u0623\u062F\u0645\u0646) \u0628\u0627\u0644\u0645\u0648\u0642\u0639 \u0628\u0646\u062C\u0627\u062D. \u064A\u0645\u0643\u0646\u0647 \u0627\u0644\u0622\u0646 \u0645\u0633\u0627\u0639\u062F\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0648\u062D\u0644 \u0645\u0634\u0627\u0643\u0644\u0647\u0645.`);
        }
        if (cmd === "\u0627\u0632\u0627\u0644\u0629_\u0627\u062F\u0645\u0646" || cmd === "\u0625\u0632\u0627\u0644\u0629_\u0627\u062F\u0645\u0646" || cmd === "unadmin") {
          const mentionedUser = message.mentions.users.first();
          let targetId = "";
          if (mentionedUser) {
            targetId = mentionedUser.id;
          } else {
            targetId = parts[1] || "";
          }
          if (!targetId) {
            return message.reply(`\u274C \u064A\u0631\u062C\u0649 \u0645\u0646\u0634\u0646 \u0627\u0644\u0639\u0636\u0648 \u0623\u0648 \u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u0623\u064A\u062F\u064A \u0627\u0644\u062E\u0627\u0635 \u0628\u0647 \u0644\u0625\u0632\u0627\u0644\u062A\u0647 \u0645\u0646 \u0627\u0644\u0625\u062F\u0627\u0631\u0629.`);
          }
          if (globalState.supportAdmins) {
            delete globalState.supportAdmins[targetId];
          }
          saveConfigs();
          const userObj = discordClient.users.cache.get(targetId) || mentionedUser;
          const uName = userObj ? userObj.username : targetId;
          return message.reply(`\u274C \u062A\u0645 \u0625\u0632\u0627\u0644\u0629 **${uName}** \u0645\u0646 \u0637\u0627\u0642\u0645 \u0645\u0633\u0624\u0648\u0644\u064A\u0646 \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A \u0644\u0644\u0645\u0648\u0642\u0639.`);
        }
        if (cmd === "\u062A\u0635\u062F\u064A\u0631" || cmd === "backup" || cmd === "\u0646\u0633\u062E\u0629") {
          const { AttachmentBuilder: AttachmentBuilder2 } = await import("discord.js");
          saveDatabase();
          const files = [];
          if (fs.existsSync(databasePath)) {
            files.push(new AttachmentBuilder2(databasePath, { name: "database.json" }));
          }
          try {
            const configBuffer = Buffer.from(JSON.stringify(Object.fromEntries(guildConfigs), null, 2), "utf8");
            const globalBuffer = Buffer.from(JSON.stringify(globalState, null, 2), "utf8");
            const ticketsBuffer = Buffer.from(JSON.stringify(supportTickets, null, 2), "utf8");
            files.push(new AttachmentBuilder2(configBuffer, { name: "guildConfigs.json" }));
            files.push(new AttachmentBuilder2(globalBuffer, { name: "globalState.json" }));
            files.push(new AttachmentBuilder2(ticketsBuffer, { name: "supportTickets.json" }));
          } catch (bufErr) {
            console.error("Error creating retro buffers:", bufErr);
          }
          return message.reply({
            content: "\u{1F4E6} **\u0646\u0633\u062E\u0629 \u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0643\u0627\u0645\u0644\u0629 \u0648\u0645\u0648\u062D\u062F\u0629 \u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0628\u0648\u062A \u0648\u0627\u0644\u0645\u0648\u0642\u0639:**\n\u062A\u062D\u062A\u0648\u064A \u0627\u0644\u0646\u0633\u062E\u0629 \u0639\u0644\u0649 \u0645\u0644\u0641 `database.json` \u0627\u0644\u0645\u0648\u062D\u062F \u0627\u0644\u062C\u062F\u064A\u062F \u0628\u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0641\u0631\u0639\u064A\u0629 \u0644\u0644\u062A\u0648\u0627\u0641\u0642\u064A\u0629 \u0645\u0639 \u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0648\u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0633\u0627\u0628\u0642\u0629.",
            files
          });
        }
        if (cmd === "\u0627\u0633\u062A\u0639\u0627\u062F\u0629" || cmd === "restore") {
          const attachments = message.attachments;
          if (attachments.size === 0) {
            return message.reply("\u274C \u064A\u0631\u062C\u0649 \u0625\u0631\u0641\u0627\u0642 \u0645\u0644\u0641 JSON \u0627\u0644\u0630\u064A \u062A\u0648\u062F \u0627\u0633\u062A\u0631\u062C\u0627\u0639\u0647 (`database.json` \u0623\u0648 `guildConfigs.json` \u0623\u0648 `globalState.json` \u0623\u0648 `supportTickets.json`).");
          }
          let restoredCount = 0;
          for (const [id, attachment] of attachments.entries()) {
            if (attachment.name.endsWith(".json")) {
              try {
                const res = await fetch(attachment.url);
                if (!res.ok) throw new Error("\u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u0644\u0641 \u0645\u0646 \u062F\u064A\u0633\u0643\u0648\u0631\u062F");
                const text = await res.text();
                const parsed = JSON.parse(text);
                if (attachment.name === "database.json") {
                  if (parsed.globalState) Object.assign(globalState, parsed.globalState);
                  if (Array.isArray(parsed.supportTickets)) {
                    supportTickets.length = 0;
                    supportTickets.push(...parsed.supportTickets);
                  }
                  if (parsed.guildConfigs) {
                    guildConfigs.clear();
                    for (const [k, v] of Object.entries(parsed.guildConfigs)) {
                      guildConfigs.set(k, v);
                    }
                  }
                  restoredCount++;
                  await message.reply(`\u2705 \u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u062D\u062F\u0629 \u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629 \`${attachment.name}\` \u0628\u0646\u062C\u0627\u062D!`);
                } else if (attachment.name === "guildConfigs.json" || !Array.isArray(parsed) && !parsed.activeCodes && typeof parsed === "object") {
                  guildConfigs.clear();
                  for (const [k, v] of Object.entries(parsed)) {
                    guildConfigs.set(k, v);
                  }
                  restoredCount++;
                  await message.reply(`\u2705 \u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0645\u0644\u0641 \u0627\u0644\u0633\u064A\u0631\u0641\u0631\u0627\u062A \`${attachment.name}\` \u0628\u0646\u062C\u0627\u062D (${guildConfigs.size} \u0633\u064A\u0631\u0641\u0631)!`);
                } else if (attachment.name === "globalState.json" || parsed && typeof parsed === "object" && parsed.activeCodes) {
                  Object.assign(globalState, parsed);
                  restoredCount++;
                  await message.reply(`\u2705 \u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0645\u0644\u0641 \u0627\u0644\u062D\u0627\u0644\u0629 \u0648\u0627\u0644\u0628\u0631\u064A\u0645\u064A\u0648\u0645 \`${attachment.name}\` \u0628\u0646\u062C\u0627\u062D!`);
                } else if (attachment.name === "supportTickets.json" || Array.isArray(parsed)) {
                  supportTickets.length = 0;
                  supportTickets.push(...parsed);
                  restoredCount++;
                  await message.reply(`\u2705 \u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u062A\u0630\u0627\u0643\u0631 \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A \u0648\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0645\u0646 \`${attachment.name}\` \u0628\u0646\u062C\u0627\u062D!`);
                } else {
                  await message.reply(`\u26A0\uFE0F \u0627\u0633\u0645 \u0627\u0644\u0645\u0644\u0641 \`${attachment.name}\` \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641 \u0644\u062A\u0635\u0646\u064A\u0641\u0647.`);
                }
              } catch (err) {
                await message.reply(`\u274C \u0641\u0634\u0644 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u0644\u0641 \`${attachment.name}\`: ${err.message}`);
              }
            }
          }
          if (restoredCount > 0) {
            saveDatabase();
            return message.reply(`\u{1F389} \u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0648\u062A\u062D\u062F\u064A\u062B \u0643\u0627\u0641\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D \u0648\u062D\u0641\u0638\u0647\u0627 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u062D\u062F\u0629!`);
          } else {
            return message.reply(`\u274C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0623\u064A \u0645\u0644\u0641 \u0628\u0634\u0643\u0644 \u0635\u0627\u0644\u062D.`);
          }
        }
      }
    }
    const eventSettings = guildConfig?.events || { enabled: false, prefix: "!", allowedChannels: [], allowedRoles: [] };
    const eventPrefix = eventSettings.prefix || "!";
    const isReplicaCmd = message.content.startsWith(`${eventPrefix}replica`) || message.content.startsWith(`${eventPrefix}\u0631\u064A\u0628\u0644\u0643\u0627`);
    const isRouletteCmd = message.content.startsWith(`${eventPrefix}roulette`) || message.content.startsWith(`${eventPrefix}\u0631\u0648\u0644\u064A\u062A`);
    if (isRouletteCmd && eventSettings.enabled !== false) {
      if (message.guild) {
        if (eventSettings.allowedChannels && eventSettings.allowedChannels.length > 0) {
          if (!eventSettings.allowedChannels.includes(message.channel.id)) return;
        }
        if (eventSettings.allowedRoles && eventSettings.allowedRoles.length > 0) {
          const hasRole = message.member?.roles.cache.some((r) => eventSettings.allowedRoles?.includes(r.id));
          if (!hasRole) return;
        }
        const isPremium = isGuildPremium(message.guild.id) || isUserPremium(message.author.id);
        const game = new RouletteGame(discordClient, message.channel.id, message.guild.id, eventPrefix, isPremium);
        game.start();
        return;
      }
    }
    if (isReplicaCmd && eventSettings.enabled !== false) {
      if (message.guild) {
        if (eventSettings.allowedChannels && eventSettings.allowedChannels.length > 0) {
          if (!eventSettings.allowedChannels.includes(message.channel.id)) return;
        }
        if (eventSettings.allowedRoles && eventSettings.allowedRoles.length > 0) {
          const hasRole = message.member?.roles.cache.some((r) => eventSettings.allowedRoles?.includes(r.id));
          if (!hasRole) return;
        }
        const eventArgs = message.content.slice(eventPrefix.length).trim().split(/ +/);
        const subCommand = eventArgs[1]?.toLowerCase();
        if (subCommand === "stop" || subCommand === "\u0627\u064A\u0642\u0627\u0641" || subCommand === "\u0625\u064A\u0642\u0627\u0641") {
          const isAdmin = message.member?.permissions.has("Administrator") || message.member?.roles.cache.some((r) => eventSettings.allowedRoles?.includes(r.id));
          if (!isAdmin) {
            return message.reply("\u274C \u0641\u0642\u0637 \u0627\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u0623\u0648 \u0623\u0635\u062D\u0627\u0628 \u0627\u0644\u0631\u062A\u0628 \u0627\u0644\u0645\u0635\u0631\u062D\u0629 \u064A\u0645\u0643\u0646\u0647\u0645 \u0625\u064A\u0642\u0627\u0641 \u0644\u0639\u0628\u0629 \u0631\u064A\u0628\u0644\u0643\u0627!");
          }
          const activeGame = activeReplicaGames.get(message.channel.id);
          if (activeGame) {
            activeGame.endGame();
            activeReplicaGames.delete(message.channel.id);
            return message.reply("\u23F9\uFE0F \u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u0644\u0639\u0628\u0629 \u0631\u064A\u0628\u0644\u0643\u0627 \u0648\u0625\u0644\u063A\u0627\u0624\u0647\u0627 \u0628\u0646\u062C\u0627\u062D.");
          } else {
            return message.reply("\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u0644\u0639\u0628\u0629 \u0631\u064A\u0628\u0644\u0643\u0627 \u062C\u0627\u0631\u064A\u0629 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0642\u0646\u0627\u0629 \u062D\u0627\u0644\u064A\u0627\u064B.");
          }
        }
        if (activeReplicaGames.has(message.channel.id)) {
          return message.reply("\u274C \u0647\u0646\u0627\u0643 \u0641\u0639\u0627\u0644\u064A\u0629 \u0631\u064A\u0628\u0644\u0643\u0627 \u0642\u0627\u0626\u0645\u0629 \u0628\u0627\u0644\u0641\u0639\u0644 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0631\u0648\u0645! \u0627\u0633\u062A\u062E\u062F\u0645 `!replica stop` \u0644\u0625\u064A\u0642\u0627\u0641\u0647\u0627 \u0625\u0630\u0627 \u0643\u0646\u062A \u0645\u0634\u0631\u0641\u0627\u064B.");
        }
        const isPremium = isGuildPremium(message.guild.id) || isUserPremium(message.author.id);
        const game = new ReplicaGame(discordClient, message.channel.id, message.guild.id, eventPrefix, isPremium);
        activeReplicaGames.set(message.channel.id, game);
        game.onEnd = () => {
          activeReplicaGames.delete(message.channel.id);
        };
        game.start();
        return;
      }
    }
    const scriptSettings = guildConfig?.scriptSearch || { enabled: true, prefix: "!", allowedChannels: [] };
    const prefix = scriptSettings.prefix || "!";
    const scriptConfig = guildConfig?.commands?.script || {};
    const fscriptConfig = guildConfig?.commands?.fscript || {};
    const scriptAliases = ["script", ...scriptConfig.aliases || []];
    const fscriptAliases = ["fscript", ...fscriptConfig.aliases || []];
    const contentLower = message.content.toLowerCase();
    const isScriptCmd = scriptAliases.some((a) => contentLower.startsWith(`${prefix}${a.toLowerCase()}`));
    const isFScriptCmd = fscriptAliases.some((a) => contentLower.startsWith(`${prefix}${a.toLowerCase()}`));
    if ((isScriptCmd || isFScriptCmd) && scriptSettings.enabled !== false) {
      if (message.guild && scriptSettings.allowedChannels?.length > 0) {
        if (!scriptSettings.allowedChannels.includes(message.channel.id)) return;
      }
      const usedAlias = isFScriptCmd ? fscriptAliases.find((a) => contentLower.startsWith(`${prefix}${a.toLowerCase()}`)) : scriptAliases.find((a) => contentLower.startsWith(`${prefix}${a.toLowerCase()}`));
      const query = message.content.slice((prefix + (usedAlias || "")).length).trim();
      const lang = guildConfig?.language || "ar";
      if (!query) {
        const resp = lang === "ar" ? isScriptCmd ? "\u064A\u0631\u062C\u0649 \u062A\u0642\u062F\u064A\u0645 \u0627\u0633\u0645 \u0627\u0644\u0645\u0627\u0628." : "\u064A\u0631\u062C\u0649 \u062A\u0642\u062F\u064A\u0645 \u0643\u0644\u0645\u0629 \u0627\u0644\u0628\u062D\u062B \u0644\u0644\u0633\u0643\u0631\u0628\u062A." : isScriptCmd ? "Please provide a map name." : "Please provide a script keyword.";
        return message.reply(resp);
      }
      const isF = isFScriptCmd;
      return await handleScriptSearch(message, query, isF, lang, prefix);
    }
    if (!message.guild || !guildConfig) return;
    const guildCfg = guildConfig;
    const lConf = getLevellingConfig(message.guild.id);
    if (lConf?.enabled) {
      const isCommandChannel = !lConf.commandChannels || lConf.commandChannels.length === 0 || lConf.commandChannels.includes(message.channel.id);
      const chatAliases = [...lConf.chat?.aliases || [], "top", "rank", "lvl"];
      const voiceAliases = [...lConf.voice?.aliases || [], "vtop", "vrank", "vlvl"];
      const idAliases = ["id", "profile"];
      const contentLower2 = message.content.toLowerCase();
      const firstWord = contentLower2.split(" ")[0];
      if (isCommandChannel && (chatAliases.includes(firstWord) || voiceAliases.includes(firstWord) || idAliases.includes(firstWord))) {
        return handleLevellingCommands(message, lConf, guildCfg);
      }
      const cdKey = `${message.guild.id}_${message.author.id}`;
      const cd = chatCooldowns.get(cdKey);
      const chatConf = lConf.chat;
      const cooldownMs = (chatConf.cooldown !== void 0 ? Number(chatConf.cooldown) : 60) * 1e3;
      if (!cd || Date.now() - cd > cooldownMs) {
        chatCooldowns.set(cdKey, Date.now());
        const config2 = guildConfigs.get(message.guild.id) || { usersXP: {} };
        const usersXP = config2.usersXP || {};
        const userXPObj = usersXP[message.author.id] || { chatXP: 0, voiceXP: 0, chatMessageCount: 0 };
        const chatConf2 = lConf.chat;
        if (!config2.usersXP) config2.usersXP = {};
        if (!config2.usersXP[message.author.id]) {
          config2.usersXP[message.author.id] = { chatXP: 0, voiceXP: 0, chatMessageCount: 0 };
        }
        const actualUserXP = config2.usersXP[message.author.id];
        actualUserXP.chatMessageCount = (actualUserXP.chatMessageCount || 0) + 1;
        let earnRate = chatConf2.earnRate !== void 0 ? Number(chatConf2.earnRate) : 15;
        const earnIncrease = chatConf2.earnIncrease ? Number(chatConf2.earnIncrease) : 0;
        const earnIncreaseInterval = chatConf2.earnIncreaseInterval ? Number(chatConf2.earnIncreaseInterval) : 5;
        if (earnIncrease > 0 && earnIncreaseInterval > 0) {
          earnRate += Math.floor(actualUserXP.chatMessageCount / earnIncreaseInterval) * earnIncrease;
        }
        addUserXp(message.guild.id, message.author.id, "chat", earnRate, message.channel.id);
      }
    }
    if (!config.commands) return;
    const args = message.content.trim().split(/\s+/);
    const commandWord = args.shift();
    if (!commandWord) return;

    const cleanWord = /^[!\-#\.\/$]/.test(commandWord) ? commandWord.substring(1) : commandWord;
    const isOwnerOrAdmin = message.guild.ownerId === message.author.id || 
                           message.author.id === "1179133837930938470" || 
                           (message.member && message.member.permissions.has("Administrator"));

    for (const [cmdName, cmdConfig] of Object.entries(config.commands)) {
      const aliases = cmdConfig.aliases || [];
      const isMatched = aliases.some(al => al.toLowerCase() === commandWord.toLowerCase() || al.toLowerCase() === cleanWord.toLowerCase());
      if (isMatched) {
        if (cmdConfig.channels?.length > 0 && !cmdConfig.channels.includes(message.channel.id) && !isOwnerOrAdmin) return;
        if (cmdConfig.roles?.length > 0 && !isOwnerOrAdmin) {
          const memberRoles = message.member?.roles.cache;
          const hasRole = memberRoles?.some((r) => cmdConfig.roles.includes(r.id));
          if (!hasRole) return;
        }
        if (cmdName === "clear") {
          const lang = config.language || "ar";
          let amount = 10;
          if (args.length > 0) {
            const parsed = parseInt(args[0], 10);
            if (!isNaN(parsed) && parsed > 0) {
              amount = Math.min(parsed, 100);
            }
          }
          try {
            if ("bulkDelete" in message.channel) {
              const fetchMessages = await message.channel.messages.fetch({ limit: Math.min(amount + 1, 100) });
              await message.channel.bulkDelete(fetchMessages, true).catch(() => {
              });
            }
            let responseText = `\u{1F9F9} \u062A\u0645 \u0645\u0633\u062D ${amount} \u0631\u0633\u0627\u0644\u0629 \u0628\u0646\u062C\u0627\u062D!`;
            if (lang === "en") responseText = `\u{1F9F9} Cleared ${amount} messages successfully!`;
            else if (lang === "fr") responseText = `\u{1F9F9} ${amount} messages effac\xE9s avec succ\xE8s !`;
            const replyMsg = await message.channel.send(responseText);
            setTimeout(() => replyMsg.delete().catch(() => {
            }), 3e3);
          } catch (e) {
            console.error("Clear error:", e);
          }
        } else if (cmdName === "kick" || cmdName === "ban") {
          try {
            const replyMsg = await message.channel.send("\u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u064A\u062A\u0637\u0644\u0628 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0639\u0636\u0648. \u064A\u0631\u062C\u0649 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0623\u0645\u0631 \u0627\u0644\u0633\u0644\u0627\u0634.");
            setTimeout(() => replyMsg.delete().catch(() => {
            }), 3e3);
          } catch (e) {
            console.error("Text command kick/ban reply error:", e);
          }
        }
      }
    }
});
discordClient.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    try {
      const config = guildConfigs.get(interaction.guildId || "") || { language: "ar", commands: {} };
      const cmdConfig = config.commands ? config.commands[interaction.commandName] : void 0;
      if (cmdConfig && interaction.commandName !== "ping" && interaction.commandName !== "help") {
        if (cmdConfig.channels && cmdConfig.channels.length > 0 && !cmdConfig.channels.includes(interaction.channelId)) {
          return await interaction.reply({ content: config.language === "ar" ? "\u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u063A\u0631\u0641\u0629." : "This command is not allowed in this channel.", ephemeral: true });
        }
        if (cmdConfig.roles && cmdConfig.roles.length > 0) {
          const memberRoles = interaction.member?.roles?.cache;
          const hasRole = memberRoles?.some((r) => cmdConfig.roles.includes(r.id));
          if (!hasRole) {
            return await interaction.reply({ content: config.language === "ar" ? "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0627\u0644\u0631\u062A\u0628\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631." : "You do not have the required role to use this command.", ephemeral: true });
          }
        }
      }
      const lang = config.language || "ar";
      if (interaction.commandName === "top") {
        const lConf = getLevellingConfig(interaction.guildId || "");
        return await handleLevellingCommands(interaction, lConf, config);
      } else if (interaction.commandName === "id") {
        const lConf = getLevellingConfig(interaction.guildId || "");
        return await handleLevellingCommands(interaction, lConf, config, { isSlashId: true });
      } else if (interaction.commandName === "ping") {
        const sent = await interaction.reply({ content: "Pinging...", fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`Pong! \u{1F3D3}
Latency is \`${latency}ms\`. API Latency is \`${Math.round(discordClient.ws.ping)}ms\`.`);
      } else if (interaction.commandName === "help") {
        await interaction.reply({
          content: "Here are the available commands:\n`/ping` - Check bot latency\n`/help` - Show this message\n`/clear` - Clear messages\n`/kick` - Kick a user\n`/ban` - Ban a user\n`/serverinfo` - Display server information",
          ephemeral: true
        });
      } else if (interaction.commandName === "clear") {
        const amount = interaction.options.getInteger("amount") || 10;
        if (amount < 1 || amount > 100) {
          return await interaction.reply({ content: lang === "ar" ? "\u064A\u0645\u0643\u0646\u0643 \u0645\u0633\u062D \u0627\u0644\u0645\u0642\u062F\u0627\u0631 \u0645\u0646 1 \u0625\u0644\u0649 100." : "You can only delete between 1 and 100 messages at a time.", ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true }).catch(() => {
        });
        try {
          if (interaction.channel && "bulkDelete" in interaction.channel) {
            await interaction.channel.bulkDelete(amount, true).catch(() => {
            });
          }
        } catch (err) {
          console.error("Bulk delete error:", err);
        }
        let msgContent = `\u{1F9F9} \u062A\u0645 \u0645\u0633\u062D ${amount} \u0631\u0633\u0627\u0626\u0644 \u0628\u0646\u062C\u0627\u062D!`;
        if (lang === "en") msgContent = `\u{1F9F9} Cleared ${amount} messages successfully!`;
        if (lang === "fr") msgContent = `\u{1F9F9} ${amount} messages effac\xE9s avec succ\xE8s !`;
        await interaction.editReply({ content: msgContent });
        setTimeout(async () => {
          await interaction.deleteReply().catch(() => {
          });
        }, 3e3);
      } else if (interaction.commandName === "kick") {
        try {
          const target = interaction.options.getUser("target");
          if (!target) {
            return await interaction.reply({ content: "\u26A0\uFE0F \u064A\u062C\u0628 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0639\u0636\u0648 \u0644\u0644\u062A\u0637\u0628\u064A\u0642 \u0639\u0644\u064A\u0647.", ephemeral: true }).catch(() => null);
          }
          const member = await interaction.guild.members.fetch(target.id).catch(() => null);
          if (member) {
            const isOwner = interaction.guild.ownerId === interaction.user.id;
            if (!isOwner && member.roles.highest.position >= (interaction.member?.roles).highest.position) {
              return await interaction.reply({ content: `**\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0639\u0637\u0627\u0621 \u0648\u0642\u062A \u0645\u0633\u062A\u0642\u0637\u0639 \u0644\u0640<@${target.id}>\u{1F644}.**`, ephemeral: true }).catch(() => null);
            }
            if (member.id === interaction.guild.ownerId) {
              return await interaction.reply({ content: `**\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0639\u0637\u0627\u0621 \u0648\u0642\u062A \u0645\u0633\u062A\u0642\u0637\u0639 \u0644\u0640<@${target.id}>\u{1F644}.**`, ephemeral: true }).catch(() => null);
            }
            await member.kick();
          }
          const reason = interaction.options.getString("reason") ?? (lang === "ar" ? "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0642\u062F\u064A\u0645 \u0633\u0628\u0628" : "No reason provided");
          const replyTxt = lang === "ar" ? `\u{1F97E} \u062A\u0645 \u0637\u0631\u062F ${target?.tag} \u0628\u0633\u0628\u0628: ${reason}` : `\u{1F97E} Kicked ${target?.tag} for: ${reason}`;
          await interaction.reply({ content: replyTxt, ephemeral: true });
        } catch (err) {
          const isPermissionErr = err.code === 50013 || err.code === 50001 || err.status === 403 || err.message && (err.message.toLowerCase().includes("permission") || err.message.toLowerCase().includes("privilege") || err.message.toLowerCase().includes("hierarchy") || err.message.toLowerCase().includes("missing access") || err.message.toLowerCase().includes("missing permissions"));
          if (isPermissionErr) {
            await interaction.reply({ content: `**\u0644\u064A\u0633 \u0644\u062F\u064A \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0643\u0627\u0641\u064A\u0629\u{1F644}.**`, ephemeral: true }).catch(() => null);
          } else {
            await interaction.reply({ content: `\u274C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u0646\u0641\u064A\u0630 \u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621: ${err.message || err}`, ephemeral: true }).catch(() => null);
          }
        }
      } else if (["timeout", "untimeout", "role", "ban", "unban", "hide", "lock", "unlock", "warn", "unwarn", "warnings"].includes(interaction.commandName)) {
        const targetUser = interaction.options.getUser("target") || interaction.options.getUser("user");
        const targetId = targetUser?.id || interaction.options.getString("target_id") || "";
        const args = [];
        if (interaction.commandName === "timeout") {
          const duration = interaction.options.getString("duration");
          const reason = interaction.options.getString("reason");
          if (duration) args.push(duration);
          if (reason) args.push(reason);
        } else if (interaction.commandName === "ban") {
          const reason = interaction.options.getString("reason");
          if (reason) args.push(reason);
        } else if (interaction.commandName === "warn") {
          const reason = interaction.options.getString("reason");
          if (reason) args.push(reason);
        } else if (interaction.commandName === "unwarn") {
          const index = interaction.options.getInteger("index");
          if (index !== null && index !== void 0) args.push(String(index));
        }
        await runModAction(interaction.commandName, interaction.guild, interaction.channel, interaction.member, targetId, args, interaction, true);
      } else if (interaction.commandName === "serverinfo") {
        const guild = interaction.guild;
        const info = lang === "ar" ? `**\u0627\u0633\u0645 \u0627\u0644\u0633\u064A\u0631\u0641\u0631:** ${guild?.name}
**\u0627\u0644\u0623\u064A\u062F\u064A:** ${guild?.id}
**\u0639\u062F\u062F \u0627\u0644\u0623\u0639\u0636\u0627\u0621:** ${guild?.memberCount}` : `**Server Name:** ${guild?.name}
**Server ID:** ${guild?.id}
**Members:** ${guild?.memberCount}`;
        await interaction.reply({ content: info, ephemeral: true });
      } else if (interaction.commandName === "slowmode") {
        const isAdmin = interaction.member?.permissions?.has("Administrator");
        if (!isAdmin) {
          return await interaction.reply({ content: lang === "ar" ? "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631." : "You do not have permission to use this command.", ephemeral: true });
        }
        const seconds = interaction.options.getInteger("seconds") ?? 0;
        if (interaction.channel && "setRateLimitPerUser" in interaction.channel) {
          await interaction.channel.setRateLimitPerUser(seconds).catch(() => {
          });
          const msg = lang === "ar" ? seconds === 0 ? "\u2705 \u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0628\u0637\u064A\u0621." : `\u2705 \u062A\u0645 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0628\u0637\u064A\u0621 \u0628\u0640 ${seconds} \u062B\u0627\u0646\u064A\u0629.` : seconds === 0 ? "\u2705 Slowmode disabled." : `\u2705 Slowmode set to ${seconds} seconds.`;
          await interaction.reply({ content: msg });
        }
      } else if (interaction.commandName === "language") {
        const isAdmin = interaction.member?.permissions?.has("Administrator");
        if (!isAdmin) {
          return await interaction.reply({ content: lang === "ar" ? "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631." : "You do not have permission to use this command.", ephemeral: true });
        }
        const newLang = interaction.options.getString("lang") || "ar";
        const guildId = interaction.guildId;
        const config2 = guildConfigs.get(guildId) || { commands: {} };
        config2.language = newLang;
        guildConfigs.set(guildId, config2);
        saveConfigs();
        const successMsg = {
          ar: "\u2705 \u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0644\u063A\u0629 \u0627\u0644\u0628\u0648\u062A \u0625\u0644\u0649 \u0627\u0644\u0639\u0631\u0628\u064A\u0629.",
          en: "\u2705 Bot language changed to English.",
          fr: "\u2705 La langue du bot a \xE9t\xE9 chang\xE9e en Fran\xE7ais."
        }[newLang] || "\u2705 Done.";
        await interaction.reply({ content: successMsg });
      } else if (interaction.commandName === "set-level") {
        const isAdmin = interaction.member?.permissions?.has("Administrator");
        if (!isAdmin) {
          return await interaction.reply({ content: lang === "ar" ? "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631." : "You do not have permission to use this command.", ephemeral: true });
        }
        const level = interaction.options.getInteger("level");
        const xp = interaction.options.getInteger("xp");
        const type = interaction.options.getString("type");
        const guildId = interaction.guildId;
        const config2 = guildConfigs.get(guildId) || {};
        if (!config2.levelling) config2.levelling = {};
        const typeKey = type === "chat" ? "chat" : "voice";
        if (!config2.levelling[typeKey]) {
          config2.levelling[typeKey] = { enabled: true, xpMode: "static", staticLevels: [] };
        }
        const lType = config2.levelling[typeKey];
        if (!lType.staticLevels) lType.staticLevels = [];
        const existingIdx = lType.staticLevels.findIndex((sl) => sl.level === level);
        if (existingIdx !== -1) {
          lType.staticLevels[existingIdx].xp = xp;
        } else {
          lType.staticLevels.push({ level, xp });
          lType.staticLevels.sort((a, b) => a.level - b.level);
        }
        lType.xpMode = "static";
        saveConfigs();
        const responseMsg = lang === "ar" ? `\u2705 \u062A\u0645 \u062A\u062D\u062F\u064A\u062F XP \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \`${level}\` \u0628\u0640 \`${xp}\` \u0644\u0640 \`${type === "chat" ? "\u0627\u0644\u062F\u0631\u062F\u0634\u0629" : "\u0627\u0644\u0635\u0648\u062A"}\`. (\u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0622\u0646 \u064A\u062F\u0648\u064A)` : `\u2705 Set Level \`${level}\` XP to \`${xp}\` for \`${type}\`. (Mode switched to Static)`;
        await interaction.reply({ content: responseMsg });
      } else if (interaction.commandName === "script") {
        const query = interaction.options.getString("map");
        await handleScriptSearch(interaction, query, false, lang);
      } else if (interaction.commandName === "fscript") {
        const query = interaction.options.getString("query");
        await handleScriptSearch(interaction, query, true, lang);
      } else if (interaction.commandName === "remove-level") {
        const isAdmin = interaction.member?.permissions?.has("Administrator");
        if (!isAdmin) {
          return await interaction.reply({ content: lang === "ar" ? "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631." : "You do not have permission to use this command.", ephemeral: true });
        }
        const level = interaction.options.getInteger("level");
        const type = interaction.options.getString("type");
        const guildId = interaction.guildId;
        const config2 = guildConfigs.get(guildId) || {};
        const typeKey = type === "chat" ? "chat" : "voice";
        if (config2.levelling?.[typeKey]?.staticLevels) {
          config2.levelling[typeKey].staticLevels = config2.levelling[typeKey].staticLevels.filter((sl) => sl.level !== level);
          saveConfigs();
        }
        const responseMsg = lang === "ar" ? `\u{1F5D1}\uFE0F \u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \`${level}\` \u0644\u0640 \`${type === "chat" ? "\u0627\u0644\u062F\u0631\u062F\u0634\u0629" : "\u0627\u0644\u0635\u0648\u062A"}\`.` : `\u{1F5D1}\uFE0F Removed level \`${level}\` requirements for \`${type}\`.`;
        await interaction.reply({ content: responseMsg });
      } else if (interaction.commandName === "add-level" || interaction.commandName === "take-level") {
        const isAdmin = interaction.member?.permissions?.has("Administrator");
        if (!isAdmin) {
          return await interaction.reply({ content: lang === "ar" ? "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631." : "You do not have permission to use this command.", ephemeral: true });
        }
        const target = interaction.options.getUser("target");
        const type = interaction.options.getString("type");
        const levels = interaction.options.getInteger("amount") || 0;
        const isAdd = interaction.commandName === "add-level";
        const guildId = interaction.guildId;
        const lConf = getLevellingConfig(guildId);
        const config2 = guildConfigs.get(guildId) || { usersXP: {} };
        if (!config2.usersXP) config2.usersXP = {};
        if (!config2.usersXP[target.id]) {
          config2.usersXP[target.id] = { chatXP: 0, voiceXP: 0 };
        }
        const userXP = config2.usersXP[target.id];
        let totalXpDelta = 0;
        let currentTotalXp = type === "chat" ? userXP.chatXP : userXP.voiceXP;
        const typeConfig = type === "chat" ? lConf.chat : lConf.voice;
        let { level: currentLevel } = calculateLevelFromTotalXp(typeConfig, currentTotalXp);
        if (isAdd) {
          for (let i = 0; i < levels; i++) {
            totalXpDelta += getXpRequired(typeConfig, currentLevel + i);
          }
          addUserXp(guildId, target.id, type, totalXpDelta, interaction.channelId);
        } else {
          const targetLevel = Math.max(1, currentLevel - levels);
          let targetXp = 0;
          for (let i = 1; i < targetLevel; i++) {
            targetXp += getXpRequired(typeConfig, i);
          }
          if (type === "chat") userXP.chatXP = targetXp;
          else userXP.voiceXP = targetXp;
          saveConfigs();
        }
        const responseMsg = isAdd ? `**\u0644\u0642\u062F \u062A\u0645 \u0627\u0636\u0627\u0641\u0629 \`${levels}\` \u0644\u0641\u0644 \u0627\u0644\u0649 <@${target.id}> <a:add:1459898478724645061>**` : `**\u0644\u0642\u062F \u062A\u0645 \u0627\u0632\u0627\u0644\u0629 \`${levels}\` \u0644\u0641\u0644 \u0645\u0646 <@${target.id}> <a:remove:1459899485957394452>**`;
        await interaction.reply({ content: responseMsg, allowedMentions: { parse: [] } });
      } else if (interaction.commandName === "ticket-post") {
        const panelId = interaction.options.getString("panel_id");
        const targetChannelId = interaction.options.getChannel("channel")?.id || interaction.channelId;
        const targetChannel = interaction.guild?.channels.cache.get(targetChannelId);
        const config2 = guildConfigs.get(interaction.guildId) || {};
        const panel = config2.tickets?.panels?.find((p) => p.id === panelId);
        if (!panel) {
          return await interaction.reply({ content: "Invalid Panel ID.", ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true }).catch(() => {
        });
        const embed = new EmbedBuilder().setTitle(panel.embedTitle).setDescription(panel.embedDesc).setColor(5793266);
        if (panel.thumbnailUrl) {
          embed.setThumbnail(panel.thumbnailUrl);
        } else if (!panel.hideServerIcon) {
          const icon = interaction.guild.iconURL({ extension: "png", forceStatic: false, size: 1024 });
          embed.setThumbnail(icon || "https://cdn.discordapp.com/embed/avatars/0.png");
        }
        if (panel.largeImageUrl) embed.setImage(panel.largeImageUrl);
        const rows = [];
        if (panel.componentsType === "buttons") {
          const row = new ActionRowBuilder();
          panel.options.forEach((opt) => {
            const btn = new ButtonBuilder().setCustomId(`ticket_open_${panel.id}_${opt.id}`).setLabel(opt.label).setStyle(ButtonStyle.Primary);
            if (opt.emoji) btn.setEmoji(opt.emoji);
            row.addComponents(btn);
          });
          rows.push(row);
        } else {
          const select = new StringSelectMenuBuilder().setCustomId(`ticket_select_${panel.id}`).setPlaceholder("Choose a ticket category...");
          panel.options.forEach((opt) => {
            const option = { label: opt.label, value: opt.id };
            if (opt.emoji) option.emoji = opt.emoji;
            select.addOptions(option);
          });
          rows.push(new ActionRowBuilder().addComponents(select));
        }
        await targetChannel.send({ embeds: [embed], components: rows });
        await interaction.editReply({ content: "Panel posted successfully." });
      } else if (interaction.commandName === "line-setup") {
        const isAdmin = interaction.member?.permissions?.has("Administrator");
        if (!isAdmin) {
          return await interaction.reply({ content: lang === "ar" ? "\u274C \u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631." : "\u274C You do not have permission to use this command.", ephemeral: true });
        }
        const channel = interaction.options.getChannel("channel");
        const attachment = interaction.options.getAttachment("image");
        if (!channel || !attachment) {
          return await interaction.reply({ content: lang === "ar" ? "\u274C \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0631\u0648\u0645 \u0648\u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u0641\u0642\u0629." : "\u274C Please choose a channel and upload a line image.", ephemeral: true });
        }
        const guildId = interaction.guildId;
        const config2 = guildConfigs.get(guildId) || {};
        if (!config2.autoFeatures) {
          config2.autoFeatures = { autolines: [], bye: { channelId: "", message: "", lineUrl: "", enabled: false } };
        }
        if (!config2.autoFeatures.autolines) {
          config2.autoFeatures.autolines = [];
        }
        const existingIdx = config2.autoFeatures.autolines.findIndex((l) => l.channelId === channel.id);
        if (existingIdx !== -1) {
          config2.autoFeatures.autolines[existingIdx].lineUrl = attachment.url;
        } else {
          config2.autoFeatures.autolines.push({
            channelId: channel.id,
            lineUrl: attachment.url
          });
        }
        guildConfigs.set(guildId, config2);
        saveConfigs();
        await interaction.reply({
          content: lang === "ar" ? `\u2705 \u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0648\u0625\u062F\u0631\u0627\u062C \u0627\u0644\u062E\u0637 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0628\u0646\u062C\u0627\u062D \u0644\u0642\u0646\u0627\u0629 <#${channel.id}>!` : `\u2705 Auto Line set up successfully for <#${channel.id}>!`,
          ephemeral: true
        });
      }
    } catch (outerErr) {
      console.error("Handling interaction failed:", outerErr);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: `An error occurred: ${outerErr instanceof Error ? outerErr.message : outerErr}`, ephemeral: true });
        }
      } catch (e) {
      }
    }
    return;
  }
  try {
    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isModalSubmit()) {
      const start = Date.now();
      const sM = checkIfInteractionShowsModal(interaction);
      interaction.showsModal = sM;
      console.log(`[Interaction Event] CustomID: ${interaction.customId}, Type: ${interaction.type}, showsModal: ${sM}, deferred: ${interaction.deferred}`);
      await handleTicketInteractions(interaction);
      await handleApplicationInteractions(interaction);
      console.log(`[Interaction End] Handled in ${Date.now() - start}ms`);
    }
  } catch (err) {
    console.error("[Interaction Critical Error] Details:", {
      message: err?.message,
      code: err?.code,
      stack: err?.stack
    });
    if (err instanceof Error && (err.message.includes("Unknown interaction") || err.code === 10062)) {
      console.warn("Ticket interaction expired before handling.");
    } else {
      console.error("Ticket interaction error:", err);
    }
  } finally {
    if (interaction.expired) return;
    try {
      if ((interaction.isButton() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isModalSubmit()) && !interaction.replied && !interaction.deferred && !interaction.modalShown && !interaction.showsModal) {
        const customId = interaction.customId || "";
        const localIds = [
          "script_back",
          "script_next",
          "script_copy",
          "random_join_roulette",
          "leave_roulette",
          "random_kick_roulette",
          "withdraw_roulette"
        ];
        const isLocalCollector = localIds.includes(customId) || customId && (customId.startsWith("join_num_") || customId.startsWith("kick_player_"));
        if (!isLocalCollector) {
          if (interaction.isModalSubmit()) {
            await interaction.deferReply({ ephemeral: true }).catch(() => {
            });
          } else {
            await interaction.deferUpdate().catch(() => {
            });
          }
        }
      }
    } catch (e) {
    }
  }
});
const ticketCooldowns = /* @__PURE__ */ new Map();
const suggestionCooldowns = /* @__PURE__ */ new Map();
const ratedTickets = /* @__PURE__ */ new Set();
const brokerData = /* @__PURE__ */ new Map();
const reviewerData = /* @__PURE__ */ new Map();
const activeAzkarCounts = /* @__PURE__ */ new Map();
function findTicketOptionAndPanel(interaction, config) {
  const customId = interaction.customId || "";
  let panel = null;
  let opt = null;
  let panelId = "";
  let optId = "";
  let remaining = "";
  if (customId.startsWith("ticket_open_")) {
    remaining = customId.substring("ticket_open_".length);
  } else if (customId.startsWith("ticket_modal_")) {
    remaining = customId.substring("ticket_modal_".length);
  }
  if (customId.startsWith("ticket_open_") || customId.startsWith("ticket_modal_")) {
    if (config.tickets?.panels) {
      for (const p of config.tickets.panels) {
        if (p.id && remaining.startsWith(p.id + "_")) {
          const possibleOptId = remaining.substring(p.id.length + 1);
          const foundOpt = p.options?.find((o) => o.id === possibleOptId);
          if (foundOpt) {
            panel = p;
            opt = foundOpt;
            panelId = p.id;
            optId = foundOpt.id;
            break;
          }
        }
      }
      if (!opt) {
        for (const p of config.tickets.panels) {
          const foundOpt = p.options?.find((o) => o.id && remaining.endsWith(o.id));
          if (foundOpt) {
            panel = p;
            opt = foundOpt;
            panelId = p.id;
            optId = foundOpt.id;
            break;
          }
        }
      }
    }
  } else if (customId.startsWith("ticket_select_")) {
    panelId = customId.substring("ticket_select_".length);
    optId = interaction.values?.[0] || "";
    panel = config.tickets?.panels?.find((p) => p.id === panelId);
    opt = panel?.options?.find((o) => o.id === optId);
    if (!opt && config.tickets?.panels) {
      for (const p of config.tickets.panels) {
        const foundOpt = p.options?.find((o) => o.id === optId);
        if (foundOpt) {
          panel = p;
          opt = foundOpt;
          panelId = p.id;
          break;
        }
      }
    }
  }
  if (!panel || !opt) {
    const btnLabel = interaction.component?.label;
    if (config.tickets?.panels) {
      for (const p of config.tickets.panels) {
        if (p.options) {
          for (const o of p.options) {
            if (btnLabel && o.label && (o.label.trim().toLowerCase() === btnLabel.trim().toLowerCase() || btnLabel.trim().toLowerCase().includes(o.label.trim().toLowerCase()))) {
              panel = p;
              opt = o;
              panelId = p.id;
              optId = o.id;
              break;
            }
          }
        }
        if (opt) break;
      }
    }
    if (!opt && config.tickets?.panels) {
      const customIdParts = customId.split("_");
      for (const part of customIdParts) {
        if (part && part.length > 3) {
          for (const p of config.tickets.panels) {
            const matchedOpt = p.options?.find((o) => o.id && (o.id.includes(part) || part.includes(o.id)));
            if (matchedOpt) {
              panel = p;
              opt = matchedOpt;
              panelId = p.id;
              optId = matchedOpt.id;
              break;
            }
          }
          if (opt) break;
        }
      }
    }
    if (!opt && config.tickets?.panels && config.tickets.panels.length > 0) {
      const firstPanel = config.tickets.panels.find((p) => p.options && p.options.length > 0) || config.tickets.panels[0];
      if (firstPanel) {
        panel = firstPanel;
        panelId = firstPanel.id;
        opt = firstPanel.options && firstPanel.options.length > 0 ? firstPanel.options[0] : null;
        if (opt) {
          optId = opt.id;
        }
      }
    }
    if (!opt) {
      const defaultPanelId = "panel_default_fallback";
      const defaultOptId = "opt_default_fallback";
      panel = {
        id: defaultPanelId,
        embedTitle: "\u062F\u0639\u0645 \u0641\u0646\u064A",
        embedDesc: "\u062A\u0630\u0643\u0631\u0629 \u062F\u0639\u0645 \u0641\u0646\u064A \u062A\u0644\u0642\u0627\u0626\u064A\u0629",
        channelId: "",
        options: []
      };
      opt = {
        id: defaultOptId,
        label: btnLabel || (config.language === "ar" ? "\u062F\u0639\u0645 \u0639\u0627\u0645" : "General Support"),
        question: "",
        welcomeMessage: config.language === "ar" ? "\u0623\u0647\u0644\u0627\u064B \u0628\u0643 \u0641\u064A \u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A! \u062A\u0641\u0636\u0644 \u0628\u0637\u0631\u062D \u0627\u0633\u062A\u0641\u0633\u0627\u0631\u0643 \u0648\u0633\u064A\u0642\u0648\u0645 \u0623\u062D\u062F \u0627\u0644\u0625\u0634\u0631\u0627\u0641 \u0628\u0627\u0644\u0631\u062F \u0639\u0644\u064A\u0643 \u0642\u0631\u064A\u0628\u0627\u064B." : "Welcome to support! Please describe your query and staff will assist you shortly.",
        category: "",
        staffRoles: []
      };
      panelId = defaultPanelId;
      optId = defaultOptId;
    }
  }
  return { panel, opt, panelId, optId };
}

// ============================================================================
// APPLICATIONS SYSTEM HANDLING
// ============================================================================

async function sendInteractionResponse(interaction, content, options = {}) {
  const { ephemeral = false, followUp = false, editReply = false, update = false, ...rest } = options;
  
  const isAcknowledged = interaction.replied || interaction.deferred;
  
  try {
    if (isAcknowledged) {
      // If already acknowledged, we MUST use editReply or followUp.
      // We cannot call reply() or update().
      if (followUp) {
        return await interaction.followUp({ content, ...rest, ephemeral });
      }
      return await interaction.editReply({ content, ...rest });
    }
    
    // Not acknowledged yet.
    if (update) {
      return await interaction.update({ content, ...rest });
    }
    return await interaction.reply({ content, ...rest, ephemeral });
  } catch (err) {
    console.error("Failed to send interaction response:", err);
    throw err; // Re-throw to caller to handle if needed
  }
}

async function handleDMApplicationMessage(message, session) {
  try {
    const config = guildConfigs.get(session.guildId) || {};
    const panel = (config.applications?.panels || []).find(p => p.id === session.panelId);
    if (!panel) {
      activeDMSubmissions.delete(message.author.id);
      return await message.reply("❌ حدث خطأ: لم يتم العثور على البانل المحدد الخاص بهذا التقديم.");
    }
    
    // Save current answer
    session.answers.push(message.content);
    session.currentQuestionIndex++;
    
    if (session.currentQuestionIndex < panel.questions.length) {
      // Send next question
      const nextQ = panel.questions[session.currentQuestionIndex];
      const embed = new EmbedBuilder()
        .setTitle(panel.title)
        .setDescription(`**السؤال رقم ${session.currentQuestionIndex + 1}:**\n${nextQ}`)
        .setColor(0x5865F2);
      await message.reply({ embeds: [embed] });
    } else {
      // Completed!
      activeDMSubmissions.delete(message.author.id);
      
      const successEmbed = new EmbedBuilder()
        .setTitle("🎉 تم الإرسال")
        .setDescription("تم إرسال تقديمك بنجاح! شكراً لك وجاري مراجعة طلبك من قبل الإدارة.")
        .setColor(0x2ecc71);
      await message.reply({ embeds: [successEmbed] });
      
      // Submit the application to the logs channel!
      await submitApplication({
        guildId: session.guildId,
        panel: panel,
        user: message.author,
        answers: session.answers,
        startTime: session.startTime
      });
    }
  } catch (err) {
    console.error("Error in DM application step:", err);
  }
}

async function submitApplication({ guildId, panel, user, answers, startTime }) {
  try {
    const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;
    const channel = guild.channels.cache.get(panel.targetChannelId);
    if (!channel || !channel.isTextBased()) return;
    
    const member = await guild.members.fetch(user.id).catch(() => null);
    const durationSec = Math.floor((Date.now() - startTime) / 1000);
    const joinedStamp = member ? Math.floor(member.joinedTimestamp / 1000) : Math.floor(Date.now() / 1000);
    const submittedStamp = Math.floor(Date.now() / 1000);
    
    // Format question and answers precisely as requested
    let description = "";
    panel.questions.forEach((q, idx) => {
      const ans = answers[idx] || "لا يوجد إجابة";
      description += `## ${idx + 1} - ${q}\n- **${ans}**\n-# ~~                                                                                                                                                                   ~~\n\n`;
    });
    
    // Submission stats layout (white, clean markdown headers description)
    description += `### **Submission stats**\n` +
                   `UserId: \`${user.id}\`\n` +
                   `Username: \`${user.username}\`\n` +
                   `User: <@${user.id}>\n` +
                   `Duration: \`${durationSec}s\`\n` +
                   `Joined guild <t:${joinedStamp}:R>\n` +
                   `Submitted: <t:${submittedStamp}:R>`;
                   
    const embed = new EmbedBuilder()
      .setTitle(panel.title)
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
      .setDescription(description)
      .setColor(0xFFFFFF); // Bright pure white
      
    if (panel.useServerIcon) {
      const serverIcon = guild.iconURL({ extension: "png", forceStatic: false, size: 1024 });
      embed.setThumbnail(serverIcon || "https://cdn.discordapp.com/embed/avatars/0.png");
    }
    
    // Add reviewer acceptance buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`apply_action_accept_${user.id}_${panel.id}`)
        .setLabel("قبول")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`apply_action_reject_${user.id}_${panel.id}`)
        .setLabel("رفض")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`apply_btn_accept_reason_${user.id}_${panel.id}`)
        .setLabel("قبول مع سبب")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`apply_btn_reject_reason_${user.id}_${panel.id}`)
        .setLabel("رفض مع سبب")
        .setStyle(ButtonStyle.Secondary)
    );
    
    // Ping reviewers outside the embed
    const pingContent = panel.allowedRoleId ? `<@&${panel.allowedRoleId}>` : "";
    
    await channel.send({
      content: pingContent || undefined,
      embeds: [embed],
      components: [row]
    });
  } catch (err) {
    console.error("Failed to post submission:", err);
  }
}

async function handleApplicationInteractions(interaction) {
  try {
    const customId = interaction.customId || "";
    const guildId = interaction.guildId;
    
    // 1. Handling apply_start_
    if (customId.startsWith("apply_start_")) {
      const config = guildConfigs.get(guildId) || {};
      const panelId = customId.replace("apply_start_", "");
      const panel = (config.applications?.panels || []).find(p => p.id === panelId);
      if (!panel) {
        return await sendInteractionResponse(interaction, "❌ لم يتم العثور على إعدادات هذا التقديم.", { ephemeral: true });
      }
      
      // Check submit type
      if (panel.submitType === "discord_modal") {
        // Build Discord Modal
        const modal = new ModalBuilder()
          .setCustomId(`apply_modal_submit_${panel.id}`)
          .setTitle(panel.title.substring(0, 45));
          
        const maxQuestions = Math.min((panel.questions || []).length, 5);
        const rows = [];
        for (let i = 0; i < maxQuestions; i++) {
          const qText = panel.questions[i];
          const input = new TextInputBuilder()
            .setCustomId(`q_${i}`)
            .setLabel(qText.substring(0, 45))
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);
          rows.push(new ActionRowBuilder().addComponents(input));
        }
        modal.addComponents(rows);
        await interaction.showModal(modal);
      } else {
        // DM-based steps
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ ephemeral: true }).catch(() => {});
        }
        try {
          const embed = new EmbedBuilder()
            .setTitle(panel.title)
            .setDescription(`هل أنت متأكد من التقديم إلى إدارة سيرفر **${interaction.guild.name}**؟`)
            .setColor(0x5865F2);
            
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`apply_confirm_yes_${guildId}_${panel.id}`)
              .setLabel("أي / نعم")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`apply_confirm_no_${guildId}_${panel.id}`)
              .setLabel("لا / إلغاء")
              .setStyle(ButtonStyle.Danger)
          );
          
          await interaction.user.send({ embeds: [embed], components: [row] });
          await sendInteractionResponse(interaction, "🟢 تم إرسال رسالة التقديم إلى خاصك! يرجى الذهاب للخاص والإجابة على الأسئلة هناك. ✉️", { ephemeral: true });
        } catch (dmErr) {
          await sendInteractionResponse(interaction, "❌ لم نتمكن من مراسلتك في الخاص. يرجى التأكد من فتح خاصك (DMs) أولاً ثم إعادة المحاولة!", { ephemeral: true });
        }
      }
      return;
    }
    
    // 2. DM confirmation buttons inside user private DMs (No guild context exists in interaction!)
    if (customId.startsWith("apply_confirm_yes_")) {
      const parts = customId.replace("apply_confirm_yes_", "").split("_");
      const targetGuildId = parts[0];
      const panelId = parts[1];
      
      const config = guildConfigs.get(targetGuildId) || {};
      const panel = (config.applications?.panels || []).find(p => p.id === panelId);
      if (!panel) {
        return await sendInteractionResponse(interaction, "❌ لم نتمكن من تحديد نموذج التقديم.", { ephemeral: true });
      }
      
      // Start session
      activeDMSubmissions.set(interaction.user.id, {
        guildId: targetGuildId,
        panelId: panelId,
        startTime: Date.now(),
        currentQuestionIndex: 0,
        answers: []
      });
      
      // Send first question
      const firstQ = panel.questions[0];
      const embed = new EmbedBuilder()
        .setTitle(panel.title)
        .setDescription(`**السؤال رقم 1:**\n${firstQ}`)
        .setColor(0x5865F2);
        
      await sendInteractionResponse(interaction, "🟢 تم تفعيل التقديم بنجاح! الإجابات التي ستكتبها تحت هذه الرسالة سيتم توجيهها للبوت كإجابة على الأسئلة.", { embeds: [embed], components: [], update: true });
      return;
    }
    
    if (customId.startsWith("apply_confirm_no_")) {
      await sendInteractionResponse(interaction, "❌ تم إلغاء طلب التقديم بنجاح.", { embeds: [], components: [], update: true });
      return;
    }
    
    // 3. Handling modal submissions
    if (interaction.isModalSubmit() && customId.startsWith("apply_modal_submit_")) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
      }
      const panelId = customId.replace("apply_modal_submit_", "");
      const config = guildConfigs.get(guildId) || {};
      const panel = (config.applications?.panels || []).find(p => p.id === panelId);
      if (!panel) {
        return await sendInteractionResponse(interaction, "❌ حدث خطأ: لم يتم العثور على البانل المحدد للتقديم.", { ephemeral: true });
      }
      
      const answers = [];
      const totalAnswers = Math.min((panel.questions || []).length, 5);
      for (let i = 0; i < totalAnswers; i++) {
        answers.push(interaction.fields.getTextInputValue(`q_${i}`));
      }
      
      await submitApplication({
        guildId: guildId,
        panel: panel,
        user: interaction.user,
        answers: answers,
        startTime: Date.now()
      });
      
      return await sendInteractionResponse(interaction, "🟢 تم إرسال تقديمك بنجاح! شكراً لك.", { ephemeral: true });
    }
    
    // 4. Controlling submission buttons (Accept, Reject)
    const isApplyReviewBtn = customId.startsWith("apply_action_accept_") || 
                             customId.startsWith("apply_action_reject_") || 
                             customId.startsWith("apply_btn_accept_reason_") || 
                             customId.startsWith("apply_btn_reject_reason_");
                             
    if (isApplyReviewBtn) {
      const config = guildConfigs.get(guildId) || {};
      let actionType = "";
      if (customId.startsWith("apply_action_accept_")) actionType = "accept_direct";
      else if (customId.startsWith("apply_action_reject_")) actionType = "reject_direct";
      else if (customId.startsWith("apply_btn_accept_reason_")) actionType = "accept_with_reason";
      else if (customId.startsWith("apply_btn_reject_reason_")) actionType = "reject_with_reason";
      
      const stripped = customId.replace(/apply_action_accept_|apply_action_reject_|apply_btn_accept_reason_|apply_btn_reject_reason_/, "");
      const [applicantId, panelId] = stripped.split("_");
      
      const panel = (config.applications?.panels || []).find(p => p.id === panelId);
      if (!panel) {
        return await sendInteractionResponse(interaction, "❌ لم يتم العثور على إعدادات هذا التقديم.", { ephemeral: true });
      }
      
      // Permission gate
      const hasReviewerRole = panel.allowedRoleId && interaction.member.roles.cache.has(panel.allowedRoleId);
      const isAdministrator = interaction.member.permissions.has("Administrator");
      if (!hasReviewerRole && !isAdministrator) {
        return await sendInteractionResponse(interaction, "❌ ليس لديك صلاحية قبول أو رفض طلبات التقديم هذه.", { ephemeral: true });
      }
      
      // If direct action (Accept/Reject directly)
      if (actionType === "accept_direct" || actionType === "reject_direct") {
        const isAccept = actionType === "accept_direct";
        
        // DM Applicant
        try {
          const applicant = await discordClient.users.fetch(applicantId).catch(() => null);
          if (applicant) {
            const resultEmbed = new EmbedBuilder()
              .setTitle(isAccept ? "🎉 تم قبولك!" : "❌ تم رفض طلبك")
              .setDescription(isAccept 
                ? `مرحباً <@${applicantId}>، نسعد بإعلامك بوقوع القبول على طلب التقديم الخاص بك في سيرفر **${interaction.guild.name}**! 🚀`
                : `مرحباً <@${applicantId}>، نأسف لإعلامك بأنه تم رفض طلب التقديم الخاص بك في سيرفر **${interaction.guild.name}**.`
              )
              .setColor(isAccept ? 0x2ecc71 : 0xe74c3c);
            await applicant.send({ content: `<@${applicantId}>`, embeds: [resultEmbed] }).catch(() => {});
          }
        } catch (dmErr) {}
        
        // Edit original log embed with state
        const originalEmbed = interaction.message.embeds[0];
        const updatedEmbed = EmbedBuilder.from(originalEmbed)
          .setColor(isAccept ? 0x2ecc71 : 0xe74c3c);
          
        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("apply_done_status")
            .setLabel(isAccept ? `مقبول بواسطة ${interaction.user.username}` : `مرفوض بواسطة ${interaction.user.username}`)
            .setStyle(isAccept ? ButtonStyle.Success : ButtonStyle.Danger)
            .setDisabled(true)
        );
        
        try {
          if (!interaction.deferred && !interaction.replied) {
            await interaction.update({ embeds: [updatedEmbed], components: [actionRow] });
          } else {
            await interaction.message.edit({ embeds: [updatedEmbed], components: [actionRow] });
          }
        } catch (editErr) {
          console.error("Failed to edit interaction message:", editErr);
          await interaction.message.edit({ embeds: [updatedEmbed], components: [actionRow] }).catch(() => {});
        }
      } else {
        // Modal Action (Accept/Reject with reason)
        const isAcceptWithReason = actionType === "accept_with_reason";
        const modal = new ModalBuilder()
          .setCustomId(`apply_modal_reason_${isAcceptWithReason ? "accept" : "reject"}_${applicantId}_${panelId}_${interaction.message.id}`)
          .setTitle(isAcceptWithReason ? "قبول مع كتابة سبب" : "رفض مع كتابة سبب");
          
        const reasonInput = new TextInputBuilder()
          .setCustomId("reason")
          .setLabel("السبب / Reason")
          .setPlaceholder("مثال: خبرتك ممتازة أو عدم مطابقة الشروط...")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);
          
        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
      }
      return;
    }
    
    // 5. Handling reason submission modal
    if (interaction.isModalSubmit() && customId.startsWith("apply_modal_reason_")) {
      const parts = customId.replace("apply_modal_reason_", "").split("_");
      const subAction = parts[0]; // accept or reject
      const applicantId = parts[1];
      const panelId = parts[2];
      const messageId = parts[3];
      const isAccept = subAction === "accept";
      
      const reason = interaction.fields.getTextInputValue("reason");
      
      // DM applicant
      try {
        const applicant = await discordClient.users.fetch(applicantId).catch(() => null);
        if (applicant) {
          const resultEmbed = new EmbedBuilder()
            .setTitle(isAccept ? "🎉 تم قبولك!" : "❌ تم رفض طلبك")
            .setDescription(isAccept 
              ? `مرحباً <@${applicantId}>، نسعد بإعلامك بوقوع القبول على طلب التقديم الخاص بك في سيرفر **${interaction.guild.name}**! 🚀`
              : `مرحباً <@${applicantId}>، نأسف لإعلامك بأنه تم رفض طلب التقديم الخاص بك في سيرفر **${interaction.guild.name}**.`
            )
            .addFields({ name: "📌 السبب المعطى:", value: reason || "لا يوجد" })
            .setColor(isAccept ? 0x2ecc71 : 0xe74c3c);
          await applicant.send({ content: `<@${applicantId}>`, embeds: [resultEmbed] }).catch(() => {});
        }
      } catch (dmErr) {}
      
      // Update original message
      const targetMessage = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (targetMessage) {
        const originalEmbed = targetMessage.embeds[0];
        const updatedEmbed = EmbedBuilder.from(originalEmbed)
          .setColor(isAccept ? 0x2ecc71 : 0xe74c3c)
          .addFields({ name: `📌 قرار الإدارة (${isAccept ? "قبول" : "رفض"} بسبب):`, value: `**السبب:** ${reason}\nبواسطة: ${interaction.user.username}` });
          
        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("apply_done_status")
            .setLabel(isAccept ? `مقبول بسبب بواسطة ${interaction.user.username}` : `مرفوض بسبب بواسطة ${interaction.user.username}`)
            .setStyle(isAccept ? ButtonStyle.Success : ButtonStyle.Danger)
            .setDisabled(true)
        );
        
        try {
          if (!interaction.deferred && !interaction.replied) {
            await interaction.update({ embeds: [updatedEmbed], components: [actionRow] });
          } else {
            await targetMessage.edit({ embeds: [updatedEmbed], components: [actionRow] });
          }
        } catch (editErr) {
          console.error("Failed to edit target message:", editErr);
          await targetMessage.edit({ embeds: [updatedEmbed], components: [actionRow] }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error("Failed to handle application interactions:", err);
  }
}

function checkIfInteractionShowsModal(interaction) {
  if (!interaction) return false;
  const customId = interaction.customId || "";
  if (interaction.isButton()) {
    if (customId === "suggestion_publish_btn") return true;
    if (customId.startsWith("broker_open_")) return true;
    if (customId === "ticket_delete_confirm") return true;
    if (customId === "ticket_delete") return true;
    if (customId === "ticket_rename") return true;
    if (customId.startsWith("apply_start_")) {
      const config = guildConfigs.get(interaction.guildId || "") || {};
      const panelId = customId.replace("apply_start_", "");
      const panel = (config.applications?.panels || []).find(p => p.id === panelId);
      if (panel && panel.submitType !== "dm") {
        return true;
      }
    }
    if (customId.startsWith("apply_btn_accept_reason_") || customId.startsWith("apply_btn_reject_reason_")) {
      return true;
    }
    if (customId.startsWith("ticket_open_")) {
      const config = guildConfigs.get(interaction.guildId || "") || {};
      const { opt } = findTicketOptionAndPanel(interaction, config);
      if (opt && opt.question) {
        return true;
      }
    }
  } else if (interaction.isStringSelectMenu()) {
    if (customId === "ticket_control_select") {
      const value = interaction.values?.[0] || "";
      if (value === "ticket_rename") return true;
    }
    if (customId.startsWith("ticket_select_")) {
      const config = guildConfigs.get(interaction.guildId || "") || {};
      const { opt } = findTicketOptionAndPanel(interaction, config);
      if (opt && opt.question) {
        return true;
      }
    }
    if (customId === "broker_rate_select") return true;
    if (customId === "broker_close_rate_select") return true;
  }
  return false;
}
async function handleTicketInteractions(interaction) {
  const customId = interaction.customId;
  
  if (customId === "azkar_start_count" || customId === "azkar_start" || customId === "azkar_next") {
    try {
      if (customId === "azkar_next") {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferUpdate().catch(() => {});
        }
      } else {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ ephemeral: true }).catch(() => {});
        }
      }
    } catch (e) {
      console.error("[Azkar] Defer failed:", e);
    }

    const shortCountingAdhkar = [
      "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ",
      "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
      "سُبْحَانَ اللَّهِ الْعَظِيمِ",
      "الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا",
      "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَلا نَعْبُدُ إِلا إِيَّاهُ",
      "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
      "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ العَلِيِّ العَظِيمِ",
      "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
      "سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ",
      "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
      "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
      "اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
      "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ",
      "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ"
    ];
    const idx = Math.floor(Math.random() * shortCountingAdhkar.length);
    const dhikrText = shortCountingAdhkar[idx];

    // الزر للحصول على ذكر آخر، مع تفعيل المعرف المميز للمتابعة داخل الرسالة المخفية
    const moreRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("azkar_next")
        .setLabel("ذكر آخر 🌸")
        .setEmoji("1513454643483644014") // إيموجي المسبحة
        .setStyle(ButtonStyle.Secondary)
    );

    const payload = {
      content: `📿 **أذكار وأدعية مأثورة**\n\n✨ **\`${dhikrText}\`** ✨\n\n*تأمل الذكر واستحضر النية والتسبيح 🌸*`,
      components: [moreRow]
    };

    try {
      await interaction.editReply(payload);
    } catch (err) {
      console.error("[Azkar] Error handling interaction editReply:", err);
      // محاولة احتياطية آمنة
      try {
        if (!interaction.replied && !interaction.deferred) {
          if (customId === "azkar_next") {
            await interaction.update(payload).catch(() => {});
          } else {
            await interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
          }
        } else {
          await interaction.editReply(payload).catch(() => {});
        }
      } catch (innerErr) {
        console.error("[Azkar] Fallback failed:", innerErr);
      }
    }
    return;
  }

  let action = customId;
  if (interaction.isStringSelectMenu() && customId === "ticket_control_select") {
    action = interaction.values[0];
  }
  const localIds = [
    "script_back",
    "script_next",
    "script_copy",
    "random_join_roulette",
    "leave_roulette",
    "random_kick_roulette",
    "withdraw_roulette"
  ];
  const isLocalCollector = localIds.includes(customId) || customId && (customId.startsWith("join_num_") || customId.startsWith("kick_player_"));
  if (isLocalCollector) return;
  const guildId = interaction.guildId;
  const config = guildId ? guildConfigs.get(guildId) || {} : {};
  const showsModal = checkIfInteractionShowsModal(interaction);
  if (!showsModal && !interaction.deferred && !interaction.replied) {
    try {
      await interaction.deferReply({ ephemeral: true });
    } catch (deferErr) {
      if (deferErr.code === 10062 || deferErr.message?.includes("Unknown interaction")) {
        interaction.expired = true;
        console.warn("[Absolute Top Defer] Interaction expired (transient Discord issue).");
      } else {
        console.error("[Absolute Top Defer Error]", deferErr);
      }
    }
  }
  if (customId?.startsWith("view_profile_")) {
    const parts = customId.split("_");
    const userId = parts[2];
    const targetGuildId = parts[3];
    const embed = await getUserProfileEmbed(userId, targetGuildId);
    return await replyToInteractionSafely(interaction, { embeds: [embed] });
  }
  if (!guildId) return;
  if (interaction.isButton() && customId === "suggestion_publish_btn") {
    console.log(`[Suggestion] Processing button click for user ${interaction.user.id}`);
    const cooldownKey = `suggestion-${interaction.user.id}-${interaction.guildId}`;
    const now = Date.now();
    const lastTime = suggestionCooldowns.get(cooldownKey) || 0;
    const cooldownTime = 10 * 60 * 1e3;
    if (now - lastTime < cooldownTime) {
      console.log(`[Suggestion] Cooldown active for user ${interaction.user.id}`);
      const remainingSeconds = Math.ceil((cooldownTime - (now - lastTime)) / 1e3);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      return await replyToInteractionSafely(interaction, {
        content: `\u0639\u0630\u0631\u0627\u064B\u060C \u064A\u062C\u0628 \u0639\u0644\u064A\u0643 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 **${minutes}** \u062F\u0642\u064A\u0642\u0629 \u0648 **${seconds}** \u062B\u0627\u0646\u064A\u0629 \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0642\u062A\u0631\u0627\u062D \u0622\u062E\u0631. \u23F3`,
        ephemeral: true
      });
    }
    console.log(`[Suggestion] Showing modal to user ${interaction.user.id}`);
    const modal = new ModalBuilder().setCustomId("suggestion_modal_submit").setTitle("\u0646\u0634\u0631 \u0625\u0642\u062A\u0631\u0627\u062D \u{1F4A1}");
    const input = new TextInputBuilder().setCustomId("suggestion_text").setLabel("\u0627\u0643\u062A\u0628 \u0627\u0642\u062A\u0631\u0627\u062D\u0643 \u0647\u0646\u0627").setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder("\u0627\u0643\u062A\u0628 \u0627\u0642\u062A\u0631\u0627\u062D\u0643 \u0647\u0646\u0627...");
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return await showModalSafely(interaction, modal);
  }
  if (interaction.isModalSubmit() && customId === "suggestion_modal_submit") {
    const text = interaction.fields.getTextInputValue("suggestion_text");
    const guildId2 = interaction.guildId;
    const config2 = guildConfigs.get(guildId2) || {};
    suggestionCooldowns.set(`suggestion-${interaction.user.id}-${guildId2}`, Date.now());
    const panel = config2.suggestionPanels?.[0];
    if (!panel || !panel.targetChannelId) {
      return await replyToInteractionSafely(interaction, { content: "System configuration error.", ephemeral: true });
    }
    const targetChannel = interaction.guild.channels.cache.get(panel.targetChannelId);
    if (!targetChannel) return await replyToInteractionSafely(interaction, { content: "Target channel not found.", ephemeral: true });
    let webhook;
    try {
      const webhooks = await targetChannel.fetchWebhooks();
      webhook = webhooks.find((wh) => wh.name === "NTL_Suggestions");
      if (!webhook) {
        webhook = await targetChannel.createWebhook({ name: "NTL_Suggestions" });
      }
    } catch (e) {
      return await replyToInteractionSafely(interaction, { content: "Manage Webhooks permission required.", ephemeral: true });
    }
    const embed = new EmbedBuilder().setDescription(`\u0625\u0642\u062A\u0631\u0627\u062D <:Person:1504602083377287230>: <@${interaction.user.id}>
-# ~~                                                                                                                                                                   ~~
${text}`).setColor(5793266);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("suggestion_publish_btn").setEmoji("1511312840672411741").setLabel("\u0646\u0634\u0631 \u0625\u0642\u062A\u0631\u0627\u062D").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setEmoji("1511327391669026916").setURL("https://ntl-bot-da3m.onrender.com/").setStyle(ButtonStyle.Link)
    );
    const sent = await webhook.send({
      username: interaction.user.username,
      avatarURL: interaction.user.displayAvatarURL(),
      embeds: [embed],
      components: [row]
    });
    if (sent) {
      await targetChannel.messages.fetch(sent.id).then((msg) => msg.startThread({ name: `\u0646\u0642\u0627\u0634: ${text.substring(0, 50)}`, autoArchiveDuration: 1440 })).catch(() => {
      });
    }
    return await replyToInteractionSafely(interaction, { content: "\u062A\u0645 \u0646\u0634\u0631 \u0627\u0642\u062A\u0631\u0627\u062D\u0643 \u0628\u0646\u062C\u0627\u062D! \u2705", ephemeral: true });
  }
  if (interaction.isButton() && customId?.startsWith("broker_open_")) {
    const panelId = customId.substring("broker_open_".length);
    const modal = new ModalBuilder().setCustomId(`broker_modal_${panelId}`).setTitle("\u0641\u062A\u062D \u062A\u0630\u0643\u0631\u0629 \u0648\u0633\u0627\u0637\u0629");
    const input = new TextInputBuilder().setCustomId("commodity").setLabel("\u0645\u0627 \u0627\u0644\u0633\u0644\u0639\u0629 \u0627\u0644\u0645\u062A\u0628\u0627\u062F\u0644\u0629").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("\u0645\u062B\u0627\u0644: \u062D\u0633\u0627\u0628 \u062F\u064A\u0633\u0643\u0648\u0631\u062F\u060C \u0631\u0635\u064A\u062F\u060C \u0627\u0644\u062E...");
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return await showModalSafely(interaction, modal);
  }
  if (interaction.isModalSubmit() && customId?.startsWith("broker_modal_")) {
    const panelId = customId.substring("broker_modal_".length);
    const commodity = interaction.fields.getTextInputValue("commodity");
    const config2 = guildConfigs.get(interaction.guildId) || {};
    const panel = config2.brokerPanels?.find((p) => p.id === panelId);
    if (!panel) return await replyToInteractionSafely(interaction, { content: "Broker panel not found.", ephemeral: true });
    const ticketChannel = await createBrokerTicket(interaction, panel, commodity);
    return await replyToInteractionSafely(interaction, { content: `** \u062A\u0645 \u0627\u0646\u0634\u0627\u0621 \u062A\u0630\u0643\u0631\u0629 \u0627\u0644\u0648\u0633\u0627\u0637\u0629 \u0628\u0646\u062C\u0627\u062D \u2022 <#${ticketChannel.id}> **`, ephemeral: true });
  }
  if (interaction.isModalSubmit() && (customId === "broker_rate_comment_modal" || customId?.startsWith("broker_rate_comment_modal_"))) {
    const comment = interaction.fields.getTextInputValue("comment");
    let rating = "";
    if (customId?.startsWith("broker_rate_comment_modal_")) {
      rating = customId.substring("broker_rate_comment_modal_".length);
    }
    let data = reviewerData.get(interaction.channelId);
    if (!data) {
      const topic2 = interaction.channel?.topic || "";
      const metadata2 = {};
      if (topic2.includes("TicketOwner:")) {
        topic2.split("|").forEach((p) => {
          const [k, v] = p.split(":");
          if (k && v) metadata2[k.trim()] = v.trim();
        });
      }
      data = {
        rating: rating || "\u062C\u064A\u062F \u062C\u062F\u0627\u064B",
        targetChannelId: metadata2.EvaluationChannelId || "",
        brokerId: metadata2.Claimer || "",
        commodity: metadata2.Commodity || "\u0648\u0633\u0627\u0637\u0629"
      };
    } else if (rating) {
      data.rating = rating;
    }
    if (!data.rating) {
      data.rating = rating || "\u062C\u064A\u062F \u062C\u062F\u0627\u064B";
    }
    if (!data.brokerId || data.brokerId === "") {
      const topic2 = interaction.channel?.topic || "";
      const metadata2 = {};
      if (topic2.includes("TicketOwner:")) {
        topic2.split("|").forEach((p) => {
          const [k, v] = p.split(":");
          if (k && v) metadata2[k.trim()] = v.trim();
        });
      }
      data.brokerId = metadata2.Claimer || "";
      data.targetChannelId = data.targetChannelId || metadata2.EvaluationChannelId || "";
      data.commodity = data.commodity || metadata2.Commodity || "\u0648\u0633\u0627\u0637\u0629";
    }
    const guildId2 = interaction.guildId;
    const config2 = guildConfigs.get(guildId2) || {};
    if (data.brokerId) {
      if (!config2.brokerStats) config2.brokerStats = {};
      if (!config2.brokerStats[data.brokerId]) config2.brokerStats[data.brokerId] = { ticketCount: 0 };
      config2.brokerStats[data.brokerId].ticketCount = (config2.brokerStats[data.brokerId].ticketCount || 0) + 1;
      saveConfigs(guildId2);
    }
    const ticketNumber = config2.brokerStats && data.brokerId ? config2.brokerStats[data.brokerId].ticketCount : 1;
    const topic = interaction.channel?.topic || "";
    const metadata = {};
    if (topic.includes("TicketOwner:")) {
      topic.split("|").forEach((p) => {
        const [k, v] = p.split(":");
        if (k && v) metadata[k.trim()] = v.trim();
      });
      metadata.Rated = "true";
      metadata.RatingRating = encodeURIComponent(data.rating);
      metadata.RatingComment = encodeURIComponent(comment);
      const newTopic = Object.entries(metadata).map(([k, v]) => `${k}:${v}`).join("|");
      await interaction.channel?.setTopic(newTopic).catch(() => {
      });
    }
    ratedTickets.add(interaction.channelId);

    const isOwner = interaction.user.id === metadata.TicketOwner;
    if (isOwner) {
      try {
        const fileName = await generateTranscript(interaction.channel).catch(() => null);
        await logBrokerEvaluationOnClose(interaction.guild, interaction.channel, metadata, fileName, interaction.user.id).catch(() => {});
      } catch (err) {
        console.error("Error logging evaluation on immediate close:", err);
      }
      await replyToInteractionSafely(interaction, { content: "**شكراً لتقييمك! تم حفظ تقييمك بنجاح ✅**", ephemeral: true }).catch(() => {});
      await interaction.channel?.send({ content: "**جاري حذف تكت خلال ٥ ثواني... ⏳**" }).catch(() => {});
      setTimeout(async () => {
        await interaction.channel?.delete().catch((err) => console.error("Error deleting channel:", err));
      }, 5000);
      return;
    } else {
      return await replyToInteractionSafely(interaction, { content: "**شكراً لتقييمك! تم حفظ تقييمك بنجاح وسيتم إرسال المعلومات عند إغلاق التذكرة. ✅**", ephemeral: false });
    }
  }
  if (interaction.isModalSubmit() && customId?.startsWith("broker_close_rate_comment_modal_")) {
    const rating = customId.substring("broker_close_rate_comment_modal_".length);
    const comment = interaction.fields.getTextInputValue("comment");
    const channel = interaction.channel;
    const topic = channel?.topic || "";
    const metadata = {};
    let isAlreadyCounted = false;
    if (topic.includes("TicketOwner:")) {
      topic.split("|").forEach((p) => {
        const [k, v] = p.split(":");
        if (k && v) metadata[k.trim()] = v.trim();
      });
      isAlreadyCounted = (metadata.Rated === "true");
      metadata.Rated = "true";
      metadata.RatingRating = encodeURIComponent(rating);
      metadata.RatingComment = encodeURIComponent(comment);
      const newTopic = Object.entries(metadata).map(([k, v]) => `${k}:${v}`).join("|");
      await channel?.setTopic(newTopic).catch(() => {});
    }
    const brokerId = metadata.Claimer;
    const guildId2 = interaction.guild?.id;
    if (brokerId && guildId2 && !isAlreadyCounted) {
      const config3 = guildConfigs.get(guildId2) || {};
      if (!config3.brokerStats) config3.brokerStats = {};
      if (!config3.brokerStats[brokerId]) config3.brokerStats[brokerId] = { ticketCount: 0 };
      config3.brokerStats[brokerId].ticketCount = (config3.brokerStats[brokerId].ticketCount || 0) + 1;
      saveConfigs(guildId2);
    }
    try {
      const fileName = await generateTranscript(channel).catch(() => null);
      await logBrokerEvaluationOnClose(interaction.guild, channel, metadata, fileName, interaction.user.id);
      
      const isOwner = interaction.user.id === metadata.TicketOwner;
      if (isOwner) {
        await replyToInteractionSafely(interaction, { content: "**شكراً لتقييمك! تم حفظ تقييمك بنجاح ✅**", ephemeral: true }).catch(() => {});
        await channel.send({ content: "**جاري حذف تكت خلال ٥ ثواني... ⏳**" }).catch(() => {});
        setTimeout(async () => {
          await channel.delete().catch((err) => console.error("Error deleting channel:", err));
        }, 5000);
        return;
      }

      const embed = new EmbedBuilder()
        .setDescription("**\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u062A\u0642\u064A\u064A\u0645! \u0647\u0644 \u0627\u0646\u062A \u0645\u062A\u0627\u0643\u062F \u0645\u0646 \u0642\u0641\u0644 \u0627\u0644\u062A\u0630\u0643\u0631\u0629\u061F \u{1F512}**")
        .setColor(16711680);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket_owner_close_yes").setLabel("\u0646\u0639\u0645").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("ticket_owner_close_no").setLabel("\u0644\u0627").setStyle(ButtonStyle.Secondary)
      );
      await channel.send({ embeds: [embed], components: [row] });
      await replyToInteractionSafely(interaction, { content: "**\u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0642\u064A\u064A\u0645\u0643! \u062A\u0645 \u062D\u0641\u0638 \u062A\u0642\u064A\u064A\u0645\u0643 \u0628\u0646\u062C\u0627\u062D. \u064A\u0631\u062C\u0649 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062D\u0630\u0641 \u0645\u0646 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0623\u062F\u0646\u0627\u0647.**", ephemeral: true });
      return;
    } catch (err) {
      console.error("Error generating broker close evaluation transcript:", err);
    }
    return await replyToInteractionSafely(interaction, { content: "**\u062A\u0645 \u062D\u0641\u0638 \u062A\u0642\u064A\u064A\u0645\u0643!**", ephemeral: true });
  }
  if (interaction.isButton() && customId === "verify_button") {
    const verif = config.verification;
    if (!verif || !verif.enabled) {
      return await replyToInteractionSafely(interaction, { content: config.language === "ar" ? "\u274C \u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0648\u062B\u064A\u0642 \u063A\u064A\u0631 \u0645\u0641\u0639\u0644 \u062D\u0627\u0644\u064A\u0627\u064B." : "\u274C Verification system is currently disabled.", ephemeral: true });
    }
    try {
      const member = interaction.member;
      if (verif.addRoleId) {
        await member.roles.add(verif.addRoleId);
      }
      if (verif.removeRoleId && member.roles.cache.has(verif.removeRoleId)) {
        await member.roles.remove(verif.removeRoleId);
      }
      const successMsg = config.language === "ar" ? `\u2705 \u062A\u0645 \u062A\u0648\u062B\u064A\u0642 \u062D\u0633\u0627\u0628\u0643 \u0628\u0646\u062C\u0627\u062D! \u062A\u0645 \u0645\u0646\u062D\u0643 \u0631\u062A\u0628\u0629 \u0627\u0644\u062A\u0648\u062B\u064A\u0642.` : `\u2705 Your account has been verified successfully!`;
      await replyToInteractionSafely(interaction, { content: successMsg });
    } catch (err) {
      console.error("Error during verification:", err);
      const errMsg = config.language === "ar" ? `\u274C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u062A\u0648\u062B\u064A\u0642: \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0623\u0646 \u0631\u062A\u0628\u0629 \u0627\u0644\u0628\u0648\u062A \u0623\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u0631\u062A\u0628 \u0627\u0644\u0645\u0645\u0646\u0648\u062D\u0629.` : `\u274C Verification failed. Ensure the bot's role is positioned higher than the assigned roles.`;
      await replyToInteractionSafely(interaction, { content: errMsg });
    }
    return;
  }
  if (interaction.isButton() && customId?.startsWith("btn_role_")) {
    const roleId = customId.substring(9);
    try {
      const member = interaction.member;
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        await replyToInteractionSafely(interaction, {
          content: config.language === "ar" ? "\u{1F5D1}\uFE0F \u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0631\u062A\u0628\u0629 \u0645\u0646\u0643 \u0628\u0646\u062C\u0627\u062D." : "\u{1F5D1}\uFE0F Role removed successfully."
        });
      } else {
        await member.roles.add(roleId);
        await replyToInteractionSafely(interaction, {
          content: config.language === "ar" ? "\u2705 \u062A\u0645 \u0645\u0646\u062D\u0643 \u0627\u0644\u0631\u062A\u0628\u0629 \u0628\u0646\u062C\u0627\u062D." : "\u2705 Role assigned successfully."
        });
      }
    } catch (err) {
      console.error("Error inside button role handler:", err);
      await replyToInteractionSafely(interaction, {
        content: config.language === "ar" ? "\u274C \u062A\u0639\u0630\u0631 \u062A\u0639\u062F\u064A\u0644 \u0631\u062A\u0628\u0643. \u062A\u0623\u0643\u062F \u0645\u0646 \u0623\u0646 \u0631\u062A\u0628\u0629 \u0627\u0644\u0628\u0648\u062A \u0623\u0639\u0644\u0649 \u0645\u0650\u0645\u0651\u0646 \u062A\u0631\u064A\u062F \u0625\u0639\u0637\u0627\u0626\u0647 \u0648\u0644\u062F\u064A\u0647 \u0643\u0627\u0645\u0644 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A." : "\u274C Failed to update roles. Make sure the bot has adequate permissions."
      });
    }
    return;
  }
  if (interaction.isButton() && customId?.startsWith("eb_btn_")) {
    const parts = customId.split("_");
    const embedId = parts[2];
    const buttonId = parts[3];
    const savedEmbeds = config.savedEmbeds || [];
    const embed = savedEmbeds.find((e) => e.id === embedId);
    const btn = embed?.buttons?.find((b) => b.id === buttonId);
    if (!btn) {
      return await replyToInteractionSafely(interaction, { content: config.language === "ar" ? "\u274C \u062A\u0639\u0630\u0631 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0647\u0630\u0627 \u0627\u0644\u0632\u0631 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A." : "\u274C Interactive button settings not found." });
    }
    if (btn.actionType === "role" && btn.roleId) {
      try {
        const member = interaction.member;
        if (member.roles.cache.has(btn.roleId)) {
          await member.roles.remove(btn.roleId);
          await replyToInteractionSafely(interaction, {
            content: config.language === "ar" ? "\u{1F5D1}\uFE0F \u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0631\u062A\u0628\u0629 \u0645\u0646\u0643 \u0628\u0646\u062C\u0627\u062D." : "\u{1F5D1}\uFE0F Role removed successfully."
          });
        } else {
          await member.roles.add(btn.roleId);
          await replyToInteractionSafely(interaction, {
            content: config.language === "ar" ? "\u2705 \u062A\u0645 \u0645\u0646\u062D\u0643 \u0627\u0644\u0631\u062A\u0628\u0629 \u0628\u0646\u062C\u0627\u062D." : "\u2705 Role assigned successfully."
          });
        }
      } catch (err) {
        console.error("Error inside custom embed button role handler:", err);
        await replyToInteractionSafely(interaction, {
          content: config.language === "ar" ? "\u274C \u062A\u0639\u0630\u0631 \u062A\u0639\u062F\u064A\u0644 \u0631\u062A\u0628\u0643. \u062A\u0623\u0643\u062F \u0645\u0646 \u0623\u0646 \u0631\u062A\u0628\u0629 \u0627\u0644\u0628\u0648\u062A \u0623\u0639\u0644\u0649 \u0645\u0650\u0645\u0651\u0646 \u062A\u0631\u064A\u062F \u0625\u0639\u0637\u0627\u0626\u0647 \u0648\u0644\u062F\u064A\u0647 \u0643\u0627\u0645\u0644 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A." : "\u274C Failed to update roles. Make sure the bot has adequate permissions."
        });
      }
    } else if (btn.actionType === "ephemeral" && btn.ephemeralText) {
      await replyToInteractionSafely(interaction, { content: btn.ephemeralText });
    } else {
      await replyToInteractionSafely(interaction, { content: "\u2714\uFE0F" });
    }
    return;
  }
  if (interaction.isStringSelectMenu() && customId?.startsWith("eb_sel_")) {
    const embedId = customId.substring(7);
    const optionId = interaction.values[0];
    const savedEmbeds = config.savedEmbeds || [];
    const embed = savedEmbeds.find((e) => e.id === embedId);
    const opt = embed?.selectOptions?.find((o) => o.id === optionId);
    if (!opt) {
      return await replyToInteractionSafely(interaction, { content: config.language === "ar" ? "\u274C \u062A\u0639\u0630\u0631 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0647\u0630\u0627 \u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u0645\u062D\u062F\u062F." : "\u274C Selected option settings not found." });
    }
    if (opt.actionType === "role" && opt.roleId) {
      try {
        const member = interaction.member;
        if (member.roles.cache.has(opt.roleId)) {
          await member.roles.remove(opt.roleId);
          await replyToInteractionSafely(interaction, {
            content: config.language === "ar" ? "\u{1F5D1}\uFE0F \u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0631\u062A\u0628\u0629 \u0645\u0646\u0643 \u0628\u0646\u062C\u0627\u062D." : "\u{1F5D1}\uFE0F Role removed successfully."
          });
        } else {
          await member.roles.add(opt.roleId);
          await replyToInteractionSafely(interaction, {
            content: config.language === "ar" ? "\u2705 \u062A\u0645 \u0645\u0646\u062D\u0643 \u0627\u0644\u0631\u062A\u0628\u0629 \u0628\u0646\u062C\u0627\u062D." : "\u2705 Role assigned successfully."
          });
        }
      } catch (err) {
        console.error("Error inside custom embed select option role handler:", err);
        await replyToInteractionSafely(interaction, {
          content: config.language === "ar" ? "\u274C \u062A\u0639\u0630\u0631 \u062A\u0639\u062F\u064A\u0644 \u0631\u062A\u0628\u0643. \u062A\u0623\u0643\u062F \u0645\u0646 \u0623\u0646 \u0631\u062A\u0628\u0629 \u0627\u0644\u0628\u0648\u062A \u0623\u0639\u0644\u0649 \u0645\u0650\u0645\u0651\u0646 \u062A\u0631\u064A\u062F \u0625\u0639\u0637\u0627\u0626\u0647 \u0648\u0644\u062F\u064A\u0647 \u0643\u0627\u0645\u0644 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A." : "\u274C Failed to update roles. Make sure the bot has adequate permissions."
        });
      }
    } else if (opt.actionType === "ephemeral" && opt.ephemeralText) {
      await replyToInteractionSafely(interaction, { content: opt.ephemeralText });
    } else {
      await replyToInteractionSafely(interaction, { content: "\u2714\uFE0F" });
    }
    return;
  }
  console.log(`[Interaction] Guild: ${guildId}, CustomId: ${customId}, Type: ${interaction.type}`);
  if (customId?.startsWith("ticket_open_") || customId?.startsWith("ticket_select_") || customId?.startsWith("ticket_modal_")) {
    const userLockKey = `${interaction.guildId}-${interaction.user.id}`;
    if (activeTicketCreations.has(userLockKey)) {
      return await replyToInteractionSafely(interaction, { content: config.language === "ar" ? "⚠️ هناك تذكرة جاري إنشاؤها بالفعل لك، يرجى الانتظار." : "⚠️ A ticket is already being created for you, please wait.", ephemeral: true });
    }
    activeTicketCreations.add(userLockKey);
    try {
      if (!interaction.isModalSubmit()) {
        await replyToInteractionSafely(interaction, { content: "**جاري إنشاء التذكرة | <a:Reload:1503390770491818088> **", ephemeral: true });
      }
    } catch (e) {
      console.error("Early reply modal submit failed:", e);
    }
    const { panel, opt } = findTicketOptionAndPanel(interaction, config);
    let reason = "";
    if (interaction.isModalSubmit()) {
      reason = interaction.fields.getTextInputValue("reason");
    }
    try {
      return await createNewTicket(interaction, panel, opt, reason, userLockKey);
    } finally {
      activeTicketCreations.delete(userLockKey);
    }
  }
  if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isModalSubmit()) {
    const topic = interaction.channel?.topic || "";
    const config2 = guildConfigs.get(interaction.guildId || "") || {};
    const isTicketAction = customId?.startsWith("ticket_") || interaction.isStringSelectMenu() && customId === "ticket_control_select";
    const hasTicketTopic = topic.includes("TicketOwner:");
    const isKnownTicketId = (config2?.tickets?.activeTickets || []).includes(interaction.channelId);
    const isControlAction = isTicketAction && !customId?.startsWith("ticket_open_") && !customId?.startsWith("ticket_select_") && !customId?.startsWith("ticket_modal_");
    if (isControlAction && !hasTicketTopic && !isKnownTicketId) {
      const name = interaction.channel?.name?.toLowerCase() || "";
      if (!name.includes("ticket") && !name.includes("\u062A\u0643\u062A")) {
        return;
      }
    } else if (!hasTicketTopic && !isKnownTicketId && !isTicketAction) {
      return;
    }
    const metadata = {};
    if (topic.includes("TicketOwner:")) {
      topic.split("|").forEach((p) => {
        const [k, v] = p.split(":");
        if (k && v) metadata[k.trim()] = v.trim();
      });
    }
    const isOwner = interaction.user.id === metadata.TicketOwner;
    const isClaimer = interaction.user.id === metadata.Claimer;
    const isStaff = metadata.StaffRoles?.split(",").some((rid) => interaction.member?.roles.cache.has(rid)) || interaction.member?.permissions.has(PermissionFlagsBits.Administrator);
    let action2 = customId;
    if (interaction.isStringSelectMenu() && customId === "ticket_control_select") {
      action2 = interaction.values[0];
    }
    if (action2 === "ticket_claim") {
      if (!isStaff) return await replyToInteractionSafely(interaction, { content: "Only staff can claim tickets.", ephemeral: true });
      if (isOwner) return await replyToInteractionSafely(interaction, { content: "You cannot claim your own ticket.", ephemeral: true });
      if (metadata.Claimer) return await replyToInteractionSafely(interaction, { content: "Ticket already claimed.", ephemeral: true });
      const claimEmbed = new EmbedBuilder()
        .setDescription(`**\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 <@${interaction.user.id}><:Take:1503025317004968016>**`)
        .setColor(5793266);
      await interaction.channel.send({ embeds: [claimEmbed] }).catch(() => {
      });
      await replyToInteractionSafely(interaction, { content: "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0628\u0646\u062C\u0627\u062D.", ephemeral: false }).catch(() => {
      });
            metadata.Claimer = interaction.user.id;
      const newTopic = Object.entries(metadata).map(([k, v]) => `${k}:${v}`).join("|");
      await interaction.channel.setTopic(newTopic).catch(() => {
      });
      if (interaction.message) {
        try {
          const selectRow = interaction.message.components[0];
          const buttonsRow = interaction.message.components[1];
          const updatedComponents = [];
          if (selectRow && selectRow.components[0]) {
            const select = StringSelectMenuBuilder.from(selectRow.components[0]);
            const options = select.options.map((opt) => {
              const data = opt.data;
              if (data.value === "ticket_claim") {
                return { ...data, label: `Claimed by ${interaction.user.username}`, default: false };
              }
              return data;
            });
            select.setOptions(options);
            updatedComponents.push(new ActionRowBuilder().addComponents(select));
          }
          if (buttonsRow && buttonsRow.components[0]) {
            const claimBtn = ButtonBuilder.from(buttonsRow.components[0]);
            claimBtn.setLabel(`\u0627\u0633\u062A\u0644\u0645\u062A \u0628\u0648\u0627\u0633\u0637\u0629 ${interaction.user.username}`).setDisabled(true).setStyle(ButtonStyle.Secondary);
            const deleteBtn = ButtonBuilder.from(buttonsRow.components[1]);
            updatedComponents.push(new ActionRowBuilder().addComponents(claimBtn, deleteBtn));
          }
          await interaction.message.edit({ components: updatedComponents }).catch(() => {});
        } catch (e) {
          console.error("Error updating claim button/inputs:", e);
        }
      }
    } else if (action2 === "ticket_support") {
      if (!isOwner) return await replyToInteractionSafely(interaction, { content: "Only the ticket owner can use this.", ephemeral: true });
      const now = Date.now();
      const lastSupport = ticketCooldowns.get(interaction.channelId) || 0;
      if (now - lastSupport < 5 * 60 * 1e3) {
        return await replyToInteractionSafely(interaction, { content: "You can use this again in 5 minutes.", ephemeral: true });
      }
      ticketCooldowns.set(interaction.channelId, now);
      const rolesToMention = metadata.StaffRoles?.split(",").map((rid) => `<@&${rid}>`).join(" ") || "";
      const supportEmbed = new EmbedBuilder().setDescription(`>>> **\u062A\u0645 \u0637\u0644\u0628 \u0627\u0644\u062F\u0639\u0645 \u0628\u0648\u0627\u0633\u0637\u0629 <@${interaction.user.id}>**`).setColor(5793266);
      await replyToInteractionSafely(interaction, { content: "Staff alerted.", ephemeral: true }).catch(() => {
      });
      await interaction.channel.send({ content: `** \u064A\u0631\u062C\u0649 \u062D\u0636\u0648\u0631 \u0627\u062D\u062F \u0627\u0644\u0645\u0634\u0631\u0641\u064A\u0646 | ${rolesToMention}**`, embeds: [supportEmbed] }).catch(() => {
      });
    } else if (action2 === "ticket_add" || action2 === "ticket_remove") {
      if (!isClaimer && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await replyToInteractionSafely(interaction, { content: "Only the person who claimed the ticket can do this.", ephemeral: true });
      }
      const select = new UserSelectMenuBuilder().setCustomId(action2 === "ticket_add" ? "ticket_do_add" : "ticket_do_remove").setPlaceholder(action2 === "ticket_add" ? "Select users to add" : "Select users to remove").setMinValues(1).setMaxValues(5);
      await replyToInteractionSafely(interaction, {
        content: `** \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0634\u062E\u0635 \u0627\u0644\u0645\u0631\u0627\u062F ${action2 === "ticket_add" ? "\u0625\u0636\u0627\u0641\u062A\u0647" : "\u0625\u0632\u0627\u0644\u062A\u0647"}**`,
        components: [new ActionRowBuilder().addComponents(select)],
        ephemeral: true
      });
    } else if (customId === "ticket_do_add" || customId === "ticket_do_remove") {
      if (!isClaimer && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await replyToInteractionSafely(interaction, { content: "Only the claimer can use this.", ephemeral: true });
      }
      const userIds = interaction.values || [];
      for (const id of userIds) {
        if (customId === "ticket_do_add") {
          await interaction.channel.permissionOverwrites.edit(id, { ViewChannel: true, SendMessages: true }).catch(() => {
          });
        } else {
          await interaction.channel.permissionOverwrites.delete(id).catch(() => {
          });
        }
      }
      const names = userIds.map((uid) => `<@${uid}>`).join(", ");
      await replyToInteractionSafely(interaction, { content: `**${customId === "ticket_do_add" ? "Added/Updated" : "Removed"} ${names}**` });
    } else if (action2 === "ticket_come") {
      if (!isClaimer) return await replyToInteractionSafely(interaction, { content: "Only the claimer can use this.", ephemeral: true });
      const owner = await interaction.guild.members.fetch(metadata.TicketOwner).catch(() => null);
      if (owner) {
        const embed = new EmbedBuilder().setTitle(`__\u0627\u0633\u062A\u062F\u0639\u0627\u0621 \u0645\u0646 \u0633\u064A\u0631\u0641\u0631 ${interaction.guild.name}__`).setDescription(`>>> **\u0644\u0642\u062F \u062A\u0645 \u0627\u0633\u062A\u062F\u0639\u0627\u0626\u0643 \u0641\u064A \u0627\u0644\u062A\u0643\u062A ${interaction.channel.name}**
**\u0628\u0648\u0627\u0633\u0637\u0629 <@${interaction.user.id}>**
**\u0631\u0627\u0628\u0637 \u0645\u0628\u0627\u0634\u0631 \u0644\u0644\u0631\u0648\u0645 [\u0647\u0646\u0627](https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id})**`).setColor(5793266);
        const icon = interaction.guild.iconURL({ extension: "png", forceStatic: false, size: 1024 });
        embed.setThumbnail(icon || "https://cdn.discordapp.com/embed/avatars/0.png");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel("Go to Ticket").setURL(`https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}`).setStyle(ButtonStyle.Link)
        );
        const sent = await owner.send({ embeds: [embed], components: [row] }).then(() => true).catch(() => false);
        if (sent) {
          await replyToInteractionSafely(interaction, { content: "\u0644\u0642\u062F \u062A\u0645 \u0627\u0633\u062A\u062F\u0639\u0627\u0621 \u0627\u0644\u0634\u062E\u0635 \u0628\u0646\u062C\u0627\u062D\u2705" });
        } else {
          await replyToInteractionSafely(interaction, { content: "\u062A\u0639\u0630\u0631 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u062E\u0627\u0635\u0629 \u0644\u0644\u0639\u0636\u0648 (\u0642\u062F \u062A\u0643\u0648\u0646 \u0631\u0633\u0627\u0626\u0644\u0647 \u0627\u0644\u062E\u0627\u0635\u0629 \u0645\u063A\u0644\u0642\u0629)." });
        }
      } else {
        await replyToInteractionSafely(interaction, { content: "Could not find ticket owner." });
      }
    } else if (action2 === "ticket_rename") {
      if (!isClaimer) return await replyToInteractionSafely(interaction, { content: "Only the claimer can use this.", ephemeral: true });
      const modal = new ModalBuilder().setCustomId("ticket_rename_modal").setTitle("Rename Ticket");
      const input = new TextInputBuilder().setCustomId("new_name").setLabel("New Name").setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await showModalSafely(interaction, modal);
    } else if (customId === "ticket_rename_modal") {
      const newName = interaction.fields.getTextInputValue("new_name").replace(/ /g, "\u2800");
      await replyToInteractionSafely(interaction, { content: `**Done changed name to ${newName}**`, ephemeral: true });
      await interaction.channel.setName(newName).catch(() => {
      });
    } else if (action2 === "ticket_lock") {
      if (!isStaff && !isClaimer) return await replyToInteractionSafely(interaction, { content: "Only staff or the claimer can lock the ticket.", ephemeral: true });
      await replyToInteractionSafely(interaction, { content: "**\u062C\u0627\u0631\u064A \u0642\u0641\u0644 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0648\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0633\u062C\u0644... <a:Reload:1503390770491818088> **" });
      await interaction.channel.permissionOverwrites.edit(metadata.TicketOwner, { SendMessages: false }).catch(() => {
      });
      try {
        const fileName = await generateTranscript(interaction.channel).catch(() => null);
        const appUrl = process.env.APP_URL || "https://localhost";
        const embed = new EmbedBuilder().setDescription(`**\u062A\u0645 \u0642\u0641\u0644 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0628\u0646\u062C\u0627\u062D \u0648\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0633\u062C\u0644 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 <:lock:1508473927347736726>**`).setColor(5793266);
        const row = new ActionRowBuilder();
        if (fileName) {
          row.addComponents(
            new ButtonBuilder().setLabel("View Ticket History (Download)").setURL(`${appUrl}/transcripts/${fileName}`).setStyle(ButtonStyle.Link)
          );
        }
        await interaction.channel.send({ embeds: [embed], components: row.components.length > 0 ? [row] : [] }).catch(() => {
        });
      } catch (err) {
        console.error("Lock transcript error:", err);
      }
    } else if (action2 === "ticket_delete") {
      const isBroker = !!metadata.BrokerPanel;
      const isClaimed = !!metadata.Claimer;
      const isAlreadyRated = metadata.Rated === "true";
      
      // If it's a broker ticket, it was claimed, and not yet rated -> Show rating prompt
      // We removed the isOwner restriction so even if staff/broker clicks delete, the rating menu appears for the owner to use.
      if (isBroker && isClaimed && !isAlreadyRated) {
        const embed = new EmbedBuilder()
          .setDescription("**\u064A\u0631\u062C\u0649 \u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0648\u0633\u064A\u0637 \u0623\u0648\u0644\u0627\u064B \u0644\u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u2B50**")
          .setColor(5793266);
          
        const select = new StringSelectMenuBuilder()
          .setCustomId("broker_close_rate_select")
          .setPlaceholder("\u0627\u062E\u062A\u0631 \u0627\u0644\u062A\u0642\u064A\u064A\u0645...")
          .addOptions([
            { label: "\u0645\u0628\u062A\u062F\u0626", value: "\u0645\u0628\u062A\u062F\u0626", emoji: "\u2B50" },
            { label: "\u0645\u062A\u0648\u0633\u0637", value: "\u0645\u062A\u0648\u0633\u0637", emoji: "\u2B50" },
            { label: "\u062C\u064A\u062F", value: "\u062C\u064A\u062F", emoji: "\u2B50" },
            { label: "\u062C\u064A\u062F \u062C\u062F\u0627\u064B", value: "\u062C\u064A\u062F \u062C\u062F\u0627\u064B", emoji: "\u2B50" },
            { label: "\u0627\u0633\u0637\u0648\u0631\u064A", value: "\u0627\u0633\u0637\u0648\u0631\u064A", emoji: "\u{1F525}" }
          ]);
          
        await interaction.channel.send({
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(select)]
        });
        await replyToInteractionSafely(interaction, { content: "\u0641\u062A\u062D \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062A\u0642\u064A\u064A\u0645...", ephemeral: true });
      } else {
        // Regular Flow: Just ask for confirmation
        const embed = new EmbedBuilder()
          .setDescription("**\u0647\u0644 \u0627\u0646\u062A \u0645\u062A\u0627\u0643\u062F \u0645\u0646 \u0642\u0641\u0644 \u0627\u0644\u062A\u0630\u0643\u0631\u0629\u061F \u{1F512}**")
          .setColor(16711680);
          
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("ticket_owner_close_yes").setLabel("\u0646\u0639\u0645").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId("ticket_owner_close_no").setLabel("\u0644\u0627").setStyle(ButtonStyle.Secondary)
        );
        
        await interaction.channel.send({ embeds: [embed], components: [row] });
        await replyToInteractionSafely(interaction, { content: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u062A\u0623\u0643\u064A\u062F \u0642\u0641\u0644 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0641\u064A \u0627\u0644\u0642\u0646\u0627\u0629.", ephemeral: true });
      }
    } else if (customId === "ticket_owner_close_yes") {
      const isOwner = interaction.user.id === metadata.TicketOwner;
      const isClaimer = interaction.user.id === metadata.Claimer;
      const isStaff = metadata.StaffRoles?.split(",").some((rid) => interaction.member?.roles?.cache?.has(rid)) || interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
      if (!isOwner && !isClaimer && !isStaff) {
        return await replyToInteractionSafely(interaction, { content: "\u0639\u0630\u0631\u0627\u064B\u060C \u0641\u0642\u0637 \u0635\u0627\u062D\u0628 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0623\u0648 \u0627\u0644\u0645\u0633\u062A\u0644\u0645 \u0623\u0648 \u0627\u0644\u0645\u0634\u0FE2\u064A\u0646 \u064A\u0645\u0643\u0646\u0647\u0645 \u0642\u0641\u0644 \u0627\u0644\u062A\u0630\u0643\u0631\u0629.", ephemeral: true });
      }

      const ticketNoMatch = interaction.channel.name.match(/\d+/);
      const ticketNo = ticketNoMatch ? ticketNoMatch[0] : "ticket";
      const newName = `closed-${ticketNo}`;
      await interaction.channel.setName(newName).catch(() => {});

      if (metadata.TicketOwner) {
        await interaction.channel.permissionOverwrites.edit(metadata.TicketOwner, {
          ViewChannel: false
        }).catch(() => {});
      }

      const updateEmbed = new EmbedBuilder()
        .setDescription("**\u0647\u0644 \u0627\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u062D\u0630\u0641 \u0627\u0644\u062A\u0630\u0643\u0631\u0629\u061F \u{1F5D1}**")
        .setColor(16711680);
      const updateRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket_claimer_delete_confirm").setLabel("\u062D\u0630\u0641").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("ticket_claimer_delete_cancel").setLabel("\u062A\u0631\u0627\u062C\u0639").setStyle(ButtonStyle.Secondary)
      );

      await interaction.message.edit({ embeds: [updateEmbed], components: [updateRow] }).catch(() => {});
      await replyToInteractionSafely(interaction, { content: "**تم قفل التذكرة وإخفاؤها عن صاحب التذكرة.**", ephemeral: true });

    } else if (customId === "ticket_owner_close_no") {
      const isOwner = interaction.user.id === metadata.TicketOwner;
      const isClaimer = interaction.user.id === metadata.Claimer;
      const isStaff = metadata.StaffRoles?.split(",").some((rid) => interaction.member?.roles?.cache?.has(rid)) || interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
      if (!isOwner && !isClaimer && !isStaff) {
        return await replyToInteractionSafely(interaction, { content: "\u0639\u0630\u0631\u0627\u064B\u060C \u0641\u0642\u0637 \u0635\u0627\u062D\u0628 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0623\u0648 \u0627\u0644\u0645\u0634\u0631\u0641\u064A\u0646 \u064A\u0FE3\u0643\u0646\u0647\u0645 \u0625\u0644\u063A\u0627\u0621 \u0642\u0641\u0644 \u0627\u0644\u0FEAE\u0630\uFEAE\u0631\u0629.", ephemeral: true });
      }
      await interaction.message.delete().catch(() => {});
      await replyToInteractionSafely(interaction, { content: "**\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0637\u0644\u0628 \u0627\u0644\u0642\u0641\u0644 \u0648\u062D\u0630\u0641 \u0627\u0644\u0631\u0633\u0627\u0644\u0629.**", ephemeral: true });

    } else if (customId === "ticket_claimer_delete_cancel") {
      const isClaimer = interaction.user.id === metadata.Claimer;
      const isStaff = metadata.StaffRoles?.split(",").some((rid) => interaction.member?.roles?.cache?.has(rid)) || interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
      if (!isClaimer && !isStaff) {
        return await replyToInteractionSafely(interaction, { content: "\u0639\u0630\u0631\u0627\u064B\u060C \u0FE1\u0642\u0637 \u0627\u0644\u0645\u0633\u062A\u0644\u0645 \u0623\u0648 \u0627\u0644\u0645\u0634\u0631\u0FE2\u064A\u0646 \u064A\u0645\u0643\u0646\u0647\u0645 \u0627\u0644\u062A\u0631\u0627\u062C\u0639.", ephemeral: true });
      }
      await interaction.message.delete().catch(() => {});
      await replyToInteractionSafely(interaction, { content: "**\u062A\u0645 \u0627\u0644\u062A\u0631\u0627\u062C\u0639 \u0648\u0FEAE\u0630\u0641 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u062A\u0623\u0643\u064A\u062F.**", ephemeral: true });

    } else if (customId === "ticket_claimer_delete_confirm") {
      const isClaimer = interaction.user.id === metadata.Claimer;
      const isStaff = metadata.StaffRoles?.split(",").some((rid) => interaction.member?.roles?.cache?.has(rid)) || interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
      if (!isClaimer && !isStaff) {
        return await replyToInteractionSafely(interaction, { content: "**\u0639\u0630\u0631\u0627\u064B\u060C \u0627\u0644\u0645\u0633\u062A\u0644\u0645 \u0641\u0642\u0637 \u0645\u0646 \u064A\u0645\u0643\u0646\u0647 \u062D\u0630\u0641 \u0627\u0644\u062A\u0630\u0643\u0631\u0629!**", ephemeral: true });
      }

      await interaction.message.edit({ content: "**\u062C\u0627\u0631\u064A \u062D\u0630\u0641 \u0627\u0644\u062A\u0630\u0643\u0631\u0629... \u23F1\uFE0F**", embeds: [], components: [] }).catch(() => {});
      const channel = interaction.channel;
      try {
        const fileName = await generateTranscript(channel).catch(() => null);
        await logBrokerEvaluationOnClose(interaction.guild, channel, metadata, fileName, interaction.user.id);
        const createdAt = metadata.CreatedAt ? parseInt(metadata.CreatedAt) : Date.now();
        const closedAt = Date.now();
        const openerId = metadata.TicketOwner;
        const closerId = interaction.user.id;
        const guildId3 = interaction.guild?.id;
        if (guildId3) {
          const dmEmbed = new EmbedBuilder().setTitle("**\u062A\u0641\u0627\u0635\u064A\u0644 \u063A\u0644\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629**").setDescription(`
> \u062A\u0645 \u0641\u062A\u062D \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 <:Ticketopened:1504561972098895972> :
- <@${openerId || "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}>
> \u062A\u0645 \u0625\u063A\u0644\u0FEAE\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 <:Ticketclosed:1504561975533768734> : 
- <@${closerId}>
> \u0648\u0642\u062A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 <:Timereal:1504562010459738223> :
- <t:${Math.floor(createdAt / 1e3)}:F>
> \u0648\u0642\u062A \u0625\u063A\u0644\u0627\u0642 \u0627\uFEAE\u0630\u0643\u0631\u0629 <:Timereal:1504562010459738223> :
- <t:${Math.floor(closedAt / 1e3)}:F>
            `).setColor(5793266).setThumbnail(interaction.guild.iconURL({ size: 1024 }) || "https://cdn.discordapp.com/embed/avatars/0.png");
          const appUrl = process.env.APP_URL || "https://localhost";
          const dmRowComponents = [];
          if (fileName) {
            dmRowComponents.push(
              new ButtonBuilder().setLabel("\u0639\u0631\u0636 \u0633\u062C\u0644 \u0627\u0644\u062A\u0630\u0643\u0631\u0629").setEmoji("1504600815158169734").setURL(`${appUrl}/transcripts/${fileName}`).setStyle(ButtonStyle.Link)
            );
          }
          dmRowComponents.push(
            new ButtonBuilder().setCustomId(`view_profile_${closerId}_${guildId3}`).setLabel("\u0639\u0631\u0636 \u0628\u0631\u0648\u0641\u0627\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0644\u0645").setEmoji("1504602083377287230").setStyle(ButtonStyle.Secondary)
          );
          const dmRow = new ActionRowBuilder().addComponents(dmRowComponents);
          if (openerId && typeof openerId === "string" && openerId.trim().length > 0) {
            const opener = await interaction.guild.members.fetch(openerId).catch(() => null);
            if (opener) {
              await opener.send({ embeds: [dmEmbed], components: [dmRow] }).catch(() => {
              });
            }
          }
        }
      } catch (err) {
        console.error("Error generating transcript or sending DM:", err);
      }
      const guildId2 = interaction.guild?.id;
      if (guildId2) {
        const config3 = guildConfigs.get(guildId2) || {};
        if (config3.tickets && config3.tickets.activeTickets) {
          config3.tickets.activeTickets = config3.tickets.activeTickets.filter((id) => id !== channel.id);
          guildConfigs.set(guildId2, config3);
          saveConfigs();
        }
      }
      await replyToInteractionSafely(interaction, { content: "**\u0633\u064A\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u062E\u0644\u0627\u0644 5 \u062B\u0648\u0627\u0646\u064A.**", ephemeral: true });
      setTimeout(() => {
        if (channel && typeof channel.delete === "function") {
          channel.delete().catch((e) => {
            if (e.code === 10003) {
              console.log("[Ticket Cleanup] Channel already deleted (Unknown Channel code 10003).");
            } else {
              console.error("Failed to delete channel:", e);
            }
          });
        }
      }, 5000);
    } else if (customId === "ticket_delete_confirm") {
      const modal = new ModalBuilder().setCustomId("ticket_close_modal").setTitle("\u0642\u0641\u0644 \u0627\u0644\u062A\u0630\u0643\u0631\u0629");
      const input = new TextInputBuilder().setCustomId("close_reason").setLabel("\u0633\u0628\u0628 \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629").setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder("\u0627\u0643\u062A\u0628 \u0633\u0628\u0628 \u063A\u0644\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0647\u0646\u0627...");
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await showModalSafely(interaction, modal);
    } else if (customId === "ticket_close_modal") {
      const reason = interaction.fields.getTextInputValue("close_reason");
      await replyToInteractionSafely(interaction, { content: "**\u062C\u0627\u0631\u064A \u0645\u0639\u0627\u0644\u062C\u0629 \u0637\u0644\u0628 \u0627\u0644\u062D\u0630\u0641 \u0648\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0633\u062C\u0644... <a:Reload:1503390770491818088> **" });
      const channel = interaction.channel;
      try {
        const fileName = await generateTranscript(channel).catch(() => null);
        await logBrokerEvaluationOnClose(interaction.guild, channel, metadata, fileName, interaction.user.id);
        const createdAt = metadata.CreatedAt ? parseInt(metadata.CreatedAt) : Date.now();
        const closedAt = Date.now();
        const openerId = metadata.TicketOwner;
        const closerId = interaction.user.id;
        const guildId3 = interaction.guild?.id;
        if (guildId3) {
          const dmEmbed = new EmbedBuilder().setTitle("**\u062A\u0641\u0627\u0635\u064A\u0644 \u063A\u0644\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629**").setDescription(`
> \u062A\u0645 \u0641\u062A\u062D \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 <:Ticketopened:1504561972098895972> :
- <@${openerId || "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}>
> \u062A\u0645 \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 <:Ticketclosed:1504561975533768734> : 
- <@${closerId}>
> \u0648\u0642\u062A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 <:Timereal:1504562010459738223> :
- <t:${Math.floor(createdAt / 1e3)}:F>
> \u0648\u0642\u062A \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 <:Timereal:1504562010459738223> :
- <t:${Math.floor(closedAt / 1e3)}:F>
> \u0633\u0628\u0628 \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 <:Reason:1504600051073155165> :
\`\`\` ${reason} \`\`\`
            `).setColor(5793266).setThumbnail(interaction.guild.iconURL({ size: 1024 }) || "https://cdn.discordapp.com/embed/avatars/0.png");
          const appUrl = process.env.APP_URL || "https://localhost";
          const dmRowComponents = [];
          if (fileName) {
            dmRowComponents.push(
              new ButtonBuilder().setLabel("\u0639\u0631\u0636 \u0633\u062C\u0644 \u0627\u0644\u062A\u0630\u0643\u0631\u0629").setEmoji("1504600815158169734").setURL(`${appUrl}/transcripts/${fileName}`).setStyle(ButtonStyle.Link)
            );
          }
          dmRowComponents.push(
            new ButtonBuilder().setCustomId(`view_profile_${closerId}_${guildId3}`).setLabel("\u0639\u0631\u0636 \u0628\u0631\u0648\u0641\u0627\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0644\u0645").setEmoji("1504602083377287230").setStyle(ButtonStyle.Secondary)
          );
          const dmRow = new ActionRowBuilder().addComponents(dmRowComponents);
          if (openerId && typeof openerId === "string" && openerId.trim().length > 0) {
            const opener = await interaction.guild.members.fetch(openerId).catch(() => null);
            if (opener) {
              await opener.send({ embeds: [dmEmbed], components: [dmRow] }).catch(() => {
              });
            }
          }
        }
      } catch (err) {
        console.error("Error generating transcript or sending DM:", err);
      }
      const guildId2 = interaction.guild?.id;
      if (guildId2) {
        const config3 = guildConfigs.get(guildId2) || {};
        if (config3.tickets && config3.tickets.activeTickets) {
          config3.tickets.activeTickets = config3.tickets.activeTickets.filter((id) => id !== channel.id);
          guildConfigs.set(guildId2, config3);
          saveConfigs();
        }
      }
      await replyToInteractionSafely(interaction, { content: `**\u0633\u064A\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u062E\u0644\u0627\u0644 5 \u062B\u0648\u0627\u0646\u064A**
**\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0646\u0633\u062E\u0629 \u0645\u0646 \u0627\u0644\u0633\u062C\u0644 \u0625\u0644\u0649 \u0635\u0627\u062D\u0628 \u0627\u0644\u062A\u0630\u0643\u0631\u0629.**` });
      setTimeout(() => {
        if (channel && typeof channel.delete === "function") {
          channel.delete().catch((e) => {
            if (e.code === 10003) {
              console.log("[Ticket Cleanup] Channel already deleted (Unknown Channel code 10003).");
            } else {
              console.error("Failed to delete channel:", e);
            }
          });
        }
      }, 5e3);
    } else if (customId === "ticket_delete_cancel") {
      await interaction.message.delete().catch(() => {
      });
      await replyToInteractionSafely(interaction, { content: "Cancelled.", ephemeral: true }).catch(() => {
      });
    } else if (action2 === "ticket_reset") {
      if (!isStaff) return await replyToInteractionSafely(interaction, { content: "هذا الإجراء متاح فقط لطاقم الدعم.", ephemeral: true });
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: "** \u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0628\u0646\u062C\u0627\u062D \u2705 **", ephemeral: true });
      } else {
        await interaction.reply({ content: "** \u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0628\u0646\u062C\u0627\u062D \u2705 **", ephemeral: true });
      }
    } else if (action2 === "ticket_evaluate") {
      if (!isOwner) return await replyToInteractionSafely(interaction, { content: "\u0644\u0627\u064A\u0645\u0643\u0646 \u0644\u0623\u062D\u062F \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0632\u0631 \u0627\u0644\u0627 \u0635\u0627\u062D\u0628 \u0627\u0644\u062A\u0630\u0643\u0631\u0629.", ephemeral: true });
      if (!metadata.Claimer) return await replyToInteractionSafely(interaction, { content: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0645\u0646 \u0642\u0628\u0644 \u0623\u064A \u0634\u062E\u0635 \u0644\u062A\u0642\u064A\u064A\u0645\u0647.", ephemeral: true });
      const isBroker = !!metadata.BrokerPanel;
      let rateMenu;
      if (isBroker) {
        if (metadata.Rated === "true" || ratedTickets.has(interaction.channelId)) {
          return await replyToInteractionSafely(interaction, { content: "\u0644\u0642\u062F \u0642\u0645\u062A \u0628\u062A\u0642\u064A\u064A\u0645 \u0647\u0630\u0647 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0628\u0627\u0644\u0641\u0639\u0644.", ephemeral: true });
        }
        reviewerData.set(interaction.channelId, {
          rating: "",
          targetChannelId: metadata.EvaluationChannelId || "",
          brokerId: metadata.Claimer,
          commodity: metadata.Commodity || "\u0648\u0633\u0627\u0637\u0629"
        });
        rateMenu = new StringSelectMenuBuilder().setCustomId("broker_rate_select").setPlaceholder("\u0627\u062E\u062A\u0631 \u0627\u0644\u062A\u0642\u064A\u064A\u0645...").addOptions([
          { label: "\u0645\u0628\u062A\u062F\u0626", value: "\u0645\u0628\u062A\u062F\u0626", emoji: "\u2B50" },
          { label: "\u0645\u062A\u0648\u0633\u0637", value: "\u0645\u062A\u0648\u0633\u0637", emoji: "\u2B50\u2B50" },
          { label: "\u062C\u064A\u062F", value: "\u062C\u064A\u062F", emoji: "\u2B50\u2B50\u2B50" },
          { label: "\u062C\u064A\u062F \u062C\u062F\u0627\u064B", value: "\u062C\u064A\u062F \u062C\u062F\u0627\u064B", emoji: "\u2B50\u2B50\u2B50\u2B50" },
          { label: "\u0627\u0633\u0637\u0648\u0631\u064A", value: "\u0627\u0633\u0637\u0648\u0631\u064A", emoji: "\u{1F525}" }
        ]);
      } else {
        let panel = config2.tickets?.panels?.find((p) => p.id === metadata.PanelID);
        if (!panel || !panel.evaluationEnabled || !panel.evaluationChannelId) {
          if (config2.tickets?.panels && config2.tickets.panels.length > 0) {
            const fallbackPanel = config2.tickets.panels.find((p) => p.evaluationEnabled && p.evaluationChannelId);
            if (fallbackPanel) {
              panel = fallbackPanel;
            } else if (config2.tickets.panels.length === 1) {
              panel = config2.tickets.panels[0];
            }
          }
        }
        if (!panel || !panel.evaluationEnabled || !panel.evaluationChannelId) {
          return await replyToInteractionSafely(interaction, { content: "\u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u063A\u064A\u0631 \u0645\u0641\u0639\u0644 \u0644\u0647\u0630\u0647 \u0627\u0644\u062A\u0630\u0643\u0631\u0629.", ephemeral: true });
        }
        if (metadata.Rated === "true" || ratedTickets.has(interaction.channelId)) {
          return await replyToInteractionSafely(interaction, { content: "\u0644\u0642\u062F \u0642\u0645\u062A \u0628\u062A\u0642\u064A\u064A\u0645 \u0647\u0630\u0647 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0628\u0627\u0644\u0641\u0639\u0644.", ephemeral: true });
        }
        rateMenu = new StringSelectMenuBuilder().setCustomId("ticket_rate_select").setPlaceholder("\u0627\u062E\u062A\u0631 \u0627\u0644\u062A\u0642\u064A\u064A\u0645...").addOptions(
          [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((r) => ({
            label: `\u062A\u0642\u064A\u064A\u0645: ${r}`,
            value: r.toString()
          }))
        );
      }
      await replyToInteractionSafely(interaction, {
        content: "\u0636\u0639 \u0627\u0644\u062A\u0642\u064A\u064A\u0645",
        components: [new ActionRowBuilder().addComponents(rateMenu)],
        ephemeral: true
      });
    } else if (interaction.isStringSelectMenu() && customId === "broker_close_rate_select") {
      if (!isOwner) {
        return await replyToInteractionSafely(interaction, {
          content: "**\u0639\u0630\u0631\u0627\u064B\u0606 \u0635\u0627\u062D\u0628 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0641\u0642\u0637 \u0645\u0646 \u064A\u0645\u0643\u0646\u0647 \u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0645\u0633\u062A\u0644\u0645\u0651!**",
          ephemeral: true
        });
      }
      const rating = interaction.values[0];
      const modal = new ModalBuilder().setCustomId(`broker_close_rate_comment_modal_${rating}`).setTitle("\u062A\u0639\u0644\u064A\u0642 \u0625\u0636\u0627\u0641\u064A");
      const input = new TextInputBuilder().setCustomId("comment").setLabel("\u0627\u0636\u0641 \u062A\u0639\u0644\u064A\u0642\u0643 \u0639\u0644\u0649 \u0627\u0644\u0648\u0633\u064a\u0637").setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return await showModalSafely(interaction, modal);
    } else if (interaction.isStringSelectMenu() && (customId === "ticket_rate_select" || customId === "broker_rate_select")) {
      const rating = interaction.values[0];
      const isBroker = customId === "broker_rate_select";
      if (!isOwner) return await replyToInteractionSafely(interaction, { content: "\u0644\u0627\u064A\u0645\u0643\u0646 \u0644\u0623\u062D\u062F \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0632\u0631 \u0627\u0644\u0627 \u0635\u0627\u062D\u0628 \u0627\u0644\u062A\u0630\u0643\u0631\u0629.", ephemeral: true });
      const evalChannelId = isBroker ? reviewerData.get(interaction.channelId)?.targetChannelId : metadata.EvaluationChannelId;
      if (metadata.Rated === "true" || ratedTickets.has(interaction.channelId)) {
        return await replyToInteractionSafely(interaction, { content: "\u0644\u0642\u062F \u0642\u0645\u062A \u0628\u062A\u0642\u064A\u064A\u0645 \u0647\u0630\u0647 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0628\u0627\u0644\u0641\u0639\u0644.", ephemeral: true });
      }
      if (isBroker) {
        let data = reviewerData.get(interaction.channelId);
        if (!data) {
          data = {
            rating,
            targetChannelId: metadata.EvaluationChannelId || "",
            brokerId: metadata.Claimer || "",
            commodity: metadata.Commodity || "\u0648\u0633\u0627\u0637\u0629"
          };
          reviewerData.set(interaction.channelId, data);
        } else {
          data.rating = rating;
        }
        const modal = new ModalBuilder().setCustomId(`broker_rate_comment_modal_${rating}`).setTitle("\u062A\u0639\u0644\u064A\u0642 \u0625\u0636\u0627\u0641\u064A");
        const input = new TextInputBuilder().setCustomId("comment").setLabel("\u0627\u0636\u0641 \u062A\u0639\u0644\u064A\u0642\u0643 \u0639\u0644\u0649 \u0627\u0644\u0648\u0633\u064A\u0637").setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return await showModalSafely(interaction, modal);
      } else {
        const panel = config2.tickets?.panels?.find((p) => p.id === metadata.PanelID) || config2.tickets?.panels?.[0];
        const evalChId = evalChannelId || panel?.evaluationChannelId || config2.tickets?.evaluationChannelId;
        const evalChannel = interaction.guild?.channels.cache.get(evalChId);
        if (!evalChannel || !evalChannel.isTextBased()) {
          return await replyToInteractionSafely(interaction, { content: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0631\u0648\u0645 \u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A.", ephemeral: true });
        }
        ratedTickets.add(interaction.channelId);
        metadata.Rated = "true";
        const newTopic = Object.entries(metadata).map(([k, v]) => `${k}:${v}`).join("|");
        await interaction.channel?.setTopic(newTopic).catch(() => {
        });
        const embed = new EmbedBuilder().setColor(5793266).setDescription(`**\u062A\u0645 \u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0645\u0633\u062A\u0644\u0645 <@${metadata.Claimer}><:evaluation:1509437983483494470>**
**\u0627\u0644\u0645\u0642\u064A\u0651\u0645: <@${interaction.user.id}><:Person:1504602083377287230>**
-#  ~~                                                                                                                                                                   ~~
**\u0627\u0644\u062A\u0642\u064A\u064A\u0645: ${rating}/10**`);
        await evalChannel.send({ embeds: [embed] }).catch(() => {
        });
        await interaction.channel?.send({ embeds: [embed] }).catch(() => {
        });
        await replyToInteractionSafely(interaction, { content: "\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0628\u0646\u062C\u0627\u062D.", ephemeral: true }).catch(() => {
        });
      }
    }
  }
}
async function showModalSafely(interaction, modal) {
  if (interaction.expired) return;
  try {
    interaction.modalShown = true;
    return await interaction.showModal(modal);
  } catch (err) {
    if (err.code === 10062 || err.message?.includes("Unknown interaction")) {
      interaction.expired = true;
      console.warn("[Interaction Modal Safety] Interaction expired (transient Discord issue).");
    } else {
      console.error("[Interaction Modal Safety] Failed to show modal:", err);
    }
  }
}
async function updateInteractionSafely(interaction, payload) {
  if (interaction.expired) return;
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    } else {
      try {
        if (typeof interaction.update === "function") {
          return await interaction.update(payload);
        } else {
          return await interaction.reply(payload);
        }
      } catch (updateErr) {
        if (updateErr.code === 40060 || updateErr.message?.includes("acknowledged") || updateErr.message?.includes("replied")) {
          return await interaction.editReply(payload).catch(() => {
          });
        }
        throw updateErr;
      }
    }
  } catch (err) {
    if (err.code === 10062 || err.message?.includes("Unknown interaction")) {
      interaction.expired = true;
      console.warn("[Interaction Update Safety] Interaction expired (transient Discord issue).");
    } else {
      console.warn("[Interaction Update Safety] Failed to update interaction:", err);
    }
  }
}

async function replyToInteractionSafely(interaction, payload) {
  if (interaction.expired) return;
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    } else {
      try {
        return await interaction.reply(payload);
      } catch (replyErr) {
        if (replyErr.code === 40060 || replyErr.message?.includes("acknowledged") || replyErr.message?.includes("replied")) {
          return await interaction.editReply(payload).catch(() => {
          });
        }
        throw replyErr;
      }
    }
  } catch (err) {
    if (err.code === 10062 || err.message?.includes("Unknown interaction")) {
      interaction.expired = true;
      console.warn("[Interaction Reply Safety] Interaction expired (transient Discord issue).");
    } else {
      console.warn("[Interaction Reply Safety] Failed to send interaction response:", err);
    }
  }
}
async function createBrokerTicket(interaction, panel, commodity) {
  const guild = interaction.guild;
  const config = guildConfigs.get(guild.id) || {};
  if (!config.tickets) config.tickets = {};
  if (!config.tickets.panelCounters) config.tickets.panelCounters = {};
  const panelCounter = (config.tickets.panelCounters[panel.id] || 0) + 1;
  config.tickets.panelCounters[panel.id] = panelCounter;
  saveConfigs(guild.id);
  const ticketNumber = panelCounter.toString().padStart(4, "0");
  const channelName = `broker-${ticketNumber}`;
  const staffRoleIds = (panel.brokerRoleIds || []).filter((rid) => typeof rid === "string" && /^\d+$/.test(rid));
  const categoryId = panel.categoryId && /^\d+$/.test(panel.categoryId) ? panel.categoryId : null;
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
      ...staffRoleIds.map((rid) => ({
        id: rid,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
      }))
    ],
    topic: `TicketOwner:${interaction.user.id}|BrokerPanel:${panel.id}|StaffRoles:${staffRoleIds.join(",")}|Commodity:${commodity}|EvaluationChannelId:${panel.reviewsChannelId}|CreatedAt:${Date.now()}`
  });
  if (!config.tickets.activeTickets) config.tickets.activeTickets = [];
  config.tickets.activeTickets.push(channel.id);
  guildConfigs.set(guild.id, config);
  saveConfigs(guild.id);
  let desc = panel.description || "\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643 \u0641\u064A \u062A\u0630\u0643\u0631\u0629 \u0627\u0644\u0648\u0633\u0627\u0637\u0629. \u064A\u0631\u062C\u0649 \u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0648\u0633\u064A\u0637 \u0644\u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u062A\u0630\u0643\u0631\u0629.";
  desc = desc.replace(/{user}/g, `<@${interaction.user.id}>`).replace(/<@user>/g, `<@${interaction.user.id}>`);
  const lines = desc.split("\n");
  let hasAddedQuote = false;
  const formattedDesc = lines.map((l) => {
    if (!hasAddedQuote && l.trim() !== "") {
      hasAddedQuote = true;
      return `>>> \u200E${l}`;
    }
    return l;
  }).join("\n");
  const welcomeEmbed = new EmbedBuilder().setTitle("\u200E" + (panel.title || "\u062A\u0630\u0643\u0631\u0629 \u0648\u0633\u0627\u0637\u0629 \u062C\u062F\u064A\u062F\u0629 \u{1F91D}")).setDescription(formattedDesc).setColor(5793266).setTimestamp();
  if (panel.imageUrl) {
    welcomeEmbed.setImage(panel.imageUrl);
  } else {
    const icon = guild.iconURL({ extension: "png", forceStatic: false, size: 1024 });
    welcomeEmbed.setThumbnail(icon || "https://cdn.discordapp.com/embed/avatars/0.png");
  }
  const commodityEmbed = new EmbedBuilder().setColor(5793266).setDescription("```" + commodity + "```");
  const options = [
    { label: "Received", description: "\u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u062A\u0630\u0643\u0631\u0629", value: "ticket_claim", emoji: "1503025317004968016" },
    { label: "Support", description: "\u0637\u0644\u0628 \u0627\u0644\u062F\u0639\u0645", value: "ticket_support", emoji: "1503025286126764092" },
    { label: "Remove", description: "\u0625\u0632\u0627\u0644\u0629 \u0634\u062E\u0635", value: "ticket_remove", emoji: "1503025250143703113" },
    { label: "Add", description: "\u0625\u0636\u0627\u0641\u0629 \u0634\u062E\u0635", value: "ticket_add", emoji: "1503025246540791880" },
    { label: "Come", description: "\u0627\u0633\u062A\u062F\u0639\u0627\u0621 \u0635\u0627\u062D\u0628 \u0627\u0644\u062A\u0630\u0643\u0631\u0629", value: "ticket_come", emoji: "1503025188323852463" },
    { label: "Rename", description: "\u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0627\u0633\u0645", value: "ticket_rename", emoji: "1503025184511230045" },
    { label: "Delete", description: "\u062D\u0630\u0641 \u0627\u0644\u062A\u0630\u0643\u0631\u0629", value: "ticket_delete", emoji: "1503025181361180793" },
    { label: "Reset", description: "\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629", value: "ticket_reset", emoji: "1503025344427331734" }
  ];
  const controlMenu = new StringSelectMenuBuilder().setCustomId("ticket_control_select").setPlaceholder("Ticket Options").addOptions(options);
  const claimBtn = new ButtonBuilder().setCustomId("ticket_claim").setLabel("\u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u062A\u0630\u0643\u0631\u0629").setStyle(ButtonStyle.Success).setEmoji("1503025317004968016");
  const deleteBtn = new ButtonBuilder().setCustomId("ticket_delete").setLabel("\u062D\u0630\u0641 \u0627\u0644\u062A\u0630\u0643\u0631\u0629").setStyle(ButtonStyle.Danger).setEmoji("1503025181361180793");
  await channel.send({
    content: `<@${interaction.user.id}> | ${staffRoleIds.map((rid) => `<@&${rid}>`).join(" ")}`,
    embeds: [welcomeEmbed, commodityEmbed],
    components: [
      new ActionRowBuilder().addComponents(controlMenu),
      new ActionRowBuilder().addComponents(claimBtn, deleteBtn)
    ]
  });
  return channel;
}
async function createNewTicket(interaction, panel, opt, reason, userLockKey) {
  try {
    const guild = interaction.guild;
    const existingTicket = guild.channels.cache.find((c) => c.topic?.includes(`TicketOwner:${interaction.user.id}`) && c.topic?.includes(`PanelID:${panel.id}`));
    if (existingTicket) {
      await replyToInteractionSafely(interaction, { content: `** \u0644\u062F\u064A\u0643 \u062A\u0630\u0643\u0631\u0629 \u0628\u0627\u0644\u0641\u0639\u0644 \u2022 <#${existingTicket.id}> <:Hashtag:1503025347254554704> **`, ephemeral: true });
      return;
    }
    const config = guildConfigs.get(guild.id) || {};
    if (!config.tickets) config.tickets = {};
    if (!config.tickets.panelCounters) config.tickets.panelCounters = {};
    const panelCounter = (config.tickets.panelCounters[panel.id] || 0) + 1;
    config.tickets.panelCounters[panel.id] = panelCounter;
    guildConfigs.set(guild.id, config);
    saveConfigs();
    const ticketNumber = panelCounter.toString().padStart(4, "0");
    const channelName = `ticket-${ticketNumber}`;
    const staffRoleIds = (opt.staffRoles || []).filter((rid) => typeof rid === "string" && rid.trim().length > 0 && /^\d+$/.test(rid));
    const categoryId = opt.category && typeof opt.category === "string" && /^\d+$/.test(opt.category) ? opt.category : null;
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
        ...staffRoleIds.map((rid) => ({
          id: rid,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
        }))
      ],
      topic: `TicketOwner:${interaction.user.id}|PanelID:${panel.id}|StaffRoles:${staffRoleIds.join(",")}|CreatedAt:${Date.now()}`
    });
    if (!config.tickets.activeTickets) config.tickets.activeTickets = [];
    config.tickets.activeTickets.push(channel.id);
    guildConfigs.set(guild.id, config);
    saveConfigs();
    await replyToInteractionSafely(interaction, { content: `** \u062A\u0645 \u0627\u0646\u0634\u0627\u0621 \u0627\u0644\u062A\u0630\u0643\u0631\u0629 \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0643 \u2022 <#${channel.id}> <:Hashtag:1503025347254554704> **`, ephemeral: true });
    try {
      const staffMentions = staffRoleIds.map((rid) => `<@&${rid}>`).join(" ");
      const lines = (opt.welcomeMessage || "Welcome!").split("\n");
      let hasAddedQuote = false;
      const formattedDesc = lines.map((l) => {
        if (!hasAddedQuote && l.trim() !== "") {
          hasAddedQuote = true;
          return `>>> \u200E${l}`;
        }
        return l;
      }).join("\n");
      const welcomeEmbed = new EmbedBuilder().setTitle("\u200E" + opt.label).setDescription(formattedDesc).setColor(5793266).setTimestamp();
      if (!panel.hideServerIcon) {
        const icon = guild.iconURL({ extension: "png", forceStatic: false, size: 1024 });
        welcomeEmbed.setThumbnail(icon || "https://cdn.discordapp.com/embed/avatars/0.png");
      }
      const questionEmbed = new EmbedBuilder().setColor(5793266);
      if (reason) {
        questionEmbed.setDescription("```" + reason + "```");
      } else {
        questionEmbed.setDescription("**\u064A\u0631\u062C\u0649 \u062A\u0648\u0636\u064A\u062D \u0637\u0644\u0628\u0643 \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u062F\u0639\u0645...**");
      }
      const options = [
        { label: "Received", description: "\u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u062A\u0630\u0643\u0631\u0629", value: "ticket_claim", emoji: "1503025317004968016" },
        { label: "Support", description: "\u0637\u0644\u0628 \u0627\u0644\u062F\u0639\u0645", value: "ticket_support", emoji: "1503025286126764092" },
        { label: "Remove", description: "\u0625\u0632\u0627\u0644\u0629 \u0634\u062E\u0635", value: "ticket_remove", emoji: "1503025250143703113" },
        { label: "Add", description: "\u0625\u0636\u0627\u0641\u0629 \u0634\u062E\u0635", value: "ticket_add", emoji: "1503025246540791880" },
        { label: "Come", description: "\u0627\u0633\u062A\u062F\u0639\u0627\u0621 \u0635\u0627\u062D\u0628 \u0627\u0644\u062A\u0630\u0643\u0631\u0629", value: "ticket_come", emoji: "1503025188323852463" },
        { label: "Rename", description: "\u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0627\u0633\u0645", value: "ticket_rename", emoji: "1503025184511230045" },
        { label: "Delete", description: "\u062D\u0630\u0641 \u0627\u0644\u062A\u0630\u0643\u0631\u0629", value: "ticket_delete", emoji: "1503025181361180793" },
        { label: "Reset", description: "\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629", value: "ticket_reset", emoji: "1503025344427331734" }
      ];
      if (panel.evaluationEnabled && panel.evaluationChannelId) {
        options.push({ label: "Evaluation", description: "\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0645\u0633\u062A\u0644\u0645", value: "ticket_evaluate", emoji: "1509437983483494470" });
      }
      const controlMenu = new StringSelectMenuBuilder().setCustomId("ticket_control_select").setPlaceholder("Ticket Options").addOptions(options);
      const claimBtn = new ButtonBuilder().setCustomId("ticket_claim").setLabel("\u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u062A\u0630\u0643\u0631\u0629").setStyle(ButtonStyle.Success).setEmoji("1503025317004968016");
      const deleteBtn = new ButtonBuilder().setCustomId("ticket_delete").setLabel("\u062D\u0630\u0641 \u0627\u0644\u062A\u0630\u0643\u0631\u0629").setStyle(ButtonStyle.Danger).setEmoji("1503025181361180793");
      await channel.send({
        content: `<@${interaction.user.id}> | ${staffMentions}`,
        embeds: [welcomeEmbed, questionEmbed],
        components: [
          new ActionRowBuilder().addComponents(controlMenu),
          new ActionRowBuilder().addComponents(claimBtn, deleteBtn)
        ]
      });
    } catch (sendMsgErr) {
      console.error("[Ticket Hub] Failed to populate new ticket channel contents:", sendMsgErr);
    }
  } catch (error) {
    console.error("Error creating ticket:", error);
    try {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: `\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062A\u0630\u0643\u0631\u0629: ${errorMsg}` }).catch(() => {
        });
      } else {
        await interaction.reply({ content: `\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062A\u0630\u0643\u0631\u0629: ${errorMsg}`, ephemeral: true }).catch(() => {
        });
      }
    } catch (e) {
    }
  }
}
async function syncDiscordAutoMod(guildId, security) {
  try {
    if (!discordClient.isReady()) return;
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) return;
    const existingRules = await guild.autoModerationRules.fetch().catch(() => null);
    if (!existingRules) {
      console.log(`[AutoMod Sync] Lacking View/Manage AutoMod permissions in guild: ${guild.name} (${guildId})`);
      return;
    }
    const wordsRuleName = "[Bot] AutoMod Blocked Words";
    const linksRuleName = "[Bot] AutoMod Link Protection";
    const wordsRule = existingRules.find((r) => r.name === wordsRuleName);
    const linksRule = existingRules.find((r) => r.name === linksRuleName);
    const blockedWordsList = security?.blockedWords || [];
    const linkProtectionEnabled = !!security?.linkProtection;
    const validWords = blockedWordsList.map((w) => w.trim()).filter((w) => w.length > 0 && w.length <= 60).map((w) => {
      let pattern = w;
      if (!pattern.startsWith("*")) pattern = "*" + pattern;
      if (!pattern.endsWith("*")) pattern = pattern + "*";
      return pattern;
    });
    if (validWords.length > 0) {
      if (wordsRule) {
        await wordsRule.edit({
          triggerMetadata: {
            keywordFilter: validWords
          },
          actions: [
            {
              type: 1,
              // BlockMessage
              metadata: {
                customMessage: "Blocked by NTL BOT"
              }
            }
          ],
          enabled: true
        }).catch((err) => console.error("[AutoMod Sync] Error updating words rule:", err));
      } else {
        await guild.autoModerationRules.create({
          name: wordsRuleName,
          eventType: 1,
          // MessageSend
          triggerType: 1,
          // Keyword
          triggerMetadata: {
            keywordFilter: validWords
          },
          actions: [
            {
              type: 1,
              // BlockMessage
              metadata: {
                customMessage: "Blocked by NTL BOT"
              }
            }
          ],
          enabled: true
        }).catch((err) => console.error("[AutoMod Sync] Error creating words rule:", err));
      }
    } else {
      if (wordsRule) {
        await wordsRule.delete("No blocked words configured. Deleting native filter.").catch((err) => console.error("[AutoMod Sync] Error deleting words rule:", err));
      }
    }
    if (linkProtectionEnabled) {
      const linkKeywords = ["*http://*", "*https://*", "*www.*"];
      if (linksRule) {
        await linksRule.edit({
          actions: [
            {
              type: 1,
              // BlockMessage
              metadata: {
                customMessage: "Blocked by NTL BOT"
              }
            }
          ],
          enabled: true
        }).catch((err) => console.error("[AutoMod Sync] Error updating link rule:", err));
      } else {
        await guild.autoModerationRules.create({
          name: linksRuleName,
          eventType: 1,
          // MessageSend
          triggerType: 1,
          // Keyword
          triggerMetadata: {
            keywordFilter: linkKeywords
          },
          actions: [
            {
              type: 1,
              // BlockMessage
              metadata: {
                customMessage: "Blocked by NTL BOT"
              }
            }
          ],
          enabled: true
        }).catch((err) => console.error("[AutoMod Sync] Error creating link rule:", err));
      }
    } else {
      if (linksRule) {
        await linksRule.delete("Link protection disabled. Deleting native rule.").catch((err) => console.error("[AutoMod Sync] Error deleting link rule:", err));
      }
    }
  } catch (error) {
    console.error(`[AutoMod Sync] Failed to synchronize AutoMod rules for guild ${guildId}:`, error);
  }
}
function getDiscordCredentials() {
  return {
    DISCORD_BOT_TOKEN: cleanEnvVar(DISCORD_BOT_TOKEN),
    DISCORD_CLIENT_ID: cleanEnvVar(DISCORD_CLIENT_ID),
    DISCORD_CLIENT_SECRET: cleanEnvVar(DISCORD_CLIENT_SECRET)
  };
}
function updateBotCredentials(token, clientId, clientSecret) {
  DISCORD_BOT_TOKEN = token;
  DISCORD_CLIENT_ID = clientId;
  DISCORD_CLIENT_SECRET = clientSecret;
  globalState.botCredentials = {
    DISCORD_BOT_TOKEN: token,
    DISCORD_CLIENT_ID: clientId,
    DISCORD_CLIENT_SECRET: clientSecret
  };
  saveConfigs(void 0, true);
  updateEnvFile({
    DISCORD_BOT_TOKEN: token,
    DISCORD_CLIENT_ID: clientId,
    DISCORD_CLIENT_SECRET: clientSecret
  });
}
async function startDiscordBot() {
  if (!DISCORD_BOT_TOKEN) {
    console.log("DISCORD_BOT_TOKEN is not configured yet.");
    return;
  }
  try {
    if (discordClient.user) {
      console.log("Discord bot client is already logged in, destroying original session...");
      try {
        await discordClient.destroy();
      } catch (destroyErr) {
        console.error("Error destroying discord client session:", destroyErr);
      }
    }
    await discordClient.login(DISCORD_BOT_TOKEN);
    console.log(`Bot logged in successfully as: ${discordClient.user?.tag}`);
    const clientId = DISCORD_CLIENT_ID || discordClient.user?.id;
    if (clientId) {
      const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN);
      try {
        console.log("Started refreshing application (/) commands.");
        await rest.put(Routes.applicationCommands(clientId), {
          body: [
            { name: "ping", description: "Replies with Pong and latency!" },
            { name: "help", description: "Shows all available bot commands" },
            {
              name: "clear",
              name_localizations: { ar: "\u0645\u0633\u062D", fr: "effacer" },
              description: "Clear a specific amount of messages",
              description_localizations: { ar: "\u0645\u0633\u062D \u0643\u0645\u064A\u0629 \u0645\u062D\u062F\u062F\u0629 \u0645\u0646 \u0627\u0644\u0631\u0633\u0627\u0626\u0644", fr: "Efface un nombre sp\xE9cifique de messages" },
              options: [{
                name: "amount",
                name_localizations: { ar: "\u0627\u0644\u0639\u062F\u062F", fr: "nombre" },
                description: "Number of messages to clear",
                description_localizations: { ar: "\u0639\u062F\u062F \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0645\u0631\u0627\u062F \u0645\u0633\u062D\u0647\u0627", fr: "Nombre de messages \xE0 effacer" },
                type: 4,
                required: true
              }]
            },
            {
              name: "kick",
              name_localizations: { ar: "\u0637\u0631\u062F", fr: "expulser" },
              description: "Kick a user from the server",
              description_localizations: { ar: "\u0637\u0631\u062F \u0639\u0636\u0648 \u0645\u0646 \u0627\u0644\u0633\u064A\u0631\u0641\u0631", fr: "Expulser un membre du serveur" },
              options: [
                {
                  name: "target",
                  name_localizations: { ar: "\u0627\u0644\u0639\u0636\u0648", fr: "cible" },
                  description: "The user to kick",
                  description_localizations: { ar: "\u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u0631\u0627\u062F \u0637\u0631\u062F\u0647", fr: "Le membre \xE0 expulser" },
                  type: 6,
                  required: true
                },
                {
                  name: "reason",
                  name_localizations: { ar: "\u0627\u0644\u0633\u0628\u0628", fr: "raison" },
                  description: "Reason for the kick",
                  description_localizations: { ar: "\u0633\u0628\u0628 \u0627\u0644\u0637\u0631\u062F", fr: "Raison de l'expulsion" },
                  type: 3,
                  required: false
                }
              ]
            },
            {
              name: "ban",
              name_localizations: { ar: "\u062D\u0638\u0631", fr: "bannir" },
              description: "Ban a user from the server",
              description_localizations: { ar: "\u062D\u0638\u0631 \u0639\u0636\u0648 \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0627\u0644\u0633\u064A\u0631\u0641\u0631", fr: "Bannir d\xE9finitivement un membre du serveur" },
              options: [
                {
                  name: "target",
                  name_localizations: { ar: "\u0627\u0644\u0639\u0636\u0648", fr: "cible" },
                  description: "The user to ban",
                  description_localizations: { ar: "\u0627\u0644\u0639\u0636\u0648 \u0627\u0644\u0645\u0631\u0627\u062F \u062D\u0638\u0631\u0647", fr: "Le membre \xE0 bannir" },
                  type: 6,
                  required: true
                },
                {
                  name: "reason",
                  name_localizations: { ar: "\u0627\u0644\u0633\u0628\u0628", fr: "raison" },
                  description: "Reason for the ban",
                  description_localizations: { ar: "\u0633\u0628\u0628 \u0627\u0644\u062D\u0638\u0631", fr: "Raison du bannissement" },
                  type: 3,
                  required: false
                }
              ]
            },
            {
              name: "serverinfo",
              name_localizations: { ar: "\u0645\u0639\u0644\u0648\u0645\u0627\u062A-\u0627\u0644\u0633\u064A\u0631\u0641\u0631", fr: "info-serveur" },
              description: "Display information about the current server",
              description_localizations: { ar: "\u0639\u0631\u0636 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0639\u0627\u0645\u0629 \u062D\u0648\u0644 \u0627\u0644\u0633\u064A\u0631\u0641\u0631", fr: "Afficher les informations du serveur" }
            },
            {
              name: "slowmode",
              description: "Set slowmode for the current channel",
              options: [{ name: "seconds", description: "Slowmode duration in seconds (0 to disable)", type: 4, required: true }]
            },
            {
              name: "language",
              description: "Change the bot language for this server",
              options: [
                {
                  name: "lang",
                  description: "The language to use",
                  type: 3,
                  required: true,
                  choices: [
                    { name: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", value: "ar" },
                    { name: "English", value: "en" },
                    { name: "Fran\xE7ais", value: "fr" }
                  ]
                }
              ]
            },
            {
              name: "script",
              name_localizations: { ar: "\u0628\u062D\u062B-\u0633\u0643\u0631\u0628\u062A\u0627\u062A", fr: "recherche-script" },
              description: "Search for Roblox scripts for a specific map",
              description_localizations: { ar: "\u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0633\u0643\u0631\u0628\u062A\u0627\u062A \u0631\u0648\u0628\u0644\u0648\u0643\u0633 \u0644\u0645\u0627\u0628 \u0645\u0639\u064A\u0646", fr: "Rechercher des scripts Roblox pour une carte sp\xE9cifique" },
              options: [{
                name: "map",
                name_localizations: { ar: "\u0627\u0644\u0645\u0627\u0628", fr: "carte" },
                description: "The map name to search scripts for",
                description_localizations: { ar: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0627\u0628 \u0644\u0644\u0628\u062D\u062B \u0639\u0646 \u0633\u0643\u0631\u0628\u062A\u0627\u062A \u0644\u0647", fr: "Le nom de la carte pour laquelle chercher des scripts" },
                type: 3,
                required: true
              }]
            },
            {
              name: "fscript",
              name_localizations: { ar: "\u0628\u062D\u062B-\u0645\u062A\u0642\u062F\u0645", fr: "recherche-avancee" },
              description: "Advanced search for Roblox scripts (Premium/Advanced)",
              description_localizations: { ar: "\u0628\u062D\u062B \u0645\u062A\u0642\u062F\u0645 \u0648\u0645\u0641\u0635\u0644 \u0644\u0644\u0633\u0643\u0631\u0628\u062A\u0627\u062A (\u0628\u0631\u064A\u0645\u064A\u0648\u0645)", fr: "Recherche de script d\xE9taill\xE9e (Premium/Avanc\xE9e)" },
              options: [{
                name: "query",
                name_localizations: { ar: "\u0643\u0644\u0645\u0629-\u0627\u0644\u0628\u062D\u062B", fr: "requete" },
                description: "Search keywords or map name",
                description_localizations: { ar: "\u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0627\u062D\u064A\u0629 \u0644\u0644\u0628\u062D\u062B", fr: "Mots-cl\xE9s de recherche" },
                type: 3,
                required: true
              }]
            },
            {
              name: "role",
              description: "Give or remove a role from a member",
              options: [
                { name: "target", description: "The member to modify roles for", type: 6, required: true },
                { name: "role", description: "The role to add or remove", type: 8, required: true }
              ]
            },
            {
              name: "set-level",
              description: "Configure XP requirement for a specific level (Static Mode)",
              options: [
                { name: "level", description: "The level number", type: 4, required: true },
                { name: "xp", description: "XP required to reach this level", type: 4, required: true },
                {
                  name: "type",
                  description: "Chat or Voice",
                  type: 3,
                  required: true,
                  choices: [{ name: "Chat", value: "chat" }, { name: "Voice", value: "voice" }]
                }
              ]
            },
            {
              name: "remove-level",
              description: "Remove XP requirement for a specific level",
              options: [
                { name: "level", description: "The level number to remove", type: 4, required: true },
                {
                  name: "type",
                  description: "Chat or Voice",
                  type: 3,
                  required: true,
                  choices: [{ name: "Chat", value: "chat" }, { name: "Voice", value: "voice" }]
                }
              ]
            },
            {
              name: "add-level",
              description: "Give levels to a user",
              options: [
                { name: "target", description: "The user to give levels to", type: 6, required: true },
                {
                  name: "type",
                  description: "Chat or Voice levels",
                  type: 3,
                  required: true,
                  choices: [{ name: "Chat", value: "chat" }, { name: "Voice", value: "voice" }]
                },
                { name: "amount", description: "Number of levels to add", type: 4, required: true }
              ]
            },
            {
              name: "take-level",
              description: "Remove levels from a user",
              options: [
                { name: "target", description: "The user to remove levels from", type: 6, required: true },
                {
                  name: "type",
                  description: "Chat or Voice levels",
                  type: 3,
                  required: true,
                  choices: [{ name: "Chat", value: "chat" }, { name: "Voice", value: "voice" }]
                },
                { name: "amount", description: "Number of levels to remove", type: 4, required: true }
              ]
            },
            {
              name: "top",
              description: "Show levelling leaderboard",
              options: [
                {
                  name: "type",
                  description: "Type of leaderboard",
                  type: 3,
                  required: false,
                  choices: [
                    { name: "All Time", value: "all" },
                    { name: "Day", value: "day" },
                    { name: "Week", value: "week" },
                    { name: "Month", value: "month" },
                    { name: "Year", value: "year" }
                  ]
                }
              ]
            },
            {
              name: "id",
              description: "Show your current level and XP info",
              options: [{ name: "user", description: "The user to check", type: 6, required: false }]
            },
            {
              name: "ticket-post",
              description: "Post a ticket panel to a channel",
              options: [
                {
                  name: "panel_id",
                  description: "The ID of the panel to post",
                  type: 3,
                  // STRING
                  required: true
                },
                {
                  name: "channel",
                  description: "The channel to post the panel in",
                  type: 7,
                  // CHANNEL
                  required: false
                }
              ]
            },
            {
              name: "line-setup",
              description: "Setup an auto line for a channel with an uploaded attachment",
              options: [
                {
                  name: "channel",
                  description: "The channel to enable the auto-line in",
                  type: 7,
                  // CHANNEL
                  required: true
                },
                {
                  name: "image",
                  description: "The line image to post",
                  type: 11,
                  // ATTACHMENT
                  required: true
                }
              ]
            }
          ]
        });
        console.log("Successfully reloaded application (/) commands.");
      } catch (error) {
        console.error("Error registering slash commands:", error);
      }
    }
  } catch (e) {
    console.error("Failed to login Discord bot:", e);
    throw e;
  }
}
process.on("unhandledRejection", (reason, promise) => {
  console.error("--- UNHANDLED REJECTION SHIELDED ---");
  console.error("Promise:", promise, "Reason:", reason);
});
process.on("uncaughtException", (error, origin) => {
  console.error("--- UNCAUGHT EXCEPTION SHIELDED ---");
  console.error("Error:", error, "Origin:", origin);
});
export {
  checkAndJoinVoiceChannel,
  cleanEnvVar,
  discordClient,
  getDiscordCredentials,
  getLevellingConfig,
  startDiscordBot,
  syncDiscordAutoMod,
  updateBotCredentials,
  updateEnvFile
};
