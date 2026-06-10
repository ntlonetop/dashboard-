const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');

module.exports = (client, CONFIG) => {
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        // 1. Setup handler
        if (message.content === '!setup-apply') {
            if (!message.member.permissions.has('Administrator')) return;

            const embed = new EmbedBuilder()
                .setTitle("التقديم على الإدارة")
                .setDescription("إذا كنت ترغب في الانضمام إلى الطاقم الإداري، يرجى الضغط على الزر أدناه لبدء التقديم.")
                .setColor(0x2F3136);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('start_apply_btn')
                    .setLabel('اضغط هنا للتقديم')
                    .setStyle(ButtonStyle.Primary)
            );

            await message.channel.send({ embeds: [embed], components: [row] });
            await message.delete();
            return;
        }

        // 2. DM Application Handler
        if (message.guild) return;

        const session = db.getApplication(message.author.id);
        if (!session) return;

        session.answers.push(message.content);
        session.currentStep++;

        if (session.currentStep < CONFIG.questions.length) {
            const nextStep = session.currentStep;
            const qEmbed = new EmbedBuilder()
                .setTitle(`السؤال التالي (${nextStep + 1}/${CONFIG.questions.length})`)
                .setDescription(CONFIG.questions[nextStep])
                .setColor(0xFFFFFF);
            
            db.saveApplication(message.author.id, session);
            await message.author.send({ embeds: [qEmbed] });
        } else {
            await message.author.send({ content: '✅ تم إرسال تقديمك بنجاح! بالتوفيق.' });

            const guild = await client.guilds.fetch(session.guildId).catch(() => null);
            if (!guild) {
                db.deleteApplication(message.author.id);
                return;
            }

            const member = await guild.members.fetch(message.author.id).catch(() => null);
            const logChannel = await guild.channels.fetch(CONFIG.logChannelId).catch(() => null);

            if (logChannel) {
                const durationSec = Math.floor((Date.now() - session.startTime) / 1000);
                const joinedTimestamp = member ? Math.floor(member.joinedTimestamp / 1000) : 0;
                const submittedTimestamp = Math.floor(Date.now() / 1000);

                let embedDescription = "";
                for (let i = 0; i < CONFIG.questions.length; i++) {
                    embedDescription += `## ${i + 1} - ${CONFIG.questions[i]}\n`;
                    embedDescription += `${session.answers[i]}\n`;
                    embedDescription += `-# ~~ ~~\n\n`;
                }

                embedDescription += `\n**Submission stats**\n`;
                embedDescription += `UserId: ${message.author.id}\n`;
                embedDescription += `Username: ${message.author.username}\n`;
                embedDescription += `User: <@${message.author.id}>\n`;
                embedDescription += `Duration: ${durationSec}s\n`;
                embedDescription += `Joined guild <t:${joinedTimestamp}:R>\n`;
                embedDescription += `Submitted: <t:${submittedTimestamp}:R>`;

                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setDescription(embedDescription)
                    .setColor(0xFFFFFF);

                const actionRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`app_accept_direct_${message.author.id}`).setLabel('قبول').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`app_reject_direct_${message.author.id}`).setLabel('رفض').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(`app_accept_reason_${message.author.id}`).setLabel('قبول مع سبب').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`app_reject_reason_${message.author.id}`).setLabel('رفض مع سبب').setStyle(ButtonStyle.Secondary)
                );

                await logChannel.send({ 
                    content: `<@&${CONFIG.staffRoleId}> 📄 هناك تقديم جديد للمراجعة:`, 
                    embeds: [logEmbed], 
                    components: [actionRow] 
                });
            }

            db.deleteApplication(message.author.id);
        }
    });
};
