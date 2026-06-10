const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const db = require('../db');

module.exports = (client, CONFIG) => {
    client.on('interactionCreate', async (interaction) => {
        
        async function safeReply(options) {
            if (interaction.deferred || interaction.replied) return await interaction.editReply(options);
            return await interaction.reply(options);
        }

        async function safeUpdate(options) {
            if (interaction.deferred || interaction.replied) return await interaction.editReply(options);
            return await interaction.update(options);
        }

        if (interaction.isButton()) {
            const { customId, user, guild } = interaction;

            if (customId === 'start_apply_btn') {
                await interaction.deferReply({ ephemeral: true });
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setDescription(`هل أنت متأكد من التقديم إلى إدارة سيرفر **${guild.name}**؟`)
                        .setColor(0x2F3136);

                    const dmRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`confirm_yes_${guild.id}`).setLabel('نعم').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('confirm_no').setLabel('لا').setStyle(ButtonStyle.Danger)
                    );

                    await user.send({ embeds: [dmEmbed], components: [dmRow] });
                    await interaction.editReply({ content: 'انتقل إلى خاص البوت لإكمال التقديم! 📬' });
                } catch (error) {
                    await interaction.editReply({ content: 'عذراً، خاصك مغلق! يرجى فتح الرسائل الخاصة للمحاولة مجدداً.' });
                }
            }

            if (customId.startsWith('confirm_yes_')) {
                await interaction.deferUpdate();
                const guildId = customId.split('_')[2];
                db.saveApplication(user.id, {
                    guildId: guildId,
                    currentStep: 0,
                    answers: [],
                    startTime: Date.now()
                });

                await interaction.editReply({ content: "تم البدء، تحقق من الخاص.", components: [] });
                
                const qEmbed = new EmbedBuilder()
                    .setTitle(`السؤال الأول (1/${CONFIG.questions.length})`)
                    .setDescription(CONFIG.questions[0])
                    .setColor(0xFFFFFF);
                
                await user.send({ embeds: [qEmbed] });
            }

            if (customId === 'confirm_no') {
                await safeUpdate({ content: 'تم إلغاء عملية التقديم بنجاح.', embeds: [], components: [] });
            }

            if (customId.startsWith('app_accept_direct_') || customId.startsWith('app_reject_direct_')) {
                if (!interaction.member.roles.cache.has(CONFIG.staffRoleId)) {
                    return await safeReply({ content: 'لا تملك الصلاحية للتحكم في هذا التقديم.', ephemeral: true });
                }

                await interaction.deferUpdate();
                const action = customId.startsWith('app_accept_direct_') ? 'accept' : 'reject';
                const targetUserId = customId.split('_')[3];
                const targetUser = await client.users.fetch(targetUserId).catch(() => null);

                const receivedEmbed = interaction.message.embeds[0];
                const updatedEmbed = EmbedBuilder.from(receivedEmbed);

                if (action === 'accept') {
                    updatedEmbed.setColor(0x2ecc71).setTitle('🟢 تم قبول التقديم');
                    if (targetUser) await targetUser.send({ content: `🎉 تهانينا <@${targetUserId}>، لقد تم قبولك في إدارة السيرفر!` }).catch(() => null);
                } else {
                    updatedEmbed.setColor(0xe74c3c).setTitle('🔴 تم رفض التقديم');
                    if (targetUser) await targetUser.send({ content: `😔 نعتذر منك <@${targetUserId}>، لقد تم رفض طلب انضمامك للإدارة.` }).catch(() => null);
                }

                await interaction.editReply({ embeds: [updatedEmbed], components: [] });
            }

            if (customId.startsWith('app_accept_reason_') || customId.startsWith('app_reject_reason_')) {
                if (!interaction.member.roles.cache.has(CONFIG.staffRoleId)) {
                    return await safeReply({ content: 'لا تملك الصلاحية للتحكم في هذا التقديم.', ephemeral: true });
                }

                const isAccept = customId.startsWith('app_accept_reason_');
                const targetUserId = customId.split('_')[3];

                const modal = new ModalBuilder()
                    .setCustomId(`${isAccept ? 'modal_accept_' : 'modal_reject_'}${targetUserId}`)
                    .setTitle(isAccept ? 'قبول التقديم مع ذكر السبب' : 'رفض التقديم مع ذكر السبب');

                const reasonInput = new TextInputBuilder()
                    .setCustomId('reason_text')
                    .setLabel('اكتب السبب هنا:')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                await interaction.showModal(modal);
            }
        }

        if (interaction.type === InteractionType.ModalSubmit) {
            const { customId, fields } = interaction;
            const reason = fields.getTextInputValue('reason_text');

            if (customId.startsWith('modal_accept_') || customId.startsWith('modal_reject_')) {
                await interaction.deferUpdate();
                const isAccept = customId.startsWith('modal_accept_');
                const targetUserId = customId.split('_')[2];
                const targetUser = await client.users.fetch(targetUserId).catch(() => null);

                const receivedEmbed = interaction.message.embeds[0];
                const updatedEmbed = EmbedBuilder.from(receivedEmbed);

                if (isAccept) {
                    updatedEmbed.setColor(0x2ecc71).setTitle('🟢 تم قبول التقديم (مع سبب)')
                        .addFields({ name: 'السبب المحدد:', value: reason });
                    if (targetUser) await targetUser.send({ content: `🎉 تهانينا <@${targetUserId}>، لقد تم قبولك في الإدارة.\n**السبب:** ${reason}` }).catch(() => null);
                } else {
                    updatedEmbed.setColor(0xe74c3c).setTitle('🔴 تم رفض التقديم (مع سبب)')
                        .addFields({ name: 'السبب المحدد:', value: reason });
                    if (targetUser) await targetUser.send({ content: `😔 نعتذر منك <@${targetUserId}>، تم رفض تقديمك.\n**السبب:** ${reason}` }).catch(() => null);
                }

                await interaction.editReply({ embeds: [updatedEmbed], components: [] });
            }
        }
    });
};
