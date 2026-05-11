import pg from "pg";
import { getDatabaseConfig } from "./config";

const { Pool } = pg;

export function createPool(databaseOverride?: string): pg.Pool {
  return new Pool(getDatabaseConfig(databaseOverride));
}

export const pool = createPool();

export async function ensureSchema(client: pg.Pool | pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS streaming_events (
      id BIGSERIAL PRIMARY KEY,
      source_file TEXT NOT NULL,
      source_index INTEGER NOT NULL,
      ts TIMESTAMPTZ NOT NULL,
      ms_played INTEGER NOT NULL DEFAULT 0,
      track_name TEXT,
      album_name TEXT,
      artist_name TEXT,
      spotify_track_uri TEXT,
      raw JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (source_file, source_index)
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS streaming_events_artist_idx
      ON streaming_events (LOWER(artist_name));
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS streaming_events_track_uri_idx
      ON streaming_events (spotify_track_uri);
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS streaming_events_ts_idx
      ON streaming_events (ts);
  `);
}

export async function ensureDatabaseExists(): Promise<void> {
  const targetDatabase = Bun.env.DB_DATABASE ?? "spotify";
  const adminPool = createPool("postgres");

  try {
    const result = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      targetDatabase,
    ]);
    if (result.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE ${quoteIdentifier(targetDatabase)}`);
    }
  } finally {
    await adminPool.end();
  }
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
