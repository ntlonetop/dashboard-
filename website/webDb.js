import path from "path";
import fs from "fs";
import mysql from "mysql2/promise";
import { encryptData, decryptData } from "./securityUtils.js";

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
export const globalStatePath = databasePath;
export const supportTicketsPath = databasePath;
export const botConfigsPath = databasePath;
export const subfolderGlobalStatePath = databasePath;
export const subfolderSupportTicketsPath = databasePath;

let mysqlPool = null;
let useMySQL = false;

export function loadWebState() {
  loadDatabase();
}

/**
 * Connects and initializes the BotHosting MySQL DB.
 */
export async function initDatabase() {
  const host = process.env.MYSQL_HOST;
  const port = parseInt(process.env.MYSQL_PORT || "3306", 10);
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !password || !database) {
    console.log("[MySQL] No remote MySQL configuration found in environment variables. Operating in local JSON file database mode.");
    loadDatabase();
    return;
  }

  console.log(`[MySQL] Connection details detected => Host: ${host}, Port: ${port}, User: ${user}, Database: ${database}`);

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
    console.log("[MySQL] Connection established successfully with Bot-Hosting.net!");
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

    // Synchronously preload local DB first, then let MySQL overwrite it
    loadDatabase();
    
    // Load from MySQL
    await loadDatabaseFromMySQL();

  } catch (err) {
    console.warn("[MySQL] Warning: Could not connect to Bot-Hosting.net MySQL database. Falling back to local json storage! Error details:", err.message);
    useMySQL = false;
    
    // Just run off the local files
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
        console.error(`[MySQL] Parse error for key ${row.key}:`, parseErr);
      }
    }
    console.log(`[MySQL] Database populated from MySQL. Loaded ${count} structures.`);
  } catch (err) {
    console.error("[MySQL] Error loading database content, continuing with local data:", err.message);
    if (err.code === 'ER_TOO_MANY_USER_CONNECTIONS' || err.code === 'ECONNREFUSED') {
      console.warn("[MySQL] Max connections reached or refused. Disabling MySQL sync for this session.");
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
    console.log("[MySQL] Successfully saved updated data to remote MySQL database.");
  } catch (err) {
    console.error("[MySQL] Error writing to MySQL:", err.message);
    if (err.code === 'ER_TOO_MANY_USER_CONNECTIONS') {
       console.warn("[MySQL] Connection limit hit during save. Will try again on next save.");
    }
  }
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
        console.log(`[Database] Loaded local encrypted backup successfully. Guilds: ${guildConfigs.size}, Tickets: ${supportTickets.length}`);
        return;
      }
    } catch (err) {
      console.error("[Database] Error parsing unified database.json, falling back to legacy:", err);
    }
  }
  saveDatabase();
}

export function saveWebState(saveGlobal = true, saveTickets = true) {
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
        console.error("[MySQL] Background sync failed:", err);
      });
    }
  } catch (err) {
    console.error("[Database] Error writing database to disk:", err);
  }
}
