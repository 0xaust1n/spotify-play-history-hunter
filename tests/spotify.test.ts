import { describe, expect, test } from "bun:test";
import {
  aggregateTrackStats,
  sortTrackStats,
  toStreamRecord,
  type SpotifyHistoryEntry,
} from "../src/lib/spotify";

const entry = (
  overrides: Partial<SpotifyHistoryEntry>,
): SpotifyHistoryEntry => ({
  ts: "2023-01-01T00:00:00Z",
  ms_played: 180000,
  master_metadata_track_name: "Fragile",
  master_metadata_album_artist_name: "Laufey",
  master_metadata_album_album_name: "Everything I Know About Love",
  spotify_track_uri: "spotify:track:fragile",
  ...overrides,
});

describe("spotify history aggregation", () => {
  test("normalizes track rows and skips non-track entries", () => {
    expect(toStreamRecord(entry({ ms_played: 0 }))).toEqual({
      ts: new Date("2023-01-01T00:00:00Z"),
      msPlayed: 0,
      trackName: "Fragile",
      albumName: "Everything I Know About Love",
      artistName: "Laufey",
      spotifyTrackUri: "spotify:track:fragile",
    });

    expect(
      toStreamRecord(
        entry({
          master_metadata_track_name: null,
          spotify_track_uri: null,
        }),
      ),
    ).toBeNull();
  });

  test("aggregates stream count and first/last streamed timestamps by track", () => {
    const stats = aggregateTrackStats([
      entry({ ts: "2024-02-01T10:00:00Z", ms_played: 1000 }),
      entry({ ts: "2024-03-01T10:00:00Z", ms_played: 2000 }),
      entry({
        ts: "2024-01-01T10:00:00Z",
        ms_played: 3000,
        master_metadata_track_name: "Let You Break My Heart Again",
        spotify_track_uri: "spotify:track:heart",
      }),
    ]);

    expect(stats).toHaveLength(2);
    expect(stats[0]).toMatchObject({
      trackName: "Fragile",
      streamCount: 2,
      totalMsPlayed: 3000,
    });
    expect(stats[0].firstStreamedAt.toISOString()).toBe("2024-02-01T10:00:00.000Z");
    expect(stats[0].lastStreamedAt.toISOString()).toBe("2024-03-01T10:00:00.000Z");
  });

  test("sorts by stream count descending by default", () => {
    const stats = aggregateTrackStats([
      entry({ spotify_track_uri: "spotify:track:a", master_metadata_track_name: "A" }),
      entry({ spotify_track_uri: "spotify:track:b", master_metadata_track_name: "B" }),
      entry({ spotify_track_uri: "spotify:track:b", master_metadata_track_name: "B" }),
    ]);

    expect(sortTrackStats(stats).map((track) => track.trackName)).toEqual(["B", "A"]);
  });

  test("sorts by datatable column directions", () => {
    const stats = aggregateTrackStats([
      entry({
        ts: "2024-01-01T00:00:00Z",
        spotify_track_uri: "spotify:track:charlie",
        master_metadata_track_name: "Charlie",
        master_metadata_album_album_name: "Second",
        master_metadata_album_artist_name: "Beta",
      }),
      entry({
        ts: "2024-03-01T00:00:00Z",
        spotify_track_uri: "spotify:track:alpha",
        master_metadata_track_name: "Alpha",
        master_metadata_album_album_name: "First",
        master_metadata_album_artist_name: "Gamma",
      }),
      entry({
        ts: "2024-02-01T00:00:00Z",
        spotify_track_uri: "spotify:track:bravo",
        master_metadata_track_name: "Bravo",
        master_metadata_album_album_name: "Third",
        master_metadata_album_artist_name: "Alpha",
      }),
    ]);

    expect(sortTrackStats(stats, "track_name_asc").map((track) => track.trackName)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
    expect(sortTrackStats(stats, "artist_name_desc").map((track) => track.artistName)).toEqual([
      "Gamma",
      "Beta",
      "Alpha",
    ]);
    expect(sortTrackStats(stats, "last_streamed_desc").map((track) => track.trackName)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
    expect(sortTrackStats(stats, "first_streamed_asc").map((track) => track.trackName)).toEqual([
      "Charlie",
      "Bravo",
      "Alpha",
    ]);
  });
});
