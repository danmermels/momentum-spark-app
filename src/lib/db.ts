
// src/lib/db.ts
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;

const initializeDB = async (dbInstance: Database) => {
  console.log('[DB] Initializing database schema...');
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      weight INTEGER NOT NULL DEFAULT 5,
      dueDate TEXT NOT NULL,
      isCompleted INTEGER NOT NULL DEFAULT 0,
      isRecurring INTEGER NOT NULL DEFAULT 0,
      messageType TEXT NOT NULL DEFAULT 'text',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforce only one row
      userName TEXT,
      enableNotifications INTEGER,
      enableBluetoothAudio INTEGER,
      soundVolume INTEGER,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Trigger to update 'updatedAt' timestamp on tasks table
    CREATE TRIGGER IF NOT EXISTS update_task_updatedAt
    AFTER UPDATE ON tasks
    FOR EACH ROW
    BEGIN
      UPDATE tasks SET updatedAt = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

    -- Trigger to update 'updatedAt' timestamp on settings table
    CREATE TRIGGER IF NOT EXISTS update_setting_updatedAt
    AFTER UPDATE ON settings
    FOR EACH ROW
    BEGIN
      UPDATE settings SET updatedAt = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
  `);
  console.log('[DB] Database schema initialized (or already existed).');
};

export const getDB = async (): Promise<Database> => {
  if (db) {
    return db;
  }

  let dbPath: string;
  const baseFilename = 'momentumspark.sqlite';

  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    // For Docker production build, place it in /app/data/
    // The Dockerfile's WORKDIR is /app
    const dataDir = path.join(process.cwd(), 'data'); // This will be /app/data in Docker
    dbPath = path.join(dataDir, baseFilename);
    console.log(`[DB] Production mode (not Vercel). Target DB path: ${dbPath}`);
    if (!fs.existsSync(dataDir)) {
      try {
        console.log(`[DB] Data directory ${dataDir} does not exist. Attempting to create...`);
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`[DB] Data directory ${dataDir} created successfully.`);
      } catch (error) {
        console.error(`[DB] CRITICAL: Failed to create data directory ${dataDir}:`, error);
        throw new Error(`Failed to create data directory: ${(error as Error).message}`);
      }
    } else {
      console.log(`[DB] Data directory ${dataDir} already exists.`);
    }
  } else if (process.env.VERCEL) {
    // For Vercel, use /tmp as it's the only writable directory
    dbPath = path.join('/tmp', baseFilename);
    console.log(`[DB] Vercel environment. Target DB path: ${dbPath}`);
  } else {
    // For local development, place it in the project root
    dbPath = path.join(process.cwd(), baseFilename);
    console.log(`[DB] Development mode. Target DB path: ${dbPath}`);
  }

  try {
    console.log(`[DB] Attempting to open database at: ${dbPath}`);
    const newDbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    console.log(`[DB] Database opened successfully at: ${dbPath}`);
    await initializeDB(newDbInstance);
    db = newDbInstance;
    return db;
  } catch (error) {
    console.error(`[DB] CRITICAL: Failed to open or initialize database at ${dbPath}:`, error);
    throw new Error(`Failed to open/initialize database: ${(error as Error).message}`);
  }
};
