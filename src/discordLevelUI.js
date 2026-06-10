import { AttachmentBuilder } from "discord.js";
import { calculateLevelFromTotalXp, getBucketKey } from "./levellingLogic.js";
export async function handleLevellingCommands(context, lConf, config, commandOptions) {
  if (!lConf || !lConf.enabled) {
    const lang = config?.language || "ar";
    const msg = lang === "ar" ? "⚠️ نظام المستويات واللفلات معطل في هذا السيرفر حالياً." : "⚠️ The levelling system is currently disabled in this server.";
    if (context.reply) {
      return await context.reply({ content: msg, ephemeral: true }).catch(() => null);
    }
    return;
  }
  if (lConf.commandChannels && lConf.commandChannels.length > 0) {
    const channelId = context.channelId || context.channel?.id;
    if (channelId && !lConf.commandChannels.includes(channelId)) {
      const lang = config?.language || "ar";
      const msg = lang === "ar" ? "⚠️ لا يمكنك استخدام أوامر الليفل في هذه القناة. يرجى استخدام القنوات المسموحة للأوامر." : "⚠️ You cannot use levelling commands in this channel. Please use the allowed channels.";
      if (context.reply) {
        return await context.reply({ content: msg, ephemeral: true }).catch(() => null);
      }
      return;
    }
  }
  const member = context.member;
  if (lConf.restrictedRoles && lConf.restrictedRoles.length > 0 && member) {
    const hasAllowedRole = lConf.restrictedRoles.some((roleId) => member.roles.cache.has(roleId));
    if (!hasAllowedRole) {
      const lang = config.language || "ar";
      const msg = lang === "ar" ? "ليس لديك الصلاحية لاستخدام أوامر ليفيل." : "You do not have permission to use levelling commands.";
      return await context.reply({ content: msg, ephemeral: true });
    }
  }
  let isIdCommand = false;
  let topSubCmd = "all";
  let targetUser = context.author || context.user;
  if (context.isChatInputCommand?.() || commandOptions?.isSlashId) {
    if (context.commandName === "id" || context.commandName === "profile" || commandOptions?.isSlashId) {
      isIdCommand = true;
      if (context.options) {
        const usr = context.options.getUser("target") || context.options.getUser("user");
        if (usr) targetUser = usr;
      }
    } else if (context.commandName === "top") {
      topSubCmd = context.options?.getString("type") || "all";
    }
    if (commandOptions?.topSubCmd) {
      topSubCmd = commandOptions.topSubCmd;
    }
  } else {
    const args = context.content.trim().split(/\s+/);
    const topPrefix = lConf.topPrefix || "top";
    const subCmd = args[1]?.toLowerCase();
    topSubCmd = subCmd || "all";
    const contentLower = context.content?.trim().toLowerCase() || "";
    const idAliases = ["id", "profile", "rank"];
    isIdCommand = idAliases.some((alias) => contentLower.includes(alias));
    targetUser = context.mentions?.users?.first() || context.author;
  }
  if (isIdCommand) {
    await sendIdCard(context, lConf, config, targetUser);
    return;
  }
  await sendTopMenu(context, lConf, config, topSubCmd, targetUser);
}
async function sendIdCard(context, lConf, config, targetUser) {
  const targetUserId = targetUser?.id || "";
  if (!config.usersXP) config.usersXP = {};
  const userXP = config.usersXP[targetUserId] || { chatXP: 0, voiceXP: 0 };
  const allUsers = Object.entries(config.usersXP).map(([id, data]) => ({
    id,
    chatXP: Number(data.chatXP) || 0,
    voiceXP: Number(data.voiceXP) || 0
  }));
  const chatUsers = [...allUsers].sort((a, b) => b.chatXP - a.chatXP);
  const chatRank = chatUsers.findIndex((u) => u.id === targetUserId) + 1 || chatUsers.length + 1;
  const voiceUsers = [...allUsers].sort((a, b) => b.voiceXP - a.voiceXP);
  const voiceRank = voiceUsers.findIndex((u) => u.id === targetUserId) + 1 || voiceUsers.length + 1;
  const chatData = calculateLevelFromTotalXp(lConf.chat, userXP.chatXP);
  const voiceData = calculateLevelFromTotalXp(lConf.voice, userXP.voiceXP);
  try {
    if (context.deferReply) await context.deferReply();
    const { createCanvas, loadImage } = await import("canvas");
    const canvas = createCanvas(800, 350);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1A1B26";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#2A2C3C";
    ctx.beginPath();
    ctx.arc(400, -100, 400, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(targetUser.username.toUpperCase(), 240, 70);
    ctx.fillStyle = "#8a8d9e";
    ctx.font = "22px sans-serif";
    ctx.fillText(`UNIQUE_ID: #${targetUser.discriminator || "0000"}`, 240, 105);
    const totalMinutes = Math.floor(userXP.voiceXP / 10);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = "#c0caf5";
    ctx.fillText(`TOTAL VOICE TIME: ${hours}h & ${mins}m`, 500, 100);
    ctx.save();
    ctx.beginPath();
    ctx.arc(120, 120, 80, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    try {
      const avatarImg = await loadImage(targetUser.displayAvatarURL({ extension: "png", size: 256 }) || "https://i.pravatar.cc/256");
      ctx.drawImage(avatarImg, 40, 40, 160, 160);
    } catch (e) {
    }
    ctx.restore();
    const drawBar = (y, label, totalXp, currentXp, req, level, rank, color) => {
      ctx.fillStyle = color;
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(`${label} XP: ${totalXp.toLocaleString()} • LEVEL ${level}`, 200, y);
      ctx.fillStyle = "#16161E";
      ctx.beginPath();
      ctx.roundRect(200, y + 15, 450, 24, 12);
      ctx.fill();
      const percent = Math.min(1, currentXp / req);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(200, y + 15, 450 * percent, 24, 12);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${currentXp.toLocaleString()} / ${req.toLocaleString()}`, 425, y + 33);
      ctx.textAlign = "left";
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(700, y + 25, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#16161E";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`#${rank}`, 700, y + 33);
      ctx.textAlign = "left";
    };
    drawBar(200, "CHAT", Number(userXP.chatXP || 0), chatData.currentXp, chatData.nextReq, chatData.level, chatRank, "#7aa2f7");
    drawBar(280, "VOICE", Number(userXP.voiceXP || 0), voiceData.currentXp, voiceData.nextReq, voiceData.level, voiceRank, "#bb9af7");
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: "profile.png" });
    if (context.editReply) {
      await context.editReply({ files: [attachment], allowedMentions: { parse: [] } });
    } else {
      await context.reply({ files: [attachment], allowedMentions: { parse: [] } });
    }
  } catch (e) {
    console.error("Canvas error:", e);
    const fallbackMsg = "Could not generate ID card. Make sure the canvas library is supported.";
    try {
      if (context.editReply) await context.editReply({ content: fallbackMsg, allowedMentions: { parse: [] } });
      else await context.reply({ content: fallbackMsg, allowedMentions: { parse: [] } });
    } catch (fallbackErr) {
      console.error("Fallback ID card failed:", fallbackErr);
    }
  }
}
async function sendTopMenu(context, lConf, config, subCmd, targetUser) {
  let mode = "all";
  if (subCmd === "day" || subCmd === "week" || subCmd === "month" || subCmd === "year") {
    mode = subCmd;
  }
  if (context.deferReply) {
    await context.deferReply().catch(() => {
    });
  }
  const reply = async (options) => {
    if (context.editReply && (context.deferred || context.replied)) {
      return await context.editReply(options);
    }
    return await context.reply(options);
  };
  const allUsers = Object.entries(config.usersXP || {}).map(([id, data]) => {
    let cxp = data.chatXP || 0;
    let vxp = data.voiceXP || 0;
    if (mode !== "all") {
      const key = getBucketKey(mode);
      if (data.lastDay === key && mode === "day") {
        cxp = data.chatDaily || 0;
        vxp = data.voiceDaily || 0;
      } else if (data.lastWeek === key && mode === "week") {
        cxp = data.chatWeekly || 0;
        vxp = data.voiceWeekly || 0;
      } else if (data.lastMonth === key && mode === "month") {
        cxp = data.chatMonthly || 0;
        vxp = data.voiceMonthly || 0;
      } else if (data.lastYear === key && mode === "year") {
        cxp = data.chatYearly || 0;
        vxp = data.voiceYearly || 0;
      } else {
        cxp = 0;
        vxp = 0;
      }
    }
    return { id, chatXP: cxp, voiceXP: vxp };
  });
  const byChat = [...allUsers].sort((a, b) => b.chatXP - a.chatXP).filter((u) => u.chatXP > 0).slice(0, 5);
  const byVoice = [...allUsers].sort((a, b) => b.voiceXP - a.voiceXP).filter((u) => u.voiceXP > 0).slice(0, 5);
  let textPayload = "";
  try {
    const djs = await import("discord.js");
    const ContainerBuilder = djs.ContainerBuilder;
    const MessageFlags = djs.MessageFlags;
    if (ContainerBuilder && MessageFlags?.IsComponentsV2) {
      const container = new ContainerBuilder();
      const buildSection = (users, type, targetId) => {
        container.addTextDisplayComponents((t) => t.setContent(`## ${type === "chat" ? "\u{1F4AC} أفضل نقاط الكتابة" : "\u{1F3A4} أفضل نقاط الصوت"}`));
        container.addSeparatorComponents((s) => s);
        let foundSelf = false;
        if (users.length === 0) {
          container.addTextDisplayComponents((t) => t.setContent("لا يوجد بيانات بعد."));
        } else {
          users.forEach((u, i) => {
            const isSelf = u.id === targetId;
            if (isSelf) foundSelf = true;
            const xp = type === "chat" ? u.chatXP : u.voiceXP;
            const typeConfig = type === "chat" ? lConf.chat : lConf.voice;
            const lvl = calculateLevelFromTotalXp(typeConfig, xp).level;
            const prefix = isSelf ? "\u{1F537}" : "\u{1F538}";
            container.addTextDisplayComponents((t) => t.setContent(`${prefix} | **#${i + 1}** | <@${u.id}> - خبرة: **${xp}** \`|\` مستوى: **${lvl}**`));
            container.addSeparatorComponents((s) => s);
          });
        }
        if (!foundSelf) {
          const rankIndex = [...allUsers].sort((a, b) => type === "chat" ? b.chatXP - a.chatXP : b.voiceXP - a.voiceXP).findIndex((u) => u.id === targetId);
          if (rankIndex >= 0) {
            const selfData = allUsers[rankIndex];
            const xp = type === "chat" ? selfData.chatXP : selfData.voiceXP;
            if (xp > 0) {
              const typeConfig = type === "chat" ? lConf.chat : lConf.voice;
              const lvl = calculateLevelFromTotalXp(typeConfig, xp).level;
              container.addTextDisplayComponents((t) => t.setContent(`\u{1F537} | **#${rankIndex + 1}** | <@${targetId}> - خبرة: **${xp}** \`|\` مستوى: **${lvl}**`));
              container.addSeparatorComponents((s) => s);
            }
          }
        }
      };
      buildSection(byChat, "chat", targetUser?.id || "");
      container.addTextDisplayComponents((t) => t.setContent("# ​"));
      buildSection(byVoice, "voice", targetUser?.id || "");
      let footerText = "";
      if (mode === "day") {
        const eod = /* @__PURE__ */ new Date();
        eod.setHours(23, 59, 59, 999);
        const ts = Math.floor(eod.getTime() / 1e3);
        footerText = `سيتم تصفير توب اليومي خلال <t:${ts}:R>.`;
      }
      if (footerText) {
        container.addTextDisplayComponents((t) => t.setContent(`-# ${footerText}`));
      }
      await reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
    } else {
      const embed = new djs.EmbedBuilder().setColor(2829617);
      const generateText = (users, type, targetId) => {
        let str = `## ${type === "chat" ? "\u{1F4AC} أفضل نقاط الكتابة" : "\u{1F3A4} أفضل نقاط الصوت"}
---
`;
        let foundSelf = false;
        users.forEach((u, i) => {
          const isSelf = u.id === targetId;
          if (isSelf) foundSelf = true;
          const prefix = isSelf ? "\u{1F537}" : "\u{1F538}";
          const xp = type === "chat" ? u.chatXP : u.voiceXP;
          const typeConfig = type === "chat" ? lConf.chat : lConf.voice;
          const lvl = calculateLevelFromTotalXp(typeConfig, xp).level;
          str += `**${prefix} | #${i + 1} |** <@${u.id}> - خبرة: **${xp}** \`|\` مستوى: **${lvl}**
---
`;
        });
        if (!foundSelf) {
          const rankIndex = [...allUsers].sort((a, b) => type === "chat" ? b.chatXP - a.chatXP : b.voiceXP - a.voiceXP).findIndex((u) => u.id === targetId);
          if (rankIndex >= 0) {
            const selfData = allUsers[rankIndex];
            const xp = type === "chat" ? selfData.chatXP : selfData.voiceXP;
            if (xp > 0) {
              const typeConfig = type === "chat" ? lConf.chat : lConf.voice;
              const lvl = calculateLevelFromTotalXp(typeConfig, xp).level;
              str += `---
**\u{1F537} | #${rankIndex + 1} |** <@${targetId}> - خبرة: **${xp}** \`|\` مستوى: **${lvl}**
---
`;
            }
          }
        }
        if (str === `## ${type === "chat" ? "\u{1F4AC} أفضل نقاط الكتابة" : "\u{1F3A4} أفضل نقاط الصوت"}
---
`) str += "لا يوجد بيانات بعد.\n---\n";
        return str + "\n";
      };
      textPayload = generateText(byChat, "chat", targetUser?.id || "") + generateText(byVoice, "voice", targetUser?.id || "");
      if (mode === "day") {
        const eod = /* @__PURE__ */ new Date();
        eod.setHours(23, 59, 59, 999);
        const ts = Math.floor(eod.getTime() / 1e3);
        textPayload += `-# سيتم تصفير توب اليومي خلال <t:${ts}:R>.`;
      }
      embed.setDescription(textPayload);
      await reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
  } catch (err) {
    console.error(err);
    try {
      await reply({ content: textPayload || "حدث خطأ أثناء إظهار القائمة.", allowedMentions: { parse: [] } });
    } catch (fallbackErr) {
      console.error("Fallback reply also failed:", fallbackErr);
    }
  }
}
