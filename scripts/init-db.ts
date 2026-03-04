import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT UNIQUE,
    name TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL UNIQUE,
    responseStyle TEXT NOT NULL DEFAULT 'BALANCED',
    purpose TEXT NOT NULL DEFAULT 'SELF_UNDERSTANDING',
    adviceIntensity TEXT NOT NULL DEFAULT 'MEDIUM',
    memoryMode TEXT NOT NULL DEFAULT 'AUTO',
    shareByDefault INTEGER NOT NULL DEFAULT 0,
    reminderFrequency TEXT,
    reminderTime TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    note TEXT,
    occurredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletedAt DATETIME,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS entries_userId_occurredAt_idx ON entries(userId, occurredAt);

  CREATE TABLE IF NOT EXISTS entry_audio (
    id TEXT PRIMARY KEY NOT NULL,
    entryId TEXT NOT NULL UNIQUE,
    storageKey TEXT NOT NULL,
    filePath TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    durationSec INTEGER NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(entryId) REFERENCES entries(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transcripts (
    id TEXT PRIMARY KEY NOT NULL,
    entryId TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    editedContent TEXT,
    source TEXT NOT NULL,
    confidence REAL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(entryId) REFERENCES entries(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS analysis_results (
    id TEXT PRIMARY KEY NOT NULL,
    entryId TEXT NOT NULL UNIQUE,
    summary_facts TEXT NOT NULL,
    emotion_top_json TEXT NOT NULL,
    energy_peak_quote TEXT NOT NULL,
    followup_question TEXT NOT NULL,
    week_hint_line TEXT NOT NULL,
    praise_line TEXT NOT NULL,
    praise_evidence_quote TEXT NOT NULL,
    micro_badge TEXT,
    next_teaser TEXT NOT NULL,
    temporary_tone TEXT,
    crisisDetected INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(entryId) REFERENCES entries(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS memory_items (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    category TEXT,
    memory_text TEXT NOT NULL,
    confidence REAL NOT NULL,
    stability REAL NOT NULL,
    sensitivity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    source_mode TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archivedAt DATETIME,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS memory_items_userId_status_idx ON memory_items(userId, status);

  CREATE TABLE IF NOT EXISTS memory_evidence_links (
    id TEXT PRIMARY KEY NOT NULL,
    memory_item_id TEXT NOT NULL,
    entry_id TEXT,
    quote TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(memory_item_id) REFERENCES memory_items(id) ON DELETE CASCADE,
    FOREIGN KEY(entry_id) REFERENCES entries(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS memory_proposals (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    entryId TEXT NOT NULL,
    proposed_items_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(entryId) REFERENCES entries(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS memory_proposals_userId_status_idx ON memory_proposals(userId, status);

  CREATE TABLE IF NOT EXISTS weekly_reports (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    week_start DATETIME NOT NULL,
    week_end DATETIME NOT NULL,
    emotion_flow_json TEXT NOT NULL,
    theme_tags_json TEXT NOT NULL,
    change_summary TEXT NOT NULL,
    loop_summary TEXT NOT NULL,
    recovery_list_json TEXT NOT NULL,
    share_line TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS weekly_reports_userId_week_start_idx ON weekly_reports(userId, week_start);

  CREATE TABLE IF NOT EXISTS share_cards (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    entry_id TEXT,
    weekly_report_id TEXT,
    masked_quote TEXT NOT NULL,
    emotion_tags_json TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(entry_id) REFERENCES entries(id) ON DELETE SET NULL,
    FOREIGN KEY(weekly_report_id) REFERENCES weekly_reports(id) ON DELETE SET NULL
  );
`);

db.close();
console.log(`Initialized SQLite schema at ${dbPath}`);
