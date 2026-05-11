import type pg from "pg";
import { getTrackOrderBy, normalizeTrackQuery, type TrackQuery } from "./track-query";

const queryTimeoutMs = Number(Bun.env.TRACK_QUERY_TIMEOUT_MS ?? 5000);

export type TrackRow = {
  trackKey: string;
  trackName: string;
  albumName: string | null;
  artistName: string;
  spotifyTrackUri: string | null;
  streamCount: number;
  totalMsPlayed: number;
  firstStreamedAt: Date;
  lastStreamedAt: Date;
};

export type TrackQueryResult = {
  page: number;
  limit: number;
  offset: number;
  total: number;
  minStreams: number | null;
  notPlayedSince: string | null;
  sortRules: TrackQuery["sortRules"];
  strictMode: boolean;
  tracks: TrackRow[];
};

export async function queryTracks(
  client: pg.Pool | pg.PoolClient,
  params: URLSearchParams,
  overrides?: Partial<Pick<TrackQuery, "limit" | "offset">>,
): Promise<TrackQueryResult> {
  const query = normalizeTrackQuery(params);
  const effectiveQuery = {
    ...query,
    ...overrides,
  };
  const orderBy = getTrackOrderBy(effectiveQuery.sortRules);
  const shouldSetTimeout = Number.isFinite(queryTimeoutMs) && queryTimeoutMs > 0;

  if (shouldSetTimeout) {
    await client.query("BEGIN");
  }

  try {
    if (shouldSetTimeout) {
      await client.query("SELECT set_config('statement_timeout', $1, true)", [
        `${Math.trunc(queryTimeoutMs)}ms`,
      ]);
    }

    const result = await client.query(
      `
        WITH grouped_tracks AS (
          SELECT
            COALESCE(spotify_track_uri, LOWER(COALESCE(artist_name, '') || '#|#' || COALESCE(album_name, '') || '#|#' || COALESCE(track_name, ''))) AS track_key,
            track_name,
            album_name,
            artist_name,
            spotify_track_uri,
            COUNT(*)::INTEGER AS stream_count,
            SUM(ms_played)::BIGINT AS total_ms_played,
            MIN(ts) AS first_streamed_at,
            MAX(ts) AS last_streamed_at
          FROM streaming_events
          WHERE track_name IS NOT NULL
            AND artist_name IS NOT NULL
            AND ($1 = '' OR artist_name ILIKE '%' || $1 || '%')
            AND ($6::BOOLEAN = FALSE OR ms_played >= 30000)
          GROUP BY spotify_track_uri, track_name, album_name, artist_name
        )
        SELECT
          *,
          COUNT(*) OVER()::INTEGER AS total_count
        FROM grouped_tracks
        WHERE ($2::INTEGER IS NULL OR stream_count >= $2)
          AND ($3::DATE IS NULL OR last_streamed_at < $3::DATE)
        ORDER BY ${orderBy}
        LIMIT $4
        OFFSET $5;
      `,
      [
        effectiveQuery.artist,
        effectiveQuery.minStreams,
        effectiveQuery.notPlayedSince,
        effectiveQuery.limit,
        effectiveQuery.offset,
        effectiveQuery.strictMode,
      ],
    );

    if (shouldSetTimeout) {
      await client.query("COMMIT");
    }

    return {
      page: effectiveQuery.page,
      limit: effectiveQuery.limit,
      offset: effectiveQuery.offset,
      total: result.rows[0]?.total_count ?? 0,
      minStreams: effectiveQuery.minStreams,
      notPlayedSince: effectiveQuery.notPlayedSince,
      sortRules: effectiveQuery.sortRules,
      strictMode: effectiveQuery.strictMode,
      tracks: result.rows.map((row) => ({
        trackKey: row.track_key,
        trackName: row.track_name,
        albumName: row.album_name,
        artistName: row.artist_name,
        spotifyTrackUri: row.spotify_track_uri,
        streamCount: row.stream_count,
        totalMsPlayed: Number(row.total_ms_played),
        firstStreamedAt: row.first_streamed_at,
        lastStreamedAt: row.last_streamed_at,
      })),
    };
  } catch (error) {
    if (shouldSetTimeout) {
      await client.query("ROLLBACK");
    }

    throw error;
  }
}
