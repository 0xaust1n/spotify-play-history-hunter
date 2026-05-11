export type SpotifyHistoryEntry = {
  ts: string;
  ms_played: number;
  master_metadata_track_name: string | null;
  master_metadata_album_artist_name: string | null;
  master_metadata_album_album_name: string | null;
  spotify_track_uri: string | null;
};

export type StreamRecord = {
  ts: Date;
  msPlayed: number;
  trackName: string;
  albumName: string | null;
  artistName: string;
  spotifyTrackUri: string | null;
};

export type TrackStat = {
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

export type TrackSort =
  | "track_name_asc"
  | "track_name_desc"
  | "album_name_asc"
  | "album_name_desc"
  | "artist_name_asc"
  | "artist_name_desc"
  | "stream_count_asc"
  | "stream_count_desc"
  | "first_streamed_asc"
  | "first_streamed_desc"
  | "last_streamed_asc"
  | "last_streamed_desc";

export function toStreamRecord(entry: SpotifyHistoryEntry): StreamRecord | null {
  if (!entry.master_metadata_track_name || !entry.master_metadata_album_artist_name) {
    return null;
  }

  const ts = new Date(entry.ts);
  if (Number.isNaN(ts.getTime())) {
    return null;
  }

  return {
    ts,
    msPlayed: entry.ms_played ?? 0,
    trackName: entry.master_metadata_track_name,
    albumName: entry.master_metadata_album_album_name,
    artistName: entry.master_metadata_album_artist_name,
    spotifyTrackUri: entry.spotify_track_uri,
  };
}

export function trackKeyFor(record: StreamRecord): string {
  return (
    record.spotifyTrackUri ??
    [
      record.artistName.trim().toLowerCase(),
      record.albumName?.trim().toLowerCase() ?? "",
      record.trackName.trim().toLowerCase(),
    ].join("\u0000")
  );
}

export function aggregateTrackStats(entries: SpotifyHistoryEntry[]): TrackStat[] {
  const grouped = new Map<string, TrackStat>();

  for (const entry of entries) {
    const record = toStreamRecord(entry);
    if (!record) {
      continue;
    }

    const trackKey = trackKeyFor(record);
    const current = grouped.get(trackKey);
    if (!current) {
      grouped.set(trackKey, {
        trackKey,
        trackName: record.trackName,
        albumName: record.albumName,
        artistName: record.artistName,
        spotifyTrackUri: record.spotifyTrackUri,
        streamCount: 1,
        totalMsPlayed: record.msPlayed,
        firstStreamedAt: record.ts,
        lastStreamedAt: record.ts,
      });
      continue;
    }

    current.streamCount += 1;
    current.totalMsPlayed += record.msPlayed;
    if (record.ts < current.firstStreamedAt) {
      current.firstStreamedAt = record.ts;
    }
    if (record.ts > current.lastStreamedAt) {
      current.lastStreamedAt = record.ts;
    }
  }

  return [...grouped.values()];
}

export function sortTrackStats(
  stats: TrackStat[],
  sort: TrackSort = "stream_count_desc",
): TrackStat[] {
  return [...stats].sort((left, right) => {
    if (sort === "track_name_asc" || sort === "track_name_desc") {
      return compareText(left.trackName, right.trackName, sort.endsWith("_desc"));
    }

    if (sort === "album_name_asc" || sort === "album_name_desc") {
      return compareText(left.albumName ?? "", right.albumName ?? "", sort.endsWith("_desc"));
    }

    if (sort === "artist_name_asc" || sort === "artist_name_desc") {
      return compareText(left.artistName, right.artistName, sort.endsWith("_desc"));
    }

    if (sort === "stream_count_asc") {
      return (
        left.streamCount - right.streamCount ||
        right.lastStreamedAt.getTime() - left.lastStreamedAt.getTime() ||
        left.trackName.localeCompare(right.trackName)
      );
    }

    if (sort === "first_streamed_asc") {
      return (
        left.firstStreamedAt.getTime() - right.firstStreamedAt.getTime() ||
        right.streamCount - left.streamCount ||
        left.trackName.localeCompare(right.trackName)
      );
    }

    if (sort === "first_streamed_desc") {
      return (
        right.firstStreamedAt.getTime() - left.firstStreamedAt.getTime() ||
        right.streamCount - left.streamCount ||
        left.trackName.localeCompare(right.trackName)
      );
    }

    if (sort === "last_streamed_asc") {
      return (
        left.lastStreamedAt.getTime() - right.lastStreamedAt.getTime() ||
        right.streamCount - left.streamCount ||
        left.trackName.localeCompare(right.trackName)
      );
    }

    if (sort === "last_streamed_desc") {
      return (
        right.lastStreamedAt.getTime() - left.lastStreamedAt.getTime() ||
        right.streamCount - left.streamCount ||
        left.trackName.localeCompare(right.trackName)
      );
    }

    return (
      right.streamCount - left.streamCount ||
      right.lastStreamedAt.getTime() - left.lastStreamedAt.getTime() ||
      left.trackName.localeCompare(right.trackName)
    );
  });
}

function compareText(left: string, right: string, descending: boolean): number {
  const result = left.localeCompare(right, undefined, { sensitivity: "base" });
  return descending ? -result : result;
}
