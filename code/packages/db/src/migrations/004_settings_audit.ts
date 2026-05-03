/**
 * WS-G1 — Settings audit migration
 *
 * 表 settings_changes:每次 PATCH /api/admin/settings 写一条,
 * 记录变更的 section(可多个,逗号分隔)和完整 patch 的 JSON。
 *
 * 这个文件由主 agent 集成到 db/src/migrate.ts 的 MIGRATIONS 数组。
 * 集成方式见模块底部 export 的 Migration 对象。
 */

export interface Migration {
  version: number;
  name: string;
  up: string;
}

export const settingsAuditMigration: Migration = {
  version: 4,
  name: 'settings_audit',
  up: `
    CREATE TABLE settings_changes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      ts        TEXT NOT NULL,
      actor     TEXT NOT NULL,
      section   TEXT NOT NULL,
      diff_json TEXT NOT NULL
    );
    CREATE INDEX idx_settings_changes_ts ON settings_changes(ts);
  `,
};
