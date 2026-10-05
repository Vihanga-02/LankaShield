import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Ordered schema migrations; `PRAGMA user_version` records how many have run.
 * Append new migrations — never edit one that has shipped.
 */
const MIGRATIONS: string[] = [
  // v1 — offline hazard-report queue (development plan, Phase 6).
  `CREATE TABLE IF NOT EXISTS offline_reports (
     report_id TEXT PRIMARY KEY NOT NULL,
     payload_json TEXT NOT NULL,
     evidence_json TEXT NOT NULL,
     sync_status TEXT NOT NULL,
     retry_count INTEGER NOT NULL DEFAULT 0,
     last_error TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_offline_reports_created_at ON offline_reports (created_at);`,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  for (let version = row?.user_version ?? 0; version < MIGRATIONS.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
