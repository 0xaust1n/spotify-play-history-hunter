export type TrackSortColumn =
  | "track_name"
  | "album_name"
  | "artist_name"
  | "first_streamed"
  | "last_streamed"
  | "stream_count";

export type TrackSortOrder = "asc" | "desc";

export type TrackSortRule = {
  column: TrackSortColumn;
  order: TrackSortOrder;
};

export type TrackQuery = {
  artist: string;
  limit: number;
  minStreams: number | null;
  notPlayedSince: string | null;
  offset: number;
  page: number;
  sortRules: TrackSortRule[];
};

const sortSql: Record<TrackSortColumn, string> = {
  track_name: "track_name",
  album_name: "album_name",
  artist_name: "artist_name",
  first_streamed: "first_streamed_at",
  last_streamed: "last_streamed_at",
  stream_count: "stream_count",
};

const defaultOrderBy = "stream_count DESC, last_streamed_at DESC, track_key ASC";

const nullsLastColumns = new Set<TrackSortColumn>(["album_name"]);

const legacySortSql: Record<TrackSortColumn, Record<TrackSortOrder, string>> = {
  track_name: {
    asc: "track_name ASC, stream_count DESC, last_streamed_at DESC",
    desc: "track_name DESC, stream_count DESC, last_streamed_at DESC",
  },
  album_name: {
    asc: "album_name ASC NULLS LAST, track_name ASC, stream_count DESC",
    desc: "album_name DESC NULLS LAST, track_name ASC, stream_count DESC",
  },
  artist_name: {
    asc: "artist_name ASC, track_name ASC, stream_count DESC",
    desc: "artist_name DESC, track_name ASC, stream_count DESC",
  },
  first_streamed: {
    asc: "first_streamed_at ASC, stream_count DESC, track_name ASC",
    desc: "first_streamed_at DESC, stream_count DESC, track_name ASC",
  },
  last_streamed: {
    asc: "last_streamed_at ASC, stream_count DESC, track_name ASC",
    desc: "last_streamed_at DESC, stream_count DESC, track_name ASC",
  },
  stream_count: {
    asc: "stream_count ASC, last_streamed_at DESC, track_name ASC",
    desc: "stream_count DESC, last_streamed_at DESC, track_name ASC",
  },
};

export function normalizeTrackQuery(params: URLSearchParams): TrackQuery {
  const limit = clamp(Number(params.get("limit") ?? 20), 1, 100);
  const page = clamp(Number(params.get("page") ?? 1), 1, 1_000_000);
  const offsetParam = params.get("offset");
  const offset =
    offsetParam === null ? (page - 1) * limit : clamp(Number(offsetParam), 0, 100_000_000);

  return {
    artist: params.get("artist")?.trim() ?? "",
    limit,
    minStreams: parseMinStreams(params.get("minStreams")),
    notPlayedSince: parseDate(params.get("notPlayedSince")),
    offset,
    page: Math.floor(offset / limit) + 1,
    sortRules: parseSortRules(params),
  };
}

export function getTrackOrderBy(rules: TrackSortRule[]): string {
  if (rules.length === 0) {
    return defaultOrderBy;
  }

  return [
    ...rules.map(({ column, order }) =>
      `${sortSql[column]} ${order.toUpperCase()}${nullsLastColumns.has(column) ? " NULLS LAST" : ""}`,
    ),
    "track_key ASC",
  ].join(", ");
}

function parseSortRules(params: URLSearchParams): TrackSortRule[] {
  const sortParam = params.get("sort");
  if (sortParam !== null) {
    return dedupeRules(
      sortParam
        .split(",")
        .map((token) => token.trim())
        .map((token) => {
          const [columnValue, orderValue] = token.split(":");
          const column = parseSortColumn(columnValue ?? null);
          const order = parseSortOrder(orderValue ?? null);
          return column ? { column, order } : null;
        })
        .filter((rule): rule is TrackSortRule => rule !== null),
    );
  }

  const legacyColumn = parseSortColumn(params.get("sortColumn"));
  if (legacyColumn) {
    return [
      {
        column: legacyColumn,
        order: parseSortOrder(params.get("sortOrder")),
      },
    ];
  }

  return [];
}

function parseSortColumn(value: string | null): TrackSortColumn | null {
  if (
    value === "track_name" ||
    value === "album_name" ||
    value === "artist_name" ||
    value === "first_streamed" ||
    value === "last_streamed" ||
    value === "stream_count"
  ) {
    return value;
  }

  return null;
}

function parseSortOrder(value: string | null): TrackSortOrder {
  return value === "asc" ? "asc" : "desc";
}

function dedupeRules(rules: TrackSortRule[]): TrackSortRule[] {
  const seen = new Set<TrackSortColumn>();
  const deduped: TrackSortRule[] = [];

  for (const rule of rules) {
    if (seen.has(rule.column)) {
      continue;
    }

    seen.add(rule.column);
    deduped.push(rule);
  }

  return deduped;
}

function parseMinStreams(value: string | null): number | null {
  if (value === null || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return Math.trunc(parsed);
}

function parseDate(value: string | null): string | null {
  if (value === null || value.trim() === "") {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return value;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.trunc(value), min), max);
}
