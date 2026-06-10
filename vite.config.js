import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const cleanEnvValue = (val) => {
    if (!val) return "";
    return val.trim().replace(/^['"]|['"]$/g, "").trim();
  };
  const discordClientId = cleanEnvValue(env.DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID);
  return {
    base: "./",
    plugins: [react(), tailwindcss()],
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.DISCORD_CLIENT_ID": JSON.stringify(discordClientId)
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, ".")
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      port: 3e3,
      strictPort: true,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR === "true" ? false : {
        protocol: "wss",
        clientPort: 443
      }
    }
  };
});
