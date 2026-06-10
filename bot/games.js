import {
  createCanvas,
  loadImage
} from "canvas";
import {
  AttachmentBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from "discord.js";
import { GoogleGenAI } from "@google/genai";
const CATEGORIES = ["اسم", "حيوان", "نبات", "جماد", "دولة"];
const LETTERS = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي".split("");
let aiClient = null;
function getAI() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || "AIzaSyCwR3H74aFQDIOKE1Aexr3lcVVfej56OLM";
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
  }
  return aiClient;
}
async function validateArabicWord(word, category, letter) {
  if (!word) return { isValid: false, reason: "لم يتم كتابة أي كلمة!" };
  word = word.trim();
  if (word.length < 2) return { isValid: false, reason: "الكلمة قصيرة جداً، يجب أن تكون من حرفين على الأقل!" };
  const firstChar = word.charAt(0);
  const alternatives = {
    "أ": ["أ", "إ", "آ", "ا"],
    "إ": ["أ", "إ", "آ", "ا"],
    "آ": ["أ", "إ", "آ", "ا"],
    "ا": ["أ", "إ", "آ", "ا"],
    "ي": ["ي", "ى"],
    "ى": ["ي", "ى"],
    "ه": ["ه", "ة"],
    "ة": ["ه", "ة"]
  };
  const allowedStarts = alternatives[letter] || [letter];
  const matchesStart = allowedStarts.some((char) => firstChar === char);
  if (!matchesStart) {
    return {
      isValid: false,
      reason: `الكلمة تبدأ بحرف "${firstChar}" والمطلوب حرف "${letter}"!`
    };
  }
  const ai = getAI();
  if (!ai) {
    console.warn("No GEMINI_API_KEY configured. Falling back to simple letter starting validation.");
    return {
      isValid: true,
      reason: `تم قبول الكلمة تلقائياً كبديل ذكي (لا يوجد مفتاح ذكاء اصطناعي مفعل للتحقق من الفئات).`
    };
  }
  try {
    const prompt = `أنت حكم صارم ودقيق في اللعبة العربية الشهيرة "اسم ولد بنت جماد حيوان نبات بلاد".
مهمتك هي التحقق هل الكلمة المقدمة من اللاعب تعتبر إجابة صحيحة وحقيقية للفئة المحددة وتبدأ بالحرف المطابق.

المعطيات:
- الحرف المطلوب: "${letter}"
- الفئة المطلوبة: "${category}"
- الكلمة التي كتبها اللاعب: "${word}"

معايير دقيقة لكل فئة:
1. اسم: يجب أن تكون اسم علم شخصي حقيقي للبشر (مذكر أو مؤنث معروف، مثل: أحمد، ياسمين، قاسم، قمر). لا تقبل كلمات عشوائية أو صفات أو أفعال ليست أسماء علم.
2. حيوان: كائن حي حقيقي ينتمي للمملكة الحيوانية كالثدييات، الطيور، الحشرات، الأسماك والزواحف (مثل: قرد، قطة، قرش، قنفذ).
3. نبات: أي نبات أو شجرة أو فاكهة أو خضار أو زهرة حقيقية معروفة (مثل: قرنبيط، قمح، قطن، قصب).
4. جماد: شيء غير حي حسي وملموس (ليس حيواناً ولا نباتاً ولا إنساناً، مثل: قلم، قفل، قطار، قماش، قارب).
5. دولة: دولة، مدينة، عاصمة، قارة، أو بلاد جغرافية معروفة حقيقية (مثل: قطر، قبرص، قسنطينة).

شروط الصحة:
- يجب أن تبدأ الكلمة بالحرف "${letter}" أو أحد أشكاله المتطابقة (ا/أ/إ/آ) وإلا فهي غير صحيحة مطلقاً.
- الكلمة يجب أن تكون حقيقية ومكتوبة بإملاء صحيح باللغة العربية وليست اختراعاً أو كلاماً غير مفهوم.
- الكلمة يجب أن تكون تحديداً وبدقة من الفئة المطلوبة. مثلاً "قرنبيط" هو نبات، فإذا أرسله اللاعب في فئة "اسم" أو "دولة" أو "جماد" فهو غير صحيح!

أجب بصيغة JSON فقط بهذا الشكل:
{
  "valid": true,
  "reason": "توضيح مختصر وعادل باللغة العربية لسبب القبول"
}
أو
{
  "valid": false,
  "reason": "توضيح مختصر باللغة العربية لسبب الرفض"
}
`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const bodyText = response.text ? response.text.trim() : "";
    console.log(`Replica Word check: [${word}] under [${category}] with [${letter}] -> Gemini result: ${bodyText}`);
    try {
      const parsed = JSON.parse(bodyText);
      return {
        isValid: typeof parsed.valid === "boolean" ? parsed.valid : false,
        reason: parsed.reason || "تم التحقق بنجاح."
      };
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON output:", parseErr, "Raw output was:", bodyText);
      return {
        isValid: bodyText.toLowerCase().includes("true"),
        reason: "تم قبول الكلمة تلقائياً أو حدوث خلل تقني في التحليل."
      };
    }
  } catch (error) {
    console.error("Failed to run Gemini word validation, falling back to basic check:", error);
    return {
      isValid: true,
      reason: "حدث خطأ في الاتصال بالذكاء الاصطناعي، تم قبول الكلمة كبديل مؤقت."
    };
  }
}
export class ReplicaGame {
  constructor(client, channelId, guildId, prefix, isPremium = false) {
    this.players = [];
    this.activePlayers = [];
    this.currentLetter = "";
    this.currentCategoryIdx = 0;
    this.gameState = "joining";
    this.roundData = [];
    // History for the image
    this.allRounds = [];
    this.maxPlayers = 30;
    this.discordClient = client;
    this.channelId = channelId;
    this.guildId = guildId;
    this.prefix = prefix;
    this.maxPlayers = isPremium ? 100 : 30;
  }
  async start() {
    const channel = await this.discordClient.channels.fetch(this.channelId);
    if (!channel) return;
    const embed = new EmbedBuilder().setTitle("\u{1F3AE} بدأت فعالية ريبلكا!").setDescription(`
**طريقة اللعب:**
- اضغط على الزر ادناه لدخول اللعبة <:AddP:1503025246540791880>
- يتم اختيار حرف عشوائي كل جولة <:wheel:1504827425576718447>
- لكل نوع: اسم, حيوان, نبات, جماد و دولة, يتم اختيار لاعب عشوائي ليرسل الكلمة التي تناسب الحرف <:Send:1504828192773509180>
- اخر لاعب يفوز فاللعبة <:Cup:1504829126735953920>

__اللاعبين المشاركين:__ **(0/${this.maxPlayers})**
يتم تحديث القائمة تلقائياً...
      `).setColor("#5865F2");
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("join_replica").setLabel("دخول اللعبة").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("leave_replica").setLabel("خروج").setStyle(ButtonStyle.Danger)
    );
    const msg = await channel.send({ embeds: [embed], components: [row] });
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 6e4 });
    const BASE_RULES = `
**طريقة اللعب:**
- اضغط على الزر ادناه لدخول اللعبة <:AddP:1503025246540791880>
- يتم اختيار حرف عشوائي كل جولة <:wheel:1504827425576718447>
- لكل نوع: اسم, حيوان, نبات, جماد و دولة, يتم اختيار لاعب عشوائي ليرسل الكلمة التي تناسب الحرف <:Send:1504828192773509180>
- اخر لاعب يفوز فاللعبة <:Cup:1504829126735953920>
`;
    collector.on("collect", async (i) => {
      if (i.customId === "leave_replica") {
        if (!this.players.some((p) => p.id === i.user.id)) {
          return i.reply({ content: "أنت لست في اللعبة أصلاً!", ephemeral: true });
        }
        this.players = this.players.filter((p) => p.id !== i.user.id);
        const playerList2 = this.players.map((p) => `- <@${p.id}>`).join("\n");
        const updatedDesc2 = `${BASE_RULES}
__اللاعبين المشاركين:__ **(${this.players.length}/${this.maxPlayers})**
${playerList2}`;
        const newEmbed2 = EmbedBuilder.from(embed).setDescription(updatedDesc2 || "");
        await msg.edit({ embeds: [newEmbed2] });
        return i.reply({ content: "تم خروجك من اللعبة!", ephemeral: true });
      }
      if (this.players.some((p) => p.id === i.user.id)) {
        return i.reply({ content: "أنت موجود بالفعل في اللعبة!", ephemeral: true });
      }
      if (this.players.length >= this.maxPlayers) {
        return i.reply({ content: "اللعبة ممتلئة!", ephemeral: true });
      }
      this.players.push({
        id: i.user.id,
        username: i.user.username,
        avatar: i.user.displayAvatarURL({ extension: "png", size: 64 })
      });
      const playerList = this.players.map((p) => `- <@${p.id}>`).join("\n");
      const updatedDesc = `${BASE_RULES}
__اللاعبين المشاركين:__ **(${this.players.length}/${this.maxPlayers})**
${playerList}`;
      const newEmbed = EmbedBuilder.from(embed).setDescription(updatedDesc || "");
      await msg.edit({ embeds: [newEmbed] });
      await i.reply({ content: "تم انضمامك للعبة!", ephemeral: true });
    });
    collector.on("end", async () => {
      if (this.players.length < 2) {
        return channel.send("❌ لا يوجد عدد كافي من اللاعبين لبدء اللعبة (تحتاج لاعبين على الأقل).");
      }
      this.activePlayers = [...this.players];
      await channel.send("✅ | تم تجهيز اللاعبين. ستبدأ الجولة الأولى في بضع ثواني...");
      setTimeout(() => this.nextRound(), 5e3);
    });
  }
  async nextRound() {
    if (this.activePlayers.length <= 1) {
      return this.endGame();
    }
    this.currentLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    this.currentCategoryIdx = 0;
    this.roundData = [];
    const channel = await this.discordClient.channels.fetch(this.channelId);
    await channel.send(`\u{1F520} حرف هذه الجولة هو **${this.currentLetter}**`);
    this.processNextCategory();
  }
  async processNextCategory() {
    if (this.currentCategoryIdx >= CATEGORIES.length || this.activePlayers.length <= 1) {
      this.allRounds.push({ letter: this.currentLetter, data: [...this.roundData] });
      await this.sendRoundSummary();
      setTimeout(() => this.nextRound(), 1e4);
      return;
    }
    const category = CATEGORIES[this.currentCategoryIdx];
    const player = this.activePlayers[Math.floor(Math.random() * this.activePlayers.length)];
    const channel = await this.discordClient.channels.fetch(this.channelId);
    await channel.send(`<@${player.id}> لديك **15 ثانية** لإرسال **${category}** يبدأ بحرف **${this.currentLetter}**.`);
    const filter = (m) => m.author.id === player.id;
    const collector = channel.createMessageCollector({ filter, time: 15e3, max: 1 });
    collector.on("collect", async (m) => {
      const answer = m.content.trim();
      const result = await validateArabicWord(answer, category, this.currentLetter);
      if (result.isValid) {
        await channel.send(`\u{1F4CC} إجابة <@${player.id}> صحيحة! (**${answer}**)
\u{1F4DD} **توضيح:** ${result.reason}`);
        this.roundData.push({ player, category, answer, status: "correct" });
        this.currentCategoryIdx++;
        this.processNextCategory();
      } else {
        await channel.send(`❌ إجابة خاطئة! تم طرد اللاعب <@${player.id}> من اللعبة.
\u{1F4DD} **السبب:** ${result.reason}`);
        this.activePlayers = this.activePlayers.filter((p) => p.id !== player.id);
        this.roundData.push({ player, category, answer: answer || "خطأ", status: "wrong" });
        this.currentCategoryIdx++;
        this.processNextCategory();
      }
    });
    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await channel.send(`❌ عدم تفاعل! تم طرد اللاعب <@${player.id}> من اللعبة!`);
        this.activePlayers = this.activePlayers.filter((p) => p.id !== player.id);
        this.roundData.push({ player, category, answer: "لا يوجد", status: "timeout" });
        this.currentCategoryIdx++;
        this.processNextCategory();
      }
    });
  }
  drawRoundedRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  async sendRoundSummary() {
    const canvas = createCanvas(800, 500);
    const ctx = canvas.getContext("2d");
    const bgGrad = ctx.createLinearGradient(0, 0, 800, 500);
    bgGrad.addColorStop(0, "#1a2a44");
    bgGrad.addColorStop(1, "#2d4a77");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 500);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    this.drawRoundedRect(ctx, 30, 20, 740, 80, 20);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = 'bold 22px "Arial", sans-serif';
    ctx.textAlign = "right";
    ctx.fillText("اللاعبين المتبقين", 750, 68);
    let avatarX = 45;
    for (const p of this.activePlayers.slice(0, 12)) {
      try {
        const avatar = await loadImage(p.avatar);
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + 25, 60, 25, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar, avatarX, 35, 50, 50);
        ctx.restore();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(avatarX + 25, 60, 25, 0, Math.PI * 2);
        ctx.stroke();
        avatarX += 58;
      } catch (e) {
      }
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    this.drawRoundedRect(ctx, 30, 120, 740, 360, 25);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = 'bold 18px "Arial", sans-serif';
    ctx.textAlign = "center";
    const cols = ["دولة", "جماد", "نبات", "حيوان", "اسم"];
    for (let i = 0; i < cols.length; i++) {
      ctx.fillText(cols[i], 110 + i * 120, 160);
    }
    ctx.fillStyle = "white";
    ctx.font = 'bold 36px "Arial", sans-serif';
    ctx.textAlign = "center";
    const roundsToDraw = [...this.allRounds].reverse().slice(0, 4);
    roundsToDraw.forEach((round, r) => {
      ctx.fillText(round.letter, 715, 235 + r * 70);
    });
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(50, 200 + i * 70);
      ctx.lineTo(650, 200 + i * 70);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(670, 140);
    ctx.lineTo(670, 460);
    ctx.stroke();
    for (let r = 0; r < roundsToDraw.length; r++) {
      const round = roundsToDraw[r];
      const centerY = 235 + r * 70;
      for (let i = 0; i < 5; i++) {
        const cat = CATEGORIES[4 - i];
        const data = round.data.find((d) => d.category === cat);
        if (data) {
          const centerX = 110 + i * 120;
          if (data.status === "correct") {
            ctx.fillStyle = "#60a5fa";
            ctx.font = 'bold 20px "Arial", sans-serif';
            ctx.fillText(data.answer, centerX, centerY);
          } else {
            try {
              const avatar = await loadImage(data.player.avatar);
              ctx.save();
              ctx.globalAlpha = 0.4;
              ctx.drawImage(avatar, centerX - 25, centerY - 25, 50, 50);
              ctx.restore();
              ctx.globalAlpha = 1;
              ctx.strokeStyle = "#f87171";
              ctx.lineWidth = 4;
              ctx.lineCap = "round";
              ctx.beginPath();
              ctx.moveTo(centerX - 15, centerY - 15);
              ctx.lineTo(centerX + 15, centerY + 15);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(centerX + 15, centerY - 15);
              ctx.lineTo(centerX - 15, centerY + 15);
              ctx.stroke();
            } catch (e) {
            }
          }
        }
      }
    }
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: "replica-summary.png" });
    const channel = await this.discordClient.channels.fetch(this.channelId);
    await channel.send({ files: [attachment] });
  }
  async endGame() {
    this.gameState = "ended";
    if (this.onEnd) {
      try {
        this.onEnd();
      } catch (err) {
        console.error("Error firing onEnd in replica game:", err);
      }
    }
    const channel = await this.discordClient.channels.fetch(this.channelId);
    if (this.activePlayers.length === 1) {
      await channel.send(`\u{1F3C6} مبروك للفائز <@${this.activePlayers[0].id}> في فعالية ريبلكا!`);
    } else {
      await channel.send("\u{1F6D1} انتهت اللعبة بدون فائز.");
    }
  }
}
function getDisplayEmoji(n) {
  return `${n}`;
}
async function generateWheelImage(players, chosenIndex) {
  const canvas = createCanvas(600, 600);
  const ctx = canvas.getContext("2d");
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 250;
  const numSlices = players.length;
  const sliceAngle = 2 * Math.PI / numSlices;
  const colors = [
    "#FF5733",
    "#33FF57",
    "#3357FF",
    "#F333FF",
    "#FF33A1",
    "#33FFF3",
    "#F3FF33",
    "#FF8633",
    "#8633FF",
    "#33FF86",
    "#A1FF33",
    "#3386FF",
    "#FF3333",
    "#33FF33",
    "#3333FF"
  ];
  let rotateOffset = 0;
  if (typeof chosenIndex === "number" && chosenIndex >= 0 && chosenIndex < numSlices) {
    const originalMidAngle = chosenIndex * sliceAngle - Math.PI / 2 + sliceAngle / 2;
    rotateOffset = -originalMidAngle;
  }
  for (let i = 0; i < numSlices; i++) {
    const startAngle = i * sliceAngle - Math.PI / 2 + rotateOffset;
    const endAngle = (i + 1) * sliceAngle - Math.PI / 2 + rotateOffset;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px Arial";
    const label = `${players[i].number}- ${players[i].displayName}`;
    ctx.fillText(label.length > 20 ? label.substring(0, 17) + "..." : label, radius - 20, 5);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(centerX, centerY, 60, 0, 2 * Math.PI);
  ctx.fillStyle = "#222222";
  ctx.fill();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("ROULETTE", centerX, centerY + 5);
  ctx.beginPath();
  ctx.moveTo(canvas.width - 50, centerY);
  ctx.lineTo(canvas.width - 10, centerY - 25);
  ctx.lineTo(canvas.width - 10, centerY + 25);
  ctx.closePath();
  ctx.fillStyle = "#FF0000";
  ctx.fill();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.stroke();
  return new AttachmentBuilder(canvas.toBuffer(), { name: "wheel.png" });
}
export class RouletteGame {
  constructor(client, channelId, guildId, prefix, isPremium = false) {
    this.players = [];
    this.activePlayers = [];
    this.gameState = "joining";
    this.rules = "";
    this.finishJoinTime = 0;
    this.maxPlayers = 30;
    this.NUMBERS = [];
    this.discordClient = client;
    this.channelId = channelId;
    this.guildId = guildId;
    this.prefix = prefix;
    this.maxPlayers = isPremium ? 100 : 30;
    this.NUMBERS = Array.from({ length: this.maxPlayers }, (_, i) => i + 1);
  }
  async start() {
    const channel = await this.discordClient.channels.fetch(this.channelId);
    if (!channel) return;
    this.rules = `
__طريقة اللعب:__
**1-** اختر الرقم الذي سيمثلك في اللعبة <:One:1504901416098205866>
**2-** ستبدأ الجولة الأولى وسيتم تدوير العجلة واختيار لاعب عشوائي <:Choose:1504901453523714058>
**3-** إذا كنت اللاعب المختار ، فستختار لاعبًا من اختيارك ليتم طرده من اللعبة <:Kick:1504901414206308382>
**4-** يُطرد اللاعب وتبدأ جولة جديدة ، عندما يُطرد جميع اللاعبين ويتبقى لاعبان فقط ، ستدور العجلة ويكون اللاعب المختار هو الفائز باللعبة <:Cup:1504829126735953920>
`;
    this.finishJoinTime = Math.floor(Date.now() / 1e3) + 30;
    this.joinEmbed = new EmbedBuilder().setTitle("\u{1F3A1} فعالية الروليت").setDescription(`${this.rules}

__أرقام اللاعبين:__
يتم تحديث القائمة تلقائياً...

⌛ ينتهي الوقت: <t:${this.finishJoinTime}:R>`).setColor("#FF4500");
    if (this.maxPlayers <= 30) {
      this.joinMsg1 = await channel.send({
        embeds: [this.joinEmbed],
        components: this.createNumberButtons(1, 25)
      });
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("random_join_roulette").setLabel("دخول عشوائي").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("leave_roulette").setLabel("خروج").setStyle(ButtonStyle.Danger)
      );
      this.joinMsg2 = await channel.send({
        content: " ",
        components: [...this.createNumberButtons(26, 30), actionRow]
      });
    } else {
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("random_join_roulette").setLabel("انضمام سريع").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("leave_roulette").setLabel("خروج").setStyle(ButtonStyle.Danger)
      );
      this.joinMsg1 = await channel.send({
        embeds: [this.joinEmbed],
        components: [actionRow]
      });
      this.joinMsg2 = null;
    }
    const collector = channel.createMessageComponentCollector({
      filter: (i) => i.message.id === this.joinMsg1.id || this.joinMsg2 && i.message.id === this.joinMsg2.id,
      time: 3e4
    });
    collector.on("collect", async (i) => {
      if (i.customId === "leave_roulette") {
        if (!this.players.some((p) => p.id === i.user.id)) {
          return i.reply({ content: "أنت لست في اللعبة!", ephemeral: true });
        }
        this.players = this.players.filter((p) => p.id !== i.user.id);
        await this.updateJoinMessages();
        return i.reply({ content: "تم الخروج من اللعبة.", ephemeral: true });
      }
      if (this.players.some((p) => p.id === i.user.id)) {
        return i.reply({ content: "أنت في اللعبة بالفعل!", ephemeral: true });
      }
      let chosenNum;
      if (i.customId === "random_join_roulette") {
        const available = this.NUMBERS.filter((n) => !this.players.some((p) => p.number === n));
        if (available.length === 0) return i.reply({ content: "اللعبة ممتلئة!", ephemeral: true });
        chosenNum = available[Math.floor(Math.random() * available.length)];
      } else if (i.customId.startsWith("join_num_")) {
        chosenNum = parseInt(i.customId.replace("join_num_", ""));
        if (isNaN(chosenNum) || chosenNum < 1 || chosenNum > this.maxPlayers) {
          return i.reply({ content: "رقم غير صالح!", ephemeral: true });
        }
        if (this.players.some((p) => p.number === chosenNum)) {
          return i.reply({ content: "هذا الرقم محجوز بالفعل! اختر رقماً آخر.", ephemeral: true });
        }
      } else return;
      const member = i.member;
      const displayName = member?.displayName || i.user.username;
      this.players.push({
        id: i.user.id,
        username: i.user.username,
        number: chosenNum,
        displayName
      });
      await this.updateJoinMessages();
      await i.reply({ content: `تم دخولك بالرقم ${getDisplayEmoji(chosenNum)}!`, ephemeral: true });
    });
    collector.on("end", async () => {
      if (this.players.length < 2) {
        return channel.send("❌ لم يكتمل العدد الكافي لبدء الروليت (اقل شيء لاعبين).");
      }
      this.activePlayers = [...this.players];
      this.gameState = "playing";
      await channel.send("\u{1F3B2} تبدأ اللعبة الآن! جاري اختيار اللاعب الأول...");
      setTimeout(() => this.playRound(), 3e3);
    });
  }
  createNumberButtons(start, end) {
    const rows = [];
    for (let i = start; i <= end; i += 5) {
      const row = new ActionRowBuilder();
      for (let j = i; j < i + 5 && j <= end; j++) {
        const player = this.players.find((p) => p.number === j);
        const btn = new ButtonBuilder().setCustomId(`join_num_${j}`).setLabel(player ? player.displayName : `${j}`).setStyle(player ? ButtonStyle.Primary : ButtonStyle.Secondary);
        if (player) btn.setDisabled(true);
        row.addComponents(btn);
      }
      rows.push(row);
    }
    return rows;
  }
  async updateJoinMessages() {
    const playerList = this.players.sort((a, b) => a.number - b.number).map((p) => `${getDisplayEmoji(p.number)} : <@${p.id}>`).join("\n");
    const newEmbed = EmbedBuilder.from(this.joinEmbed).setDescription(`${this.rules}

__أرقام اللاعبين:__
${playerList || "لا يوجد لاعبون حالياً"}

⌛ ينتهي الوقت: <t:${this.finishJoinTime}:R>`);
    if (this.maxPlayers <= 30) {
      if (this.joinMsg1) {
        await this.joinMsg1.edit({
          embeds: [newEmbed],
          components: this.createNumberButtons(1, 25)
        }).catch(() => null);
      }
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("random_join_roulette").setLabel("دخول عشوائي").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("leave_roulette").setLabel("خروج").setStyle(ButtonStyle.Danger)
      );
      if (this.joinMsg2) {
        await this.joinMsg2.edit({
          components: [...this.createNumberButtons(26, 30), actionRow]
        }).catch(() => null);
      }
    } else {
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("random_join_roulette").setLabel("انضمام سريع").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("leave_roulette").setLabel("خروج").setStyle(ButtonStyle.Danger)
      );
      if (this.joinMsg1) {
        await this.joinMsg1.edit({
          embeds: [newEmbed],
          components: [actionRow]
        }).catch(() => null);
      }
    }
  }
  async playRound() {
    if (this.activePlayers.length <= 1) return this.endGame();
    const channel = await this.discordClient.channels.fetch(this.channelId);
    const chosenIndex = Math.floor(Math.random() * this.activePlayers.length);
    const chosenPlayer = this.activePlayers[chosenIndex];
    if (this.activePlayers.length === 2) {
      return this.endGameWithWinner(chosenPlayer);
    }
    const wheelAttachment = await generateWheelImage(this.activePlayers, chosenIndex);
    const finishTime = Math.floor(Date.now() / 1e3) + 30;
    const others = this.activePlayers.filter((p) => p.id !== chosenPlayer.id);
    const createKickButtons = (players) => {
      const rows = [];
      for (let i = 0; i < players.length && i < 15; i += 5) {
        const row = new ActionRowBuilder();
        for (let j = i; j < i + 5 && j < players.length; j++) {
          row.addComponents(
            new ButtonBuilder().setCustomId(`kick_player_${players[j].id}`).setLabel(`${players[j].displayName} (${players[j].number})`).setStyle(ButtonStyle.Primary)
          );
        }
        rows.push(row);
      }
      return rows;
    };
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("random_kick_roulette").setLabel("طرد عشوائي").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("withdraw_roulette").setLabel("انسحاب").setStyle(ButtonStyle.Danger)
    );
    const kickMsg = await channel.send({
      content: `\u{1F3A1} **تم تدوير العجلة وجاء الاختيار على العضو:** <@${chosenPlayer.id}>
لديك 30 ثانية لاختيار لاعب لطرده
⌛ ينتهي الوقت: <t:${finishTime}:R>`,
      files: [wheelAttachment],
      components: [...createKickButtons(others), actionRow]
    });
    const collector = kickMsg.createMessageComponentCollector({ time: 3e4 });
    collector.on("collect", async (i) => {
      if (i.user.id !== chosenPlayer.id) {
        return i.reply({ content: "هذا ليس دورك!", ephemeral: true });
      }
      let targetId = null;
      if (i.customId.startsWith("kick_player_")) {
        targetId = i.customId.replace("kick_player_", "");
      } else if (i.customId === "random_kick_roulette") {
        targetId = others[Math.floor(Math.random() * others.length)].id;
      } else if (i.customId === "withdraw_roulette") {
        targetId = chosenPlayer.id;
      }
      if (targetId) {
        const kickedPlayer = this.activePlayers.find((p) => p.id === targetId);
        this.activePlayers = this.activePlayers.filter((p) => p.id !== targetId);
        await kickMsg.delete().catch(() => {
        });
        await channel.send(`\u{1F4A3} | تم طرد <@${targetId}> من اللعبة ، سيتم بدء الجولة القادمة في بضع ثواني...`);
        collector.stop("done");
        setTimeout(() => this.playRound(), 5e3);
      }
    });
    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        await channel.send(`⏰ انتهى الوقت! تم طرد <@${chosenPlayer.id}> لعدم الاختيار.`);
        this.activePlayers = this.activePlayers.filter((p) => p.id !== chosenPlayer.id);
        await kickMsg.delete().catch(() => {
        });
        setTimeout(() => this.playRound(), 5e3);
      }
    });
  }
  async endGameWithWinner(winner) {
    const channel = await this.discordClient.channels.fetch(this.channelId);
    await channel.send(`\u{1F451} - <@${winner.id}> فاز باللعبة!`);
  }
  async endGame() {
    const channel = await this.discordClient.channels.fetch(this.channelId);
    await channel.send("\u{1F6D1} انتهت اللعبة.");
  }
}
