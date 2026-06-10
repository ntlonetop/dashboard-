import "dotenv/config";
import fs from "fs";
import path from "path";

async function main() {
  console.log("-----------------------------------------");
  console.log("[Launcher] Booting NTL BOT & Website Systems...");
  console.log("-----------------------------------------");
  
  // Ensure required directories exist
  const dirs = ["uploads", "transcripts"];
  dirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`[Launcher] Created missing directory: ${dir}`);
    }
  });

  const hasWebsite = fs.existsSync(path.join(process.cwd(), "website", "expressServer.js"));
  const hasBot = fs.existsSync(path.join(process.cwd(), "bot", "discordBot.js"));

  let webServerPromise = Promise.resolve();

  if (hasWebsite) {
    try {
      console.log("[Launcher] Website module detected. Launching Web Server...");
      const { startWebServer } = await import("./website/expressServer.js");
      webServerPromise = startWebServer().then(() => {
        console.log("[Launcher] Modular express webserver fully operational.");
      }).catch((err) => {
        console.error("[Launcher] Failed to launch backend server application:", err);
      });

      const { initDatabase: initWebDb } = await import("./website/webDb.js");
      await initWebDb();
      console.log("[Launcher] Web database system connected and synced.");
    } catch (err) {
      console.error("[Launcher] Failed to initialize website setup:", err);
    }
  } else {
    console.log("[Launcher] skipping website launch (website/ folder not found).");
  }

  if (hasBot) {
    try {
      console.log("[Launcher] Bot module detected. Initializing Discord Bot...");
      const { startDiscordBot } = await import("./bot/discordBot.js");
      await startDiscordBot();
      console.log("[Launcher] Discord Bot initialized successfully.");
    } catch (err) {
      console.error("[Launcher] Failed to initialize Discord Bot:", err);
    }
  } else {
    console.log("[Launcher] skipping Discord Bot launch (bot/ folder not found).");
  }

  await webServerPromise;
}

main().catch((err) => {
  console.error("[Launcher] Fatal boot sequence failure:", err);
});
