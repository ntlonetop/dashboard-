const Database = require('better-sqlite3');
const path = require('path');

// Store the database file in data/bot.db to be persistent across restarts
const db = new Database(path.join(__dirname, '../data/bot.db'));

// Initialize table
db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    userId TEXT PRIMARY KEY,
    guildId TEXT,
    currentStep INTEGER,
    answers TEXT,
    startTime INTEGER
  )
`);

module.exports = {
  saveApplication: (userId, data) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO applications (userId, guildId, currentStep, answers, startTime)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(userId, data.guildId, data.currentStep, JSON.stringify(data.answers), data.startTime);
  },
  
  getApplication: (userId) => {
    const stmt = db.prepare('SELECT * FROM applications WHERE userId = ?');
    const row = stmt.get(userId);
    if (!row) return null;
    return {
      ...row,
      answers: JSON.parse(row.answers)
    };
  },
  
  deleteApplication: (userId) => {
    const stmt = db.prepare('DELETE FROM applications WHERE userId = ?');
    stmt.run(userId);
  }
};
