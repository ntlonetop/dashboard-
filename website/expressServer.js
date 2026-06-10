import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import {
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType
} from "discord.js";
import {
  discordClient,
  getLevellingConfig,
  syncDiscordAutoMod,
  cleanEnvVar,
  getDiscordCredentials,
  updateBotCredentials,
  startDiscordBot,
  setupAzkarInterval,
  guildConfigs,
  saveBotConfigs
} from "./botBridge.js";
import { globalState, supportTickets, saveWebState } from "./webDb";
import { hashPassword, verifyPassword } from "./securityUtils";
const app = express();
const PORT = 3e3;
const SESSION_SECRET = process.env.OAUTH_SESSION_SECRET || "default_super_secret_session_key";
const TRANSCRIPTS_DIR = path.join(process.cwd(), "transcripts");
const bannedIPs = /* @__PURE__ */ new Set();
const ipRequests = /* @__PURE__ */ new Map();
const RATE_LIMIT_WINDOW_MS = 1e4;
const MAX_REQUESTS_IN_WINDOW = 60;
const BUST_THRESHOLD = 90;
function loadSupportTicketsRecord() {
  const record = {};
  supportTickets.forEach((t) => {
    if (t && t.userId) {
      record[t.userId] = t;
    }
  });
  return record;
}
function saveSupportTicketsRecord(record) {
  supportTickets.length = 0;
  Object.values(record).forEach((t) => {
    if (t) supportTickets.push(t);
  });
  saveWebState(false, true);
}
export async function startWebServer() {
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown_ip";
    if (bannedIPs.has(ip)) {
      return res.status(403).send(
        `<html>
          <head>
            <meta charset="utf-8">
            <title>\u{1F6AB} تم حظر الوصول - IP Banned</title>
            <style>
              body { background: #0b0f19; color: #f87171; font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 100px 20px; direction: rtl; }
              .card { max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.02); border: 1px solid rgba(248,113,113,0.15); padding: 40px; rounded-radius: 24px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
              h1 { font-size: 32px; font-weight: 900; margin-bottom: 16px; color: #ef4444; }
              p { color: #94a3b8; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
              .ip { font-family: monospace; background: rgba(0,0,0,0.4); padding: 8px 16px; border-radius: 8px; color: #cbd5e1; display: inline-block; font-size: 14px; direction: ltr; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>\u{1F6AB} وصول محظور تماماً</h1>
              <p>تم حظر هذا الجهاز (IP Address) بشكل دائم ومباشر من تصفح الموقع أو سحب أي بيانات بسبب رصد أنشطة برمجية مفرطة أو إرسال ريكوستات سريعة جداً تهدد استقرار السيرفر.</p>
              <div class="ip">IP: ${ip}</div>
            </div>
          </body>
        </html>`
      );
    }
    if (req.path.startsWith("/api/")) {
      const now = Date.now();
      let record = ipRequests.get(ip);
      if (!record || now > record.resetTime) {
        record = { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS, warns: record ? record.warns : 0 };
        ipRequests.set(ip, record);
      }
      record.count++;
      if (record.count > BUST_THRESHOLD) {
        bannedIPs.add(ip);
        console.warn(`[SECURITY BAN] IP Banned instantly for API flooding: ${ip} (Sent ${record.count} reqs in <10s)`);
        return res.status(403).json({
          error: "ip_banned",
          message: "\u{1F6AB} تم حظر عنوان الـ IP الخاص بك بشكل دائم لإرسالك طلبات مفرطة وسريعة جداً!"
        });
      }
      if (record.count > MAX_REQUESTS_IN_WINDOW) {
        record.warns++;
        if (record.warns > 3) {
          bannedIPs.add(ip);
          console.warn(`[SECURITY BAN] IP Banned after repeating rate-limit warnings: ${ip}`);
          return res.status(403).json({
            error: "ip_banned",
            message: "\u{1F6AB} تم حظرك نهائياً من الموقع بسبب تجاهل التنبيهات وتكرار الضغط المفرط وإغراق السيرفر بالطلبات."
          });
        }
        return res.status(429).json({
          error: "too_many_requests",
          message: "⚠️ تمهل قليلاً! أنت ترسل الكثير من الطلبات بشكل سريع جداً. سيتم حظر جهازك فوراً إذا واصلت ذلك."
        });
      }
    }
    next();
  });

  // Dynamic CORS middleware to support separating frontend (e.g. GitHub Pages) and backend
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(cookieParser());
  app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      sameSite: "none",
      httpOnly: true
    }
  }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use((req, res, next) => {
    if (globalState.masterPinHash) {
      const pathname = req.path;
      const isBypass = pathname.startsWith("/api/auth/") || pathname.startsWith("/api/security/") || pathname.startsWith("/api/support/") || pathname === "/api/upload";
      const isWriteMethod = ["POST", "PUT", "DELETE", "PATCH"].includes(req.method);
      if (!isBypass && isWriteMethod && !req.session.pinVerified) {
        return res.status(403).json({
          error: "master_pin_required",
          message: "⚠️ يحتاج هذا الإجراء إلى إدخال رمز التحقق للحماية للوحة التحكم (Master PIN)."
        });
      }
    }
    next();
  });
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));
  app.post("/api/upload", (req, res) => {
    try {
      const { image, name } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image base64 data provided" });
      }
      // Return the base64 string as the URL directly
      res.json({ url: image });
    } catch (err) {
      console.error("[Upload API] Error processing image:", err);
      res.status(500).json({ error: err.message || "Failed to upload image" });
    }
  });
  app.get("/ntl-banner.png", (req, res) => {
    res.sendFile(path.join(process.cwd(), "src", "assets", "images", "ntl_bot_dashboard_1779626524200.png"));
  });
  app.get("/bot-avatar.png", (req, res) => {
    if (discordClient && discordClient.isReady() && discordClient.user) {
      const avatarUrl = discordClient.user.displayAvatarURL({ extension: "png", size: 256 });
      return res.redirect(avatarUrl);
    }
    res.redirect("https://cdn.discordapp.com/embed/avatars/0.png");
  });
  app.get("/api/guild/config", (req, res) => {
    const guildId = req.query.guildId;
    const config = guildConfigs.get(guildId) || {};
    res.json(config);
  });
  app.post("/api/guild/config", async (req, res) => {
    const { guildId, config } = req.body;
    const existing = guildConfigs.get(guildId) || {};
    let isOwner = false;
    let isAdmin = false;
    try {
      const userId = await getUserIdFromToken(req);
      if (userId) {
        const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId).catch(() => null);
        if (guild) {
          isOwner = guild.ownerId === userId;
          const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
          if (member) {
            isAdmin = member.permissions.has("Administrator");
          }
        }
      }
    } catch (e) {
      console.error("Error checking owner status:", e);
    }
    const hasHighRole = isOwner || isAdmin;
    let bodyConfig = config || {};
    if (!hasHighRole && bodyConfig.security) {
      const dbSecurity = existing.security || {};
      bodyConfig.security = {
        blockedWords: bodyConfig.security.blockedWords || [],
        wordPunishment: bodyConfig.security.wordPunishment || "none",
        wordPunishmentDuration: bodyConfig.security.wordPunishmentDuration || 5,
        wordPunishmentUnit: bodyConfig.security.wordPunishmentUnit || "minutes",
        linkProtection: !!bodyConfig.security.linkProtection,
        linkPunishment: bodyConfig.security.linkPunishment || "none",
        linkPunishmentDuration: bodyConfig.security.linkPunishmentDuration || 5,
        linkPunishmentUnit: bodyConfig.security.linkPunishmentUnit || "minutes",
        channelsCreateProtection: !!dbSecurity.channelsCreateProtection,
        channelsDeleteProtection: !!dbSecurity.channelsDeleteProtection,
        rolesCreateProtection: !!dbSecurity.rolesCreateProtection,
        rolesDeleteProtection: !!dbSecurity.rolesDeleteProtection,
        botsProtection: !!dbSecurity.botsProtection,
        spamProtection: !!dbSecurity.spamProtection,
        spamLimit: dbSecurity.spamLimit || 5,
        spamInterval: dbSecurity.spamInterval || 5,
        spamPunishment: dbSecurity.spamPunishment || "none",
        spamPunishmentDuration: dbSecurity.spamPunishmentDuration || 5,
        spamPunishmentUnit: dbSecurity.spamPunishmentUnit || "minutes",
        spamDeleteAllComments: dbSecurity.spamDeleteAllComments !== false,
        punishment: dbSecurity.punishment || "none"
      };
    }

    if (bodyConfig.security) {
      const anyProtectionEnabled = 
        bodyConfig.security.channelsCreateProtection ||
        bodyConfig.security.channelsDeleteProtection ||
        bodyConfig.security.rolesCreateProtection ||
        bodyConfig.security.rolesDeleteProtection ||
        bodyConfig.security.botsProtection ||
        bodyConfig.security.spamProtection;

      if (anyProtectionEnabled) {
        try {
          const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId).catch(() => null);
          if (guild) {
            const botMember = guild.members.cache.get(discordClient.user.id) || await guild.members.fetch(discordClient.user.id).catch(() => null);
            if (botMember && !botMember.permissions.has("Administrator")) {
              return res.status(400).json({
                success: false,
                error: (bodyConfig.language === "ar" || config?.language === "ar" || existing?.language === "ar")
                  ? "البوت يحتاج إلى صلاحية مسؤول (Administrator) في السيرفر لتفعيل جدار الحماية وحماية الرومات والقنوات!"
                  : "The bot lacks Administrator permission in the server to enable channel/role protection guards!"
              });
            }
          }
        } catch (botErr) {
          console.error("Error checking bot admin permissions:", botErr);
        }
      }
    }

    const mergedConfig = { ...existing, ...bodyConfig };
    guildConfigs.set(guildId, mergedConfig);
    saveBotConfigs();
    if (bodyConfig.security) {
      syncDiscordAutoMod(guildId, bodyConfig.security).catch(() => null);
    }
    res.json({ success: true });
  });
  app.get("/api/guild/channels", async (req, res) => {
    const guildId = req.query.guildId;
    const type = req.query.type;
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json([]);
    let channels = guild.channels.cache;
    if (type === "category") {
      const categories = channels.filter((c) => c.type === ChannelType.GuildCategory);
      return res.json(categories.map((c) => ({
        id: c.id,
        name: c.name,
        channels: c.children?.cache.map((ch) => ({ id: ch.id, name: ch.name })) || []
      })));
    } else if (type === "voice") {
      channels = channels.filter((c) => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice);
    } else {
      channels = channels.filter((c) => c.isTextBased());
    }
    res.json(channels.map((c) => ({ id: c.id, name: c.name })));
  });
  app.get("/api/guild/roles", async (req, res) => {
    const guildId = req.query.guildId;
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json([]);
    res.json(guild.roles.cache.map((r) => ({ id: r.id, name: r.name })));
  });
  app.get("/api/guild/emojis", async (req, res) => {
    const guildId = req.query.guildId;
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json([]);
    res.json(guild.emojis.cache.map((e) => ({ id: e.id, name: e.name, animated: e.animated })));
  });
  app.post("/api/guilds/:id/redeem", (req, res) => {
    const { code, userId } = req.body;
    const guildId = req.params.id;
    if (!code) return res.status(400).json({ success: false, message: "Code required" });
    const activeCode = globalState.activeCodes[code];
    if (!activeCode || activeCode.usedOn) {
      return res.status(400).json({ success: false, message: "Invalid or already used code" });
    }
    if (activeCode.type === "premium") {
      const existing = guildConfigs.get(guildId) || {};
      const now = Date.now();
      const currentExpiry = existing.premiumExpiry || now;
      const newExpiry = Math.max(now, currentExpiry) + activeCode.value * 24 * 60 * 60 * 1e3;
      guildConfigs.set(guildId, { ...existing, premiumExpiry: newExpiry });
      activeCode.usedBy = userId || "unknown";
      activeCode.usedOn = now;
      saveBotConfigs();
      saveWebState(true, false);
      return res.json({ success: true, message: "Premium activated for this server!" });
    }
    res.status(400).json({ success: false, message: "This code is not for premium activation" });
  });
  app.get("/api/premium/status", (req, res) => {
    const userId = req.query.userId;
    const guildId = req.query.guildId;
    const expiry = globalState.premiumUsers[userId];
    const isPremium = expiry ? expiry > Date.now() : false;
    let voiceChannelId = "";
    if (guildId) {
      const config = guildConfigs.get(guildId) || {};
      voiceChannelId = config.premiumVoiceChannelId || "";
    }
    res.json({ isPremium, expiry, voiceEnabled: !!voiceChannelId, voiceChannelId });
  });
  app.post("/api/premium/voice-channel", async (req, res) => {
    const { guildId, channelId } = req.body;
    if (!guildId) return res.status(400).json({ error: "No guild ID provided" });
    const existing = guildConfigs.get(guildId) || {};
    guildConfigs.set(guildId, { ...existing, premiumVoiceChannelId: channelId });
    saveBotConfigs();
    if (channelId) {
      setTimeout(() => {
        import("./botBridge.js").then((m) => {
          if (m.checkAndJoinVoiceChannel) {
            m.checkAndJoinVoiceChannel(guildId);
          }
        }).catch((err) => console.error(err));
      }, 500);
    }
    res.json({ success: true });
  });
  app.post("/api/premium/redeem", (req, res) => {
    const { userId, code } = req.body;
    const activeCode = globalState.activeCodes[code];
    if (!activeCode || activeCode.usedOn) {
      return res.status(400).json({ success: false, message: "Invalid code" });
    }
    if (activeCode.type === "premium") {
      const now = Date.now();
      const currentExpiry = globalState.premiumUsers[userId] || now;
      globalState.premiumUsers[userId] = Math.max(now, currentExpiry) + activeCode.value * 24 * 60 * 60 * 1e3;
      activeCode.usedBy = userId;
      activeCode.usedOn = now;
      saveWebState(true, false);
      return res.json({ success: true });
    }
    res.status(400).json({ success: false, message: "Invalid code type" });
  });
  app.get("/api/bot/status", (req, res) => {
    if (discordClient.isReady()) {
      res.json({
        ready: true,
        user: {
          tag: discordClient.user?.tag,
          avatarURL: discordClient.user?.displayAvatarURL()
        },
        guildCount: discordClient.guilds.cache.size,
        guildIds: Array.from(discordClient.guilds.cache.keys()),
        ping: discordClient.ws.ping
      });
    } else {
      res.json({ ready: false });
    }
  });
  app.get("/api/guilds/:id/config", (req, res) => {
    const config = guildConfigs.get(req.params.id) || {
      language: "ar",
      commands: {
        clear: { aliases: [], channels: [], roles: [] },
        kick: { aliases: [], channels: [], roles: [] },
        ban: { aliases: [], channels: [], roles: [] },
        serverinfo: { aliases: [], channels: [], roles: [] },
        role: { aliases: [], channels: [], roles: [] }
      }
    };
    if (config.commands) {
      for (const cmd in config.commands) {
        if (config.commands[cmd].alias && !config.commands[cmd].aliases) {
          config.commands[cmd].aliases = [config.commands[cmd].alias];
        }
        if (!config.commands[cmd].aliases) config.commands[cmd].aliases = [];
      }
    }
    res.json(config);
  });
  app.post("/api/guilds/:id/config", async (req, res) => {
    const guildId = req.params.id;
    const existing = guildConfigs.get(guildId) || {};
    let isOwner = false;
    let isAdmin = false;
    try {
      const userId = await getUserIdFromToken(req);
      if (userId) {
        const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId).catch(() => null);
        if (guild) {
          isOwner = guild.ownerId === userId;
          const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
          if (member) {
            isAdmin = member.permissions.has("Administrator");
          }
        }
      }
    } catch (e) {
      console.error("Error checking owner status:", e);
    }
    const hasHighRole = isOwner || isAdmin;
    let bodyConfig = req.body || {};
    if (!hasHighRole && bodyConfig.security) {
      const dbSecurity = existing.security || {};
      bodyConfig.security = {
        blockedWords: bodyConfig.security.blockedWords || [],
        wordPunishment: bodyConfig.security.wordPunishment || "none",
        wordPunishmentDuration: bodyConfig.security.wordPunishmentDuration || 5,
        wordPunishmentUnit: bodyConfig.security.wordPunishmentUnit || "minutes",
        linkProtection: !!bodyConfig.security.linkProtection,
        linkPunishment: bodyConfig.security.linkPunishment || "none",
        linkPunishmentDuration: bodyConfig.security.linkPunishmentDuration || 5,
        linkPunishmentUnit: bodyConfig.security.linkPunishmentUnit || "minutes",
        channelsCreateProtection: !!dbSecurity.channelsCreateProtection,
        channelsDeleteProtection: !!dbSecurity.channelsDeleteProtection,
        rolesCreateProtection: !!dbSecurity.rolesCreateProtection,
        rolesDeleteProtection: !!dbSecurity.rolesDeleteProtection,
        botsProtection: !!dbSecurity.botsProtection,
        spamProtection: !!dbSecurity.spamProtection,
        spamLimit: dbSecurity.spamLimit || 5,
        spamInterval: dbSecurity.spamInterval || 5,
        spamPunishment: dbSecurity.spamPunishment || "none",
        spamPunishmentDuration: dbSecurity.spamPunishmentDuration || 5,
        spamPunishmentUnit: dbSecurity.spamPunishmentUnit || "minutes",
        spamDeleteAllComments: dbSecurity.spamDeleteAllComments !== false,
        punishment: dbSecurity.punishment || "none"
      };
    }

    if (bodyConfig.security) {
      const anyProtectionEnabled = 
        bodyConfig.security.channelsCreateProtection ||
        bodyConfig.security.channelsDeleteProtection ||
        bodyConfig.security.rolesCreateProtection ||
        bodyConfig.security.rolesDeleteProtection ||
        bodyConfig.security.botsProtection ||
        bodyConfig.security.spamProtection;

      if (anyProtectionEnabled) {
        try {
          const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId).catch(() => null);
          if (guild) {
            const botMember = guild.members.cache.get(discordClient.user.id) || await guild.members.fetch(discordClient.user.id).catch(() => null);
            if (botMember && !botMember.permissions.has("Administrator")) {
              return res.status(400).json({
                success: false,
                error: (bodyConfig.language === "ar" || existing?.language === "ar")
                  ? "البوت يحتاج إلى صلاحية مسؤول (Administrator) في السيرفر لتفعيل جدار الحماية وحماية الرومات والقنوات!"
                  : "The bot lacks Administrator permission in the server to enable channel/role protection guards!"
              });
            }
          }
        } catch (botErr) {
          console.error("Error checking bot admin permissions:", botErr);
        }
      }
    }

    const mergedConfig = { ...existing, ...bodyConfig };
    guildConfigs.set(guildId, mergedConfig);
    saveBotConfigs();
    if (bodyConfig.security) {
      syncDiscordAutoMod(guildId, bodyConfig.security).catch((err) => {
        console.error("Failed to sync Discord AutoMod rules:", err);
      });
    }
    res.json({ success: true });
  });
  app.get("/api/guilds/:id/welcome", (req, res) => {
    const config = guildConfigs.get(req.params.id) || {};
    res.json(config.welcome || {
      channelId: "",
      message: "مرحباً [user] في سيرفر [server]! عدد الأعضاء الآن [membercount]",
      dmEnabled: true,
      dmMessage: "مرحباً بك! نتمنى لك وقتاً ممتعاً. تمت دعوتك بواسطة [Invitedby]",
      bgUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000",
      avatarShape: "circle",
      avatarPos: { x: 0, y: -20 },
      avatarSize: 96,
      textPos: { x: 0, y: 70 },
      textSize: 20
    });
  });
  app.post("/api/guilds/:id/welcome", (req, res) => {
    const existing = guildConfigs.get(req.params.id) || {};
    guildConfigs.set(req.params.id, { ...existing, welcome: req.body });
    saveBotConfigs();
    res.json({ success: true });
  });
  app.get("/api/guilds/:id/levelling", (req, res) => {
    res.json(getLevellingConfig(req.params.id));
  });
  app.post("/api/guilds/:id/levelling", (req, res) => {
    const existing = guildConfigs.get(req.params.id) || {};
    guildConfigs.set(req.params.id, { ...existing, levelling: req.body });
    saveBotConfigs();
    res.json({ success: true });
  });
  app.get("/api/guilds/:id/roles-channels", async (req, res) => {
    try {
      const guild = discordClient.guilds.cache.get(req.params.id);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const roles = guild.roles.cache.map((r) => ({ id: r.id, name: r.name, color: r.color }));
      const channels = guild.channels.cache.filter((c) => c.isTextBased()).map((c) => ({ id: c.id, name: c.name }));
      const categories = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).map((c) => ({ id: c.id, name: c.name }));
      res.json({ roles, channels, categories });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/guilds/:id/auto-features", (req, res) => {
    const config = guildConfigs.get(req.params.id) || {};
    res.json(config.autoFeatures || {
      autolines: [],
      bye: { channelId: "", message: "", lineUrl: "", enabled: false }
    });
  });
  app.post("/api/guilds/:id/auto-features", (req, res) => {
    const existing = guildConfigs.get(req.params.id) || {};
    const oldFeatures = existing.autoFeatures || {};
    guildConfigs.set(req.params.id, {
      ...existing,
      autoFeatures: {
        ...oldFeatures,
        ...req.body
      }
    });
    saveBotConfigs();
    res.json({ success: true });
  });
  app.get("/api/guilds/:id/auto-replies", (req, res) => {
    const config = guildConfigs.get(req.params.id) || {};
    res.json(config.autoReplies || []);
  });
  app.post("/api/guilds/:id/auto-replies", (req, res) => {
    const existing = guildConfigs.get(req.params.id) || {};
    guildConfigs.set(req.params.id, { ...existing, autoReplies: req.body });
    saveBotConfigs();
    res.json({ success: true });
  });
  app.get("/api/backup/configs", (req, res) => {
    try {
      const obj = Object.fromEntries(guildConfigs);
      res.json(obj);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/backup/restore-configs", (req, res) => {
    try {
      const data = req.body;
      if (!data || typeof data !== "object") {
        return res.status(400).json({ error: "Invalid data format" });
      }
      guildConfigs.clear();
      for (const [k, v] of Object.entries(data)) {
        guildConfigs.set(k, v);
      }
      saveBotConfigs();
      res.json({ success: true, count: guildConfigs.size });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/backup/global-state", (req, res) => {
    try {
      res.json(globalState);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/backup/restore-global-state", (req, res) => {
    try {
      const data = req.body;
      if (!data || typeof data !== "object") {
        return res.status(400).json({ error: "Invalid data format" });
      }
      if (data.activeCodes) globalState.activeCodes = data.activeCodes;
      if (data.premiumUsers) globalState.premiumUsers = data.premiumUsers;
      if (data.supportAdmins) globalState.supportAdmins = data.supportAdmins;
      saveWebState(true, false);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/guilds/:id/saved-embeds", (req, res) => {
    const config = guildConfigs.get(req.params.id) || {};
    res.json(config.savedEmbeds || []);
  });
  app.post("/api/guilds/:id/saved-embeds", (req, res) => {
    const existing = guildConfigs.get(req.params.id) || {};
    guildConfigs.set(req.params.id, { ...existing, savedEmbeds: req.body });
    saveBotConfigs();
    res.json({ success: true });
  });
  app.post("/api/guilds/:id/send-embed", async (req, res) => {
    try {
      const { embedId, channelId } = req.body;
      const guildId = req.params.id;
      const guild = discordClient.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: "Target channel not found or not text-based" });
      }
      const config = guildConfigs.get(guildId) || {};
      const savedEmbeds = config.savedEmbeds || [];
      const embedData = savedEmbeds.find((e) => e.id === embedId);
      if (!embedData) return res.status(404).json({ error: "Saved embed not found" });
      const discordEmbed = new EmbedBuilder();
      const files = [];
      if (embedData.title) discordEmbed.setTitle(embedData.title);
      if (embedData.description) discordEmbed.setDescription(embedData.description);
      if (!embedData.title && !embedData.description) {
        discordEmbed.setDescription(" ");
      }
      if (embedData.imageUrl) {
        if (embedData.imageUrl.startsWith("data:image")) {
          const rawParts = embedData.imageUrl.split(";base64,");
          const mime = rawParts[0].split(":")[1] || "image/png";
          const extension = mime.split("/")[1] || "png";
          const base64Data = rawParts.pop();
          const sf = new AttachmentBuilder(Buffer.from(base64Data, "base64"), { name: `embed_img_${embedId}.${extension}` });
          files.push(sf);
          discordEmbed.setImage(`attachment://embed_img_${embedId}.${extension}`);
        } else {
          discordEmbed.setImage(embedData.imageUrl);
        }
      }
      if (embedData.thumbnailUrl) {
        if (embedData.thumbnailUrl.startsWith("data:image")) {
          const rawParts = embedData.thumbnailUrl.split(";base64,");
          const mime = rawParts[0].split(":")[1] || "image/png";
          const extension = mime.split("/")[1] || "png";
          const base64Data = rawParts.pop();
          const sf = new AttachmentBuilder(Buffer.from(base64Data, "base64"), { name: `embed_thumb_${embedId}.${extension}` });
          files.push(sf);
          discordEmbed.setThumbnail(`attachment://embed_thumb_${embedId}.${extension}`);
        } else {
          discordEmbed.setThumbnail(embedData.thumbnailUrl);
        }
      }
      if (embedData.footer) discordEmbed.setFooter({ text: embedData.footer });
      if (embedData.color) {
        const hex = embedData.color.replace("#", "");
        discordEmbed.setColor(parseInt(hex, 16) || 5195493);
      } else {
        discordEmbed.setColor(5195493);
      }
      const components = [];
      if (embedData.buttons && embedData.buttons.length > 0) {
        const row = new ActionRowBuilder();
        embedData.buttons.forEach((btn) => {
          let styleStyle = ButtonStyle.Primary;
          if (btn.style === "secondary") styleStyle = ButtonStyle.Secondary;
          else if (btn.style === "success") styleStyle = ButtonStyle.Success;
          else if (btn.style === "danger") styleStyle = ButtonStyle.Danger;
          const discordBtn = new ButtonBuilder().setCustomId(`eb_btn_${embedData.id}_${btn.id}`).setLabel(btn.label).setStyle(styleStyle);
          if (btn.emoji) {
            discordBtn.setEmoji(btn.emoji);
          }
          row.addComponents(discordBtn);
        });
        components.push(row);
      }
      if (embedData.selectOptions && embedData.selectOptions.length > 0) {
        const select = new StringSelectMenuBuilder().setCustomId(`eb_sel_${embedData.id}`).setPlaceholder(embedData.selectPlaceholder || (config.language === "ar" ? "اختر خياراً تفاعلياً..." : "Select an option..."));
        embedData.selectOptions.forEach((opt) => {
          const option = {
            label: opt.label,
            value: opt.id
          };
          if (opt.description) option.description = opt.description;
          if (opt.emoji) option.emoji = opt.emoji;
          select.addOptions(option);
        });
        const row = new ActionRowBuilder().addComponents(select);
        components.push(row);
      }
      const roleOnAction = embedData.roleOnAction;
      if (components.length === 0 && roleOnAction && roleOnAction.type === "button" && roleOnAction.roleId) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`btn_role_${roleOnAction.roleId}`).setLabel(roleOnAction.buttonLabel || "أخذ رتبة / Toggle Role").setStyle(ButtonStyle.Primary)
        );
        components.push(row);
      }
      const sentMessage = await channel.send({
        embeds: [discordEmbed],
        components,
        files: files.length > 0 ? files : void 0
      });
      if (components.length === 0 && roleOnAction && roleOnAction.type === "reaction" && roleOnAction.roleId && roleOnAction.emoji) {
        await sentMessage.react(roleOnAction.emoji).catch((err) => {
          console.error("Failed to add reaction emoji to sent embed:", err);
        });
      }
      res.json({ success: true, messageId: sentMessage.id });
    } catch (err) {
      console.error("Error sending custom embed:", err);
      res.status(500).json({ error: err.message || "Failed to send embed" });
    }
  });
  app.post("/api/guilds/:id/post-broker-panel", async (req, res) => {
    try {
      const guildId = req.params.id;
      const { panelId } = req.body;
      const guild = discordClient.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const config = guildConfigs.get(guildId) || {};
      const panel = (config.brokerPanels || []).find((p) => p.id === panelId);
      if (!panel) return res.status(404).json({ error: "Broker panel not found" });
      const channel = guild.channels.cache.get(panel.channelId);
      if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: "Target channel not found or not text-based" });
      }
      const embed = new EmbedBuilder().setTitle(panel.title).setDescription(panel.description).setColor(5793266);
      if (panel.imageUrl) {
        embed.setImage(panel.imageUrl);
      } else {
        const icon = guild.iconURL({ extension: "png", forceStatic: false, size: 1024 });
        embed.setThumbnail(icon || "https://cdn.discordapp.com/embed/avatars/0.png");
      }
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`broker_open_${panel.id}`).setLabel(panel.buttonLabel || "طلب وسيط \u{1F91D}").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ticket_reset").setLabel("Reset").setEmoji("1503025344427331734").setStyle(ButtonStyle.Secondary)
      );
      await channel.send({ embeds: [embed], components: [row] });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/guilds/:id/post-suggestion-panel", async (req, res) => {
    try {
      const guildId = req.params.id;
      const { panelId } = req.body;
      const guild = discordClient.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const config = guildConfigs.get(guildId) || {};
      const panel = (config.suggestionPanels || []).find((p) => p.id === panelId);
      if (!panel) return res.status(404).json({ error: "Suggestion panel not found" });
      const channel = guild.channels.cache.get(panel.channelId);
      if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: "Target channel not found or not text-based" });
      }
      const embed = new EmbedBuilder().setTitle(panel.title).setDescription(panel.description).setColor(5793266);
      if (panel.imageUrl) {
        embed.setImage(panel.imageUrl);
      } else if (panel.useServerIcon) {
        const icon = guild.iconURL({ extension: "png", forceStatic: false, size: 1024 });
        embed.setThumbnail(icon || "https://cdn.discordapp.com/embed/avatars/0.png");
      }
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`suggestion_publish_btn`).setEmoji("1511312840672411741").setLabel(panel.buttonLabel || "نشر إقتراح \u{1F4A1}").setStyle(ButtonStyle.Secondary)
      );
      await channel.send({ embeds: [embed], components: [row] });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/guilds/:id/post-ticket-panel", async (req, res) => {
    try {
      const guildId = req.params.id;
      const { panelId } = req.body;
      const guild = discordClient.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const config = guildConfigs.get(guildId) || {};
      const panel = (config.tickets?.panels || []).find((p) => p.id === panelId);
      if (!panel) return res.status(404).json({ error: "Ticket panel not found" });
      const channel = guild.channels.cache.get(panel.channelId);
      if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: "Target channel not found or not text-based" });
      }
      const embed = new EmbedBuilder().setTitle(panel.embedTitle).setDescription(panel.embedDesc).setColor(5793266);
      if (panel.thumbnailUrl) {
        embed.setThumbnail(panel.thumbnailUrl);
      } else if (!panel.hideServerIcon) {
        const icon = guild.iconURL({ extension: "png", forceStatic: false, size: 1024 });
        embed.setThumbnail(icon || "https://cdn.discordapp.com/embed/avatars/0.png");
      }
      if (panel.largeImageUrl) {
        embed.setImage(panel.largeImageUrl);
      }
      const rows = [];
      if (panel.componentsType === "buttons") {
        let row = new ActionRowBuilder();
        (panel.options || []).forEach((opt, idx) => {
          if (idx > 0 && idx % 4 === 0) {
            rows.push(row);
            row = new ActionRowBuilder();
          }
          const btn = new ButtonBuilder().setCustomId(`ticket_open_${panel.id}_${opt.id}`).setLabel(opt.label).setStyle(ButtonStyle.Primary);
          if (opt.emoji) btn.setEmoji(opt.emoji);
          row.addComponents(btn);
        });
        if (row.components.length >= 5) {
          rows.push(row);
          row = new ActionRowBuilder();
        }
        row.addComponents(
          new ButtonBuilder().setCustomId("ticket_reset").setLabel("Reset").setEmoji("1503025344427331734").setStyle(ButtonStyle.Secondary)
        );
        rows.push(row);
      } else {
        const select = new StringSelectMenuBuilder().setCustomId(`ticket_select_${panel.id}`).setPlaceholder("Choose a ticket category...");
        (panel.options || []).forEach((opt) => {
          const option = { label: opt.label, value: opt.id };
          if (opt.emoji) option.emoji = opt.emoji;
          select.addOptions(option);
        });
        rows.push(new ActionRowBuilder().addComponents(select));
        rows.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("ticket_reset").setLabel("Reset").setEmoji("1503025344427331734").setStyle(ButtonStyle.Secondary)
        ));
      }
      await channel.send({ embeds: [embed], components: rows });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/guilds/:id/post-application-panel", async (req, res) => {
    try {
      const guildId = req.params.id;
      const { panelId } = req.body;
      const guild = discordClient.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const config = guildConfigs.get(guildId) || {};
      const panel = (config.applications?.panels || []).find((p) => p.id === panelId);
      if (!panel) return res.status(404).json({ error: "Application panel not found" });
      const channel = guild.channels.cache.get(panel.channelId);
      if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: "Target channel not found or not text-based" });
      }
      const embed = new EmbedBuilder()
        .setTitle(panel.title)
        .setDescription(panel.description)
        .setColor(0x5865F2);
      if (panel.useServerIcon) {
        const icon = guild.iconURL({ extension: "png", forceStatic: false, size: 1024 });
        embed.setThumbnail(icon || "https://cdn.discordapp.com/embed/avatars/0.png");
      }
      if (panel.imageUrl) {
        embed.setImage(panel.imageUrl);
      }
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`apply_start_${panel.id}`)
          .setLabel(panel.buttonLabel || "تقديم الآن 📝")
          .setStyle(ButtonStyle.Success)
      );
      await channel.send({ embeds: [embed], components: [row] });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/guilds/:id/verification", (req, res) => {
    const config = guildConfigs.get(req.params.id) || {};
    res.json(config.verification || {
      enabled: false,
      channelId: "",
      title: "التوثيق المستقل \u{1F512}",
      description: "اضغط على الزر أدناه ليتم توثيقك وتفعيل رتبتك بالكامل في السيرفر.",
      imageUrl: "",
      color: "#10b981",
      buttonLabel: "توثيق الحساب \u{1F512}",
      addRoleId: "",
      removeRoleId: ""
    });
  });
  app.post("/api/guilds/:id/verification", (req, res) => {
    const existing = guildConfigs.get(req.params.id) || {};
    guildConfigs.set(req.params.id, { ...existing, verification: req.body });
    saveBotConfigs();
    res.json({ success: true });
  });
  app.get("/api/guilds/:id/afk", (req, res) => {
    const config = guildConfigs.get(req.params.id) || {};
    res.json(config.afk || {
      enabled: false,
      abbreviation: "!afk",
      allowedRoles: [],
      allowedChannels: [],
      reason: ""
    });
  });
  app.post("/api/guilds/:id/afk", (req, res) => {
    const existing = guildConfigs.get(req.params.id) || {};
    guildConfigs.set(req.params.id, { ...existing, afk: req.body });
    saveBotConfigs();
    res.json({ success: true });
  });
  app.get("/api/guilds/:id/azkar", (req, res) => {
    const config = guildConfigs.get(req.params.id) || {};
    res.json(config.azkar || {
      enabled: false,
      channelId: "",
      mentionType: "none",
      mentionRoleId: "",
      intervalMinutes: 15
    });
  });
  app.post("/api/guilds/:id/azkar", (req, res) => {
    const existing = guildConfigs.get(req.params.id) || {};
    guildConfigs.set(req.params.id, { ...existing, azkar: req.body });
    saveBotConfigs();
    // Instantly apply the changes to the Discord Bot's active interval
    try {
      setupAzkarInterval(req.params.id);
    } catch (e) {
      console.error("[Azkar Setup] Failed to reload interval:", e);
    }
    res.json({ success: true });
  });
  app.post("/api/guilds/:id/post-verification", async (req, res) => {
    try {
      const guildId = req.params.id;
      const guild = discordClient.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: "Guild not found" });
      const config = guildConfigs.get(guildId) || {};
      const verif = config.verification;
      if (!verif || !verif.enabled || !verif.channelId) {
        return res.status(400).json({ error: "Verification system not fully configured or enabled" });
      }
      const channel = guild.channels.cache.get(verif.channelId);
      if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: "Target channel not found or not text-based" });
      }
      const discordEmbed = new EmbedBuilder();
      const files = [];
      const title = verif.title || (config.language === "ar" ? "نظام التوثيق والتحقق المنظم" : "Verification System");
      const desc = verif.description || (config.language === "ar" ? "اضغط على الزر أدناه لتأكيد هويتك وتوثيق حسابك والحصول على الرتبة لتتمكن من تصفح الخادم." : "Click the button below to verify your account and get the verification role.");
      discordEmbed.setTitle(title);
      discordEmbed.setDescription(desc);
      if (verif.imageUrl) {
        if (verif.imageUrl.startsWith("data:image")) {
          const rawParts = verif.imageUrl.split(";base64,");
          const mime = rawParts[0].split(":")[1] || "image/png";
          const extension = mime.split("/")[1] || "png";
          const base64Data = rawParts.pop();
          const sf = new AttachmentBuilder(Buffer.from(base64Data, "base64"), { name: `verif.${extension}` });
          files.push(sf);
          discordEmbed.setImage(`attachment://verif.${extension}`);
        } else {
          discordEmbed.setImage(verif.imageUrl);
        }
      }
      if (verif.color) {
        const hex = verif.color.replace("#", "");
        discordEmbed.setColor(parseInt(hex, 16) || 1096065);
      } else {
        discordEmbed.setColor(1096065);
      }
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("verify_button").setLabel(verif.buttonLabel || (config.language === "ar" ? "توثيق \u{1F512}" : "Verify \u{1F512}")).setStyle(ButtonStyle.Success)
      );
      await channel.send({
        embeds: [discordEmbed],
        components: [row],
        files: files.length > 0 ? files : void 0
      });
      res.json({ success: true });
    } catch (err) {
      console.error("Error posting verif embed:", err);
      res.status(500).json({ error: err.message || "Failed to post verification panel" });
    }
  });
  app.get("/api/guilds/:id/auto-roles", (req, res) => {
    const config = guildConfigs.get(req.params.id) || {};
    res.json({
      enabled: config.autoRolesEnabled ?? (config.autoRoles && config.autoRoles.length > 0 ? true : false),
      roles: config.autoRoles || []
    });
  });
  app.post("/api/guilds/:id/auto-roles", (req, res) => {
    const existing = guildConfigs.get(req.params.id) || {};
    const enabled = req.body && req.body.enabled !== void 0 ? !!req.body.enabled : false;
    const roles = req.body && Array.isArray(req.body.roles) ? req.body.roles : [];
    guildConfigs.set(req.params.id, {
      ...existing,
      autoRolesEnabled: enabled,
      autoRoles: roles
    });
    saveBotConfigs();
    res.json({ success: true });
  });
  app.get("/api/setup/status", (req, res) => {
    const creds = getDiscordCredentials();
    res.json({
      configured: !!(creds.DISCORD_BOT_TOKEN && creds.DISCORD_CLIENT_ID && creds.DISCORD_CLIENT_SECRET),
      hasToken: !!creds.DISCORD_BOT_TOKEN,
      hasClientId: !!creds.DISCORD_CLIENT_ID,
      hasClientSecret: !!creds.DISCORD_CLIENT_SECRET,
      botReady: discordClient.isReady(),
      botTag: discordClient.user?.tag || null
    });
  });
  app.post("/api/setup/save", async (req, res) => {
    const { botToken, clientId, clientSecret } = req.body;
    if (!botToken || !clientId || !clientSecret) {
      return res.status(400).json({ error: "جميع الحقول مطلوبة لتفعيل البوت (Token, Client ID, Client Secret)." });
    }
    try {
      const cleanToken = cleanEnvVar(botToken);
      const cleanId = cleanEnvVar(clientId);
      const cleanSecret = cleanEnvVar(clientSecret);
      updateBotCredentials(cleanToken, cleanId, cleanSecret);
      console.log("Updated credentials, starting discord bot in web integration thread...");
      try {
        await startDiscordBot();
        res.json({
          success: true,
          message: "تم حفظ الإعدادات بنجاح في ملف .env وتم ربط وتشغيل البوت ديسكورد!"
        });
      } catch (loginErr) {
        res.status(400).json({
          success: false,
          error: "تم الحفظ بملف .env ولكن فشل تسجيل دخول البوت بـ التوكن المدخل. الرجاء التحقق من صحة التوكن.",
          rawError: loginErr.message || ""
        });
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "حدث خطأ غير متوقع أثناء الحفظ.",
        rawError: err.message || ""
      });
    }
  });
  app.get("/api/security/status", async (req, res) => {
    let userId = "";
    try {
      const oid = await getUserIdFromToken(req);
      if (oid) {
        userId = oid;
      }
    } catch (e) {
    }
    res.json({
      hasPin: !!globalState.masterPinHash,
      pinVerified: !!req.session.pinVerified,
      userId
    });
  });
  app.post("/api/security/verify", async (req, res) => {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: "الرجاء إدخال رمز الحماية PIN" });
    }
    if (!globalState.masterPinHash) {
      return res.status(400).json({ error: "لم يتم تعيين رمز حماية للوحة التحكم بعد" });
    }
    const verified = verifyPassword(pin, globalState.masterPinHash);
    if (verified) {
      req.session.pinVerified = true;
      return res.json({ success: true, message: "تم التحقق بنجاح!" });
    } else {
      return res.status(401).json({ error: "رمز الحماية الذي أدخلته غير صحيح. يرجى المحاولة مرة أخرى." });
    }
  });
  app.post("/api/security/setup", async (req, res) => {
    const { pin, oldPin } = req.body;
    if (!pin || pin.length < 4) {
      return res.status(400).json({ error: "يجب أن يتكون رمز الحماية من 4 أرقام أو رموز على الأقل." });
    }
    const userId = await getUserIdFromToken(req).catch(() => null);
    const creatorId = "1179133837930938470";
    if (globalState.masterPinHash) {
      const isCreator = userId === creatorId;
      const verifiedOld = oldPin ? verifyPassword(oldPin, globalState.masterPinHash) : false;
      const isSessionAlreadyVerified = !!req.session.pinVerified;
      if (!verifiedOld && !isCreator && !isSessionAlreadyVerified) {
        return res.status(403).json({ error: "رمز الحماية القديم غير صحيح أو غير متطابق." });
      }
    }
    globalState.masterPinHash = hashPassword(pin);
    req.session.pinVerified = true;
    saveWebState(true, false);
    res.json({ success: true, message: "تم تعيين رمز الحماية للوحة التحكم وحفظه بنجاح!" });
  });
  app.post("/api/security/logout", (req, res) => {
    req.session.pinVerified = false;
    res.json({ success: true, message: "تم قفل لوحة التحكم بنجاح." });
  });
  app.get("/api/auth/url", (req, res) => {
    const creds = getDiscordCredentials();
    if (!creds.DISCORD_CLIENT_ID) {
      return res.status(500).json({ error: "DISCORD_CLIENT_ID is not configured. Please add it in your project Settings/Secrets." });
    }
    const providedRedirectUri = req.query.redirect_uri;
    const state = crypto.randomBytes(16).toString("hex");
    req.session.oauthState = state;
    const params = new URLSearchParams({
      client_id: creds.DISCORD_CLIENT_ID,
      redirect_uri: providedRedirectUri,
      response_type: "code",
      scope: "identify guilds",
      state
    });
    res.json({ url: `https://discord.com/api/oauth2/authorize?${params}` });
  });
  app.get("/api/auth/exchange", async (req, res) => {
    const { code, redirect_uri } = req.query;
    if (!code) {
      return res.status(400).json({ error: "Missing code parameter" });
    }
    const creds = getDiscordCredentials();
    console.log(`[OAuth] Exchange called. CLIENT_ID length: ${creds?.DISCORD_CLIENT_ID?.length}, CLIENT_SECRET length: ${creds?.DISCORD_CLIENT_SECRET?.length}`);
    if (!creds.DISCORD_CLIENT_ID || !creds.DISCORD_CLIENT_SECRET) {
      return res.status(500).json({ error: "Discord credentials are not fully configured." });
    }
    try {
      const bodyParams = new URLSearchParams();
      bodyParams.append("client_id", creds.DISCORD_CLIENT_ID);
      bodyParams.append("client_secret", creds.DISCORD_CLIENT_SECRET);
      bodyParams.append("grant_type", "authorization_code");
      bodyParams.append("code", code);
      bodyParams.append("redirect_uri", redirect_uri);
      const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: bodyParams.toString()
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error || `HTTP ${tokenResponse.status}`);
      }
      req.session.discordToken = tokenData.access_token;
      res.json({ success: true, token: tokenData.access_token });
    } catch (err) {
      console.error("OAuth token exchange error:", err.message || err);
      let errorMsg = "فشل تسجيل الدخول: خطأ في مطابقة البيانات. يرجى التحقق من المدخلات.";
      const isSecretSameAsToken = creds.DISCORD_CLIENT_SECRET && creds.DISCORD_CLIENT_SECRET === creds.DISCORD_BOT_TOKEN;
      const isSecretALikelyToken = creds.DISCORD_CLIENT_SECRET && (creds.DISCORD_CLIENT_SECRET.includes(".") || creds.DISCORD_CLIENT_SECRET.length > 50);
      if (err.message && err.message.includes("invalid_client")) {
        if (isSecretSameAsToken) {
          errorMsg = "فشل التحقق (invalid_client) من سيرفرات Discord: لقد قمت بوضع 'توكن البوت' (Bot Token) في حقل 'السر العميل' (Client Secret). يرجى نسخ 'السر العميل' المكون من 32 رمزًا من تبويب OAuth2 في موقع المطورين وليس توكن البوت.";
        } else if (isSecretALikelyToken) {
          errorMsg = "فشل التحقق (invalid_client) من سيرفرات Discord: القيمة التي أدخلتها في حقل 'السر العميل' (Client Secret) تبدو كتوكن بوت (طويلة جدًا وبها نقاط). يرجى نسخ الـ Client Secret الفعلي (32 رمزًا) من صفحة OAuth2 بموقع Discord Developer.";
        } else {
          errorMsg = "فشل التحقق (invalid_client) من سيرفرات Discord: يرجى التأكد من تطابق الـ Client ID مع الـ Client Secret من صفحة تطبيقك في Discord Portal وإعادة إدخالهما بشكل صحيح.";
        }
      } else {
        errorMsg = `فشل تسجيل الدخول. خطأ من ديسكورد: ${err.message || "Unknown error"}`;
      }
      res.status(500).json({ error: errorMsg });
    }
  });
  const oauthCache = /* @__PURE__ */ new Map();
  setInterval(() => {
    const minAge = Date.now() - 24 * 60 * 60 * 1e3;
    for (const [token, value] of oauthCache.entries()) {
      if (value.timestamp < minAge) oauthCache.delete(token);
    }
  }, 3e5);
  async function getUserIdFromToken(req) {
    let token = req.session.discordToken;
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    if (!token) return null;
    const cached = oauthCache.get(token);
    if (cached) return cached.userData?.id || null;
    try {
      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        oauthCache.set(token, {
          userData,
          guildsData: [],
          timestamp: Date.now()
        });
        return userData?.id || null;
      } else {
        if (cached && cached.userData) {
          console.warn("[OAuth Cache] getUserIdFromToken failed. Falling back to cached user id.");
          return cached.userData.id;
        }
      }
    } catch (err) {
      console.error("Error fetching user from token:", err);
      if (cached && cached.userData) {
        return cached.userData.id;
      }
    }
    return null;
  }
  app.get("/api/auth/me", async (req, res) => {
    let token = req.session.discordToken;
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const cached = oauthCache.get(token);
    const now = Date.now();
    if (cached && now - cached.timestamp < 18e5) {
      return res.json({ user: cached.userData, guilds: cached.guildsData });
    }
    try {
      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = await userRes.json();
      if (!userRes.ok) {
        if (cached) {
          console.warn(`[OAuth Cache] /users/@me returned status ${userRes.status}. Falling back to cached data.`);
          return res.json({ user: cached.userData, guilds: cached.guildsData });
        }
        return res.status(userRes.status).json({ error: userData.message || "Invalid discord token" });
      }
      const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const guildsData = await guildsRes.json();
      let finalGuilds = guildsData;
      if (!guildsRes.ok) {
        if (cached) {
          console.warn(`[OAuth Cache] /users/@me/guilds returned status ${guildsRes.status}. Falling back to cached guilds.`);
          finalGuilds = cached.guildsData;
        } else {
          if (guildsRes.status === 429) {
            return res.status(429).json({ error: "Discord API is rate limited. Please refresh in a moment." });
          }
          finalGuilds = [];
        }
      }
      oauthCache.set(token, {
        userData,
        guildsData: finalGuilds,
        timestamp: Date.now()
      });
      res.json({ user: userData, guilds: finalGuilds });
    } catch (err) {
      if (cached) {
        console.warn("[OAuth Cache] Network error fetching from Discord. Falling back to cached data:", err.message);
        return res.json({ user: cached.userData, guilds: cached.guildsData });
      }
      res.status(500).json({ error: "Failed to fetch Discord data: " + err.message });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
  app.get("/transcripts/:filename", (req, res) => {
    const filePath = path.join(TRANSCRIPTS_DIR, req.params.filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).send("Transcript not found.");
    }
  });
  function isUserAdmin(userId) {
    if (userId === "1179133837930938470") return true;
    return !!globalState.supportAdmins?.[userId];
  }
  app.get("/api/support/tickets", (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const tickets = loadSupportTicketsRecord();
    if (isUserAdmin(userId)) {
      return res.json(Object.values(tickets));
    } else {
      const ticket = tickets[userId];
      return res.json(ticket ? [ticket] : []);
    }
  });
  app.get("/api/support/tickets/:id", (req, res) => {
    const tickets = loadSupportTicketsRecord();
    const ticket = tickets[req.params.id];
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json(ticket);
  });
  app.post("/api/support/tickets", (req, res) => {
    const { userId, username, avatar } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const tickets = loadSupportTicketsRecord();
    if (!tickets[userId]) {
      tickets[userId] = {
        ticketId: userId,
        userId,
        username: username || "عميل",
        avatar: avatar || "",
        status: "open",
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
        messages: [
          {
            id: "msg_welcome",
            sender: "admin",
            senderName: "نظام الدعم الفني",
            senderAvatar: "https://cdn.discordapp.com/embed/avatars/0.png",
            text: "مرحباً بك في مركز الدعم الفني! كيف يمكننا مساعدتك اليوم؟ يمكنك إرسال نصوص وصور ومقاطع صوتية أو بدء مكالمة مباشرة معنا.",
            timestamp: Date.now()
          }
        ],
        call: {
          active: false,
          type: "voice",
          callerId: null,
          muted: false,
          callerMuted: false,
          receiverMuted: false,
          startedAt: null
        }
      };
      saveSupportTicketsRecord(tickets);
    }
    res.json(tickets[userId]);
  });
  app.post("/api/support/tickets/:id/messages", (req, res) => {
    const { sender, senderName, senderAvatar, text, image, voice } = req.body;
    const tickets = loadSupportTicketsRecord();
    const ticket = tickets[req.params.id];
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    const newMessage = {
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      sender: sender || "user",
      senderName: senderName || "مستخدم",
      senderAvatar: senderAvatar || "",
      text: text || "",
      image: image || null,
      voice: voice || null,
      timestamp: Date.now()
    };
    ticket.messages.push(newMessage);
    ticket.lastUpdatedAt = Date.now();
    saveSupportTicketsRecord(tickets);
    res.json(newMessage);
  });
  app.post("/api/support/tickets/:id/call", (req, res) => {
    const { action, type, callerId, callerMuted, receiverMuted } = req.body;
    const tickets = loadSupportTicketsRecord();
    const ticket = tickets[req.params.id];
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (!ticket.call) {
      ticket.call = {
        active: false,
        type: "voice",
        callerId: null,
        muted: false,
        callerMuted: false,
        receiverMuted: false,
        startedAt: null
      };
    }
    if (action === "start") {
      ticket.call.active = true;
      ticket.call.type = type || "voice";
      ticket.call.callerId = callerId || "";
      ticket.call.muted = false;
      ticket.call.callerMuted = false;
      ticket.call.receiverMuted = false;
      ticket.call.startedAt = Date.now();
      ticket.messages.push({
        id: "msg_call_log_" + Date.now(),
        sender: "system",
        senderName: "النظام",
        senderAvatar: "",
        text: `\u{1F4DE} تم بدء مكالمة ${type === "video" ? "فيديو" : "صوتية"} مباشرة...`,
        timestamp: Date.now()
      });
    } else if (action === "end") {
      ticket.call.active = false;
      ticket.call.startedAt = null;
      ticket.call.callerId = null;
      ticket.messages.push({
        id: "msg_call_log_" + Date.now(),
        sender: "system",
        senderName: "النظام",
        senderAvatar: "",
        text: `⏹️ انتهت المكالمة المباشرة.`,
        timestamp: Date.now()
      });
    } else if (action === "update_mute") {
      if (callerId === ticket.userId) {
        ticket.call.callerMuted = !!callerMuted;
      } else {
        ticket.call.receiverMuted = !!receiverMuted;
      }
    }
    ticket.lastUpdatedAt = Date.now();
    saveSupportTicketsRecord(tickets);
    res.json(ticket.call);
  });
  app.get("/api/support/me-role", (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.json({ isAdmin: false });
    res.json({ isAdmin: isUserAdmin(userId) });
  });
  let cachedSupportGuildId = null;
  app.get("/api/support/check-membership", async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
      return res.json({ isInSupportServer: false });
    }
    try {
      if (!cachedSupportGuildId && discordClient.isReady()) {
        const invite = await discordClient.fetchInvite("3ZeD9EEbFP").catch(() => null);
        if (invite && invite.guild) {
          cachedSupportGuildId = invite.guild.id;
        }
      }
      if (cachedSupportGuildId && discordClient.isReady()) {
        const guild = discordClient.guilds.cache.get(cachedSupportGuildId);
        if (guild) {
          const member = await guild.members.fetch(userId).catch(() => null);
          return res.json({ isInSupportServer: !!member });
        }
      }
      res.json({ isInSupportServer: false });
    } catch (err) {
      console.error("Error checking support server membership:", err);
      res.json({ isInSupportServer: false });
    }
  });
  app.get("/api/backup/github/config", (req, res) => {
    res.json(globalState.githubSync || { enabled: false, token: "", repo: "", branch: "main", lastSync: 0 });
  });
  app.post("/api/backup/github/config", (req, res) => {
    const config = req.body;
    globalState.githubSync = {
      ...globalState.githubSync,
      ...config
    };
    saveWebState(true, false);
    res.json({ success: true });
  });
  async function updateGitHubFile(token, repo, filePath, content, branch = "main") {
    const url = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`;
    const getRes = await fetch(url, {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "NTL-Bot-Dashboard"
      }
    });
    let sha;
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }
    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `token ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "NTL-Bot-Dashboard"
      },
      body: JSON.stringify({
        message: `Sync ${filePath} from Dashboard [automated]`,
        content: Buffer.from(content).toString("base64"),
        sha,
        branch
      })
    });
    if (!putRes.ok) {
      const err = await putRes.json();
      console.error(`GitHub API Error (${filePath}):`, err);
      return false;
    }
    return true;
  }
  app.post("/api/backup/github/sync-to", async (req, res) => {
    const { token, repo, branch } = globalState.githubSync;
    if (!token || !repo) return res.status(400).json({ error: "GitHub integration not configured." });
    try {
      const configsObj = Object.fromEntries(guildConfigs);
      const configsContent = JSON.stringify(configsObj, null, 2);
      const stateContent = JSON.stringify(globalState, null, 2);
      const success1 = await updateGitHubFile(token, repo, "guildConfigs.json", configsContent, branch);
      const success2 = await updateGitHubFile(token, repo, "globalState.json", stateContent, branch);
      if (success1 && success2) {
        globalState.githubSync.lastSync = Date.now();
        saveWebState(true, false);
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to sync one or more files to GitHub. Check repository permissions." });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/backup/github/sync-from", async (req, res) => {
    const { token, repo, branch } = globalState.githubSync;
    if (!token || !repo) return res.status(400).json({ error: "GitHub integration not configured." });
    try {
      const fetchFile = async (path2) => {
        const url = `https://api.github.com/repos/${repo}/contents/${path2}?ref=${branch}`;
        const res2 = await fetch(url, {
          headers: {
            "Authorization": `token ${token}`,
            "Accept": "application/vnd.github.v3+raw",
            "User-Agent": "NTL-Bot-Dashboard"
          }
        });
        if (!res2.ok) return null;
        return res2.text();
      };
      const configsContent = await fetchFile("guildConfigs.json");
      const stateContent = await fetchFile("globalState.json");
      if (configsContent) {
        const parsed = JSON.parse(configsContent);
        guildConfigs.clear();
        for (const [k, v] of Object.entries(parsed)) {
          guildConfigs.set(k, v);
        }
        saveBotConfigs();
      }
      if (stateContent) {
        const parsed = JSON.parse(stateContent);
        Object.assign(globalState, parsed);
        saveWebState(true, false);
      }
      globalState.githubSync.lastSync = Date.now();
      saveWebState(true, false);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  if (true) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[WebServer] Website backend running on port ${PORT}`);
  }).on("error", (err) => {
    console.error("Express server error:", err);
    process.exit(1);
  });
}
