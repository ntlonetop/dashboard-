module.exports = (client) => {
    client.once('ready', () => {
        console.log(`تم تشغيل البوت بنجاح باسم: ${client.user.tag}`);
    });
};
