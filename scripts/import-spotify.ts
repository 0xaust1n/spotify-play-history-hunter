import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureDatabaseExists, ensureSchema, pool } from "../server/db";
import { toStreamRecord, type SpotifyHistoryEntry } from "../src/lib/spotify";

const dumpDir = Bun.env.SPOTIFY_DUMP_DIR ?? "./spotify_dump_folder";
const reset = Bun.argv.includes("--reset");

await ensureDatabaseExists();
await ensureSchema(pool);

if (reset) {
  await pool.query("TRUNCATE TABLE streaming_events RESTART IDENTITY;");
  console.log("Reset streaming_events.");
}

const files = (await readdir(dumpDir))
  .filter((file) => /^Streaming_History_Audio_.*\.json$/.test(file))
  .sort();

let inserted = 0;
let skipped = 0;

for (const file of files) {
  const fullPath = join(dumpDir, file);
  const entries = JSON.parse(await readFile(fullPath, "utf8")) as SpotifyHistoryEntry[];

  console.log(`Importing ${file} (${entries.length} entries)`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const record = toStreamRecord(entry);
      if (!record) {
        skipped += 1;
        continue;
      }

      const result = await client.query(
        `
          INSERT INTO streaming_events (
            source_file,
            source_index,
            ts,
            ms_played,
            track_name,
            album_name,
            artist_name,
            spotify_track_uri,
            raw
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
          ON CONFLICT (source_file, source_index) DO NOTHING;
        `,
        [
          file,
          index,
          record.ts,
          record.msPlayed,
          record.trackName,
          record.albumName,
          record.artistName,
          record.spotifyTrackUri,
          JSON.stringify(entry),
        ],
      );

      inserted += result.rowCount ?? 0;
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

await pool.end();

console.log(`Imported ${inserted} new track events from ${files.length} files.`);
console.log(`Skipped ${skipped} non-track or invalid events.`);
