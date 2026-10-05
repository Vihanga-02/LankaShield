import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrate } from './migrations';

let database: Promise<SQLiteDatabase> | null = null;

/** Opens `lankashield.db` once and runs pending migrations. */
export function getDatabase(): Promise<SQLiteDatabase> {
  database ??= (async () => {
    const db = await openDatabaseAsync('lankashield.db');
    await db.execAsync('PRAGMA journal_mode = WAL');
    await migrate(db);
    return db;
  })().catch((err: unknown) => {
    // Allow a later call to retry if opening failed.
    database = null;
    throw err;
  });
  return database;
}
