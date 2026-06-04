/**
 * Migration 012 — persisted admin password
 *
 * OPENNOTE_PASSWORD remains the bootstrap fallback. Once the owner changes the
 * password in admin settings, the hash in this table becomes the source of truth.
 */

export const migration012AdminCredentials = {
  version: 12,
  name: 'admin_credentials',
  up: `
    CREATE TABLE admin_credentials (
      subject TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `,
} as const;
