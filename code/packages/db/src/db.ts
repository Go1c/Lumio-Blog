import Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';
import { runMigrations } from './migrate.js';

export type DbHandle = DB;

export function openDb(path: string): DbHandle {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  runMigrations(db);
  return db;
}
