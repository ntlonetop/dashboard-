import path from "path";
import fs from "fs";
import crypto from "crypto";
import mysql from "mysql2/promise";

export const globalState = {
  activeCodes: {},
  premiumUsers: {},
  supportAdmins: {},
  botCredentials: {},
  masterPinHash: void 0,
  githubSync: {
    enabled: false,
    token: "",
    repo: "",
    branch: "main",
    lastSync: 0
  }
};

export const supportTickets = [];
export const guildConfigs = new Map();
export const databasePath = path.join(process.cwd(), "database.json");
export const botConfigsPath = databasePath;
export const botDbDir = databasePath;

let mysqlPool = null;
let useMySQL = false;

const ENCRYPTION_ALGORITHM = "aes-256-cbc";
function getEncryptionKey() {
  const secret = process.env.DATABASE_ENCRYPTION_KEY || process.env.OAUTH_SESSION_SECRET || "ntl_dash_secure_default_627a192bc7b0";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptData(plaintext) {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  } catch (err) {
    console.error("[Bot Crypto Security] Encryption failed, returning raw fallback:", err.message);
    return plaintext;
  }
}

export function decryptData(cipherText) {
  if (!cipherText || !cipherText.includes(":")) {
    return cipherText;
  }
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 2 || parts[0].length !== 32) {
      return cipherText;
    }
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.warn("[Bot Crypto Security] Decryption failed, assuming raw file content or old format:", err.message);
    return cipherText;
  }
}

export function loadBotConfigs() {
  loadDatabase();
}

export function saveBotConfigs() {
  saveDatabase();
}

export function loadDatabase() {
  if (fs.existsSync(databasePath)) {
    try {
      let content = fs.readFileSync(databasePath, "utf8").trim();
      if (content) {
        content = decryptData(content);
        const parsed = JSON.parse(content);
        if (parsed.globalState) {
          Object.assign(globalState, parsed.globalState);
        }
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
        console.log(`[Bot Database] Loaded local encrypted backup successfully. Guilds: ${guildConfigs.size}, Tickets: ${supportTickets.length}`);
        return;
      }
    } catch (err) {
      console.error("[Bot Database] Error parsing unified database.json, falling back:", err);
    }
  }
  saveDatabase();
}

export function saveDatabase() {
  try {
    const data = {
      globalState,
      supportTickets,
      guildConfigs: Object.fromEntries(guildConfigs)
    };
    const plaintext = JSON.stringify(data, null, 2);
    const encrypted = encryptData(plaintext);
    fs.writeFileSync(databasePath, encrypted, "utf8");

    // Push asynchronously to Bot-Hosting remote MySQL
    if (useMySQL) {
      saveDatabaseToMySQL().catch(err => {
        console.error("[MySQL] Bot background sync failed:", err);
      });
    }
  } catch (err) {
    console.error("[Bot Database] Error writing database to disk:", err);
  }
}

export async function initDatabase() {
  const host = process.env.MYSQL_HOST;
  const port = parseInt(process.env.MYSQL_PORT || "3306", 10);
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !password || !database) {
    console.log("[Bot MySQL] No remote MySQL configuration found in environment variables. Operating in local JSON file database mode.");
    loadDatabase();
    return;
  }

  console.log(`[Bot MySQL] Connection details detected => Host: ${host}, Port: ${port}, User: ${user}, Database: ${database}`);

  try {
    mysqlPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 2,
      queueLimit: 0,
      connectTimeout: 8000
    });

    // Test connection
    const connection = await mysqlPool.getConnection();
    console.log("[Bot MySQL] Connection established successfully with Bot-Hosting.net!");
    connection.release();

    useMySQL = true;

    // Create central data store table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS bot_data (
        \`key\` VARCHAR(255) PRIMARY KEY,
        \`value\` LONGTEXT,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Preload locally, then let MySQL overwrite
    loadDatabase();
    
    // Load from MySQL
    await loadDatabaseFromMySQL();

  } catch (err) {
    console.warn("[Bot MySQL] Warning: Could not connect to Bot-Hosting.net MySQL database. Falling back to local json storage! Error details:", err.message);
    useMySQL = false;
    
    // Fall back to local
    loadDatabase();
  }
}

async function loadDatabaseFromMySQL() {
  if (!useMySQL || !mysqlPool) return;
  try {
    const [rows] = await mysqlPool.query("SELECT `key`, `value` FROM bot_data");
    let count = 0;
    
    for (const row of rows) {
      try {
        const val = JSON.parse(row.value);
        if (row.key === "globalState") {
          Object.assign(globalState, val);
          count++;
        } else if (row.key === "supportTickets") {
          supportTickets.length = 0;
          supportTickets.push(...val);
          count++;
        } else if (row.key.startsWith("guild:")) {
          const guildId = row.key.split(":")[1];
          guildConfigs.set(guildId, val);
          count++;
        }
      } catch (parseErr) {
        console.error(`[Bot MySQL] Parse error for key ${row.key}:`, parseErr);
      }
    }
    console.log(`[Bot MySQL] Database populated from MySQL. Loaded ${count} structures.`);
  } catch (err) {
    console.error("[Bot MySQL] Error loading database content, continuing with local data:", err.message);
    if (err.code === 'ER_TOO_MANY_USER_CONNECTIONS' || err.code === 'ECONNREFUSED') {
      useMySQL = false;
    }
  }
}

async function saveDatabaseToMySQL() {
  if (!useMySQL || !mysqlPool) return;
  try {
    // Write globalState
    await mysqlPool.query(
      "INSERT INTO bot_data (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?",
      ["globalState", JSON.stringify(globalState), JSON.stringify(globalState)]
    );

    // Write supportTickets
    await mysqlPool.query(
      "INSERT INTO bot_data (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?",
      ["supportTickets", JSON.stringify(supportTickets), JSON.stringify(supportTickets)]
    );

    // Save guildConfigs
    for (const [guildId, config] of guildConfigs.entries()) {
      const key = `guild:${guildId}`;
      await mysqlPool.query(
        "INSERT INTO bot_data (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?",
        [key, JSON.stringify(config), JSON.stringify(config)]
      );
    }
    console.log("[Bot MySQL] Successfully saved updated data to remote MySQL database.");
  } catch (err) {
    console.error("[Bot MySQL] Error writing to MySQL:", err.message);
    if (err.code === 'ER_TOO_MANY_USER_CONNECTIONS') {
       console.warn("[Bot MySQL] Connection limit hit during save. Will try again on next save.");
    }
  }
}

// Initial direct load of local database on module load
loadDatabase();
