import fs from "fs";
import path from "path";

let botExists = false;
try {
  const botPath = path.join(process.cwd(), "bot", "discordBot.js");
  if (fs.existsSync(botPath)) {
    botExists = true;
  }
} catch (e) {
  botExists = false;
}

const mockDiscordClient = {
  isReady: () => false,
  user: null,
  guilds: {
    cache: {
      get: () => null,
      keys: () => [],
      size: 0
    },
    fetch: async () => null
  },
  ws: {
    ping: -1
  },
  fetchInvite: async () => null
};

// Declare mutable exports that we can update once loaded
export let discordClient = mockDiscordClient;
export let getLevellingConfig = () => ({});
export let syncDiscordAutoMod = async () => {};
export let cleanEnvVar = (v) => v || "";
export let getDiscordCredentials = () => ({});
export let updateBotCredentials = () => {};
export let startDiscordBot = async () => { 
  console.log("[Bot Bridge] Running in standalone mode: Discord Bot is disabled/not present."); 
};
export let setupAzkarInterval = () => {};

export let guildConfigs = new Map();
export let saveBotConfigs = () => {};

// Asynchronously load our modules after parsing, avoiding top-level await
async function loadBotModules() {
  if (!botExists) {
    console.log("[Bot Bridge] Running in Standalone Web Mode (No Bot folder found). Discord Bot disabled gracefully.");
    return;
  }

  try {
    const botModule = await import("../bot/discordBot.js");
    discordClient = botModule.discordClient;
    getLevellingConfig = botModule.getLevellingConfig;
    syncDiscordAutoMod = botModule.syncDiscordAutoMod;
    cleanEnvVar = botModule.cleanEnvVar;
    getDiscordCredentials = botModule.getDiscordCredentials;
    updateBotCredentials = botModule.updateBotCredentials;
    startDiscordBot = botModule.startDiscordBot;
    setupAzkarInterval = botModule.setupAzkarInterval;

    const botDbModule = await import("../bot/botDb.js");
    guildConfigs = botDbModule.guildConfigs;
    saveBotConfigs = botDbModule.saveBotConfigs;
    console.log("[Bot Bridge] Bot modules successfully bridged.");
  } catch (err) {
    console.error("[Bot Bridge] Failed to bridge original bot files, remaining with mock:", err.message);
    discordClient = mockDiscordClient;
  }
}

// Trigger asynchronous load, handled non-blockingly
loadBotModules().catch((err) => {
  console.error("[Bot Bridge] Error in lazy loading initiator:", err);
});
