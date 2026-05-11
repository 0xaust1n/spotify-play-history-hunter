import { describe, expect, test } from "bun:test";
import { getTrackOrderBy, normalizeTrackQuery } from "../server/track-query";

describe("track API query parameters", () => {
  test("defaults to first page of 20 records with no explicit sort rules", () => {
    expect(normalizeTrackQuery(new URLSearchParams())).toEqual({
      artist: "",
      limit: 20,
      minStreams: null,
      notPlayedSince: null,
      offset: 0,
      page: 1,
      sortRules: [],
      strictMode: false,
    });
  });

  test("converts current page to offset and keeps ordered sort rules", () => {
    const params = new URLSearchParams({
      artist: "Laufey",
      page: "3",
      sort: "stream_count:desc,last_streamed:desc",
    });

    expect(normalizeTrackQuery(params)).toEqual({
      artist: "Laufey",
      limit: 20,
      minStreams: null,
      notPlayedSince: null,
      offset: 40,
      page: 3,
      sortRules: [
        { column: "stream_count", order: "desc" },
        { column: "last_streamed", order: "desc" },
      ],
      strictMode: false,
    });
  });

  test("normalizes strict mode only when explicitly true", () => {
    expect(normalizeTrackQuery(new URLSearchParams({ strictMode: "true" }))).toMatchObject({
      strictMode: true,
    });
    expect(normalizeTrackQuery(new URLSearchParams({ strictMode: "false" }))).toMatchObject({
      strictMode: false,
    });
    expect(normalizeTrackQuery(new URLSearchParams({ strictMode: "1" }))).toMatchObject({
      strictMode: false,
    });
  });

  test("prefers explicit offset over page-derived offset", () => {
    const params = new URLSearchParams({
      page: "8",
      offset: "60",
      limit: "20",
    });

    expect(normalizeTrackQuery(params).offset).toBe(60);
  });

  test("caps requested result limits at 100 records", () => {
    expect(normalizeTrackQuery(new URLSearchParams({ limit: "500" })).limit).toBe(100);
    expect(normalizeTrackQuery(new URLSearchParams({ limit: "0" })).limit).toBe(1);
  });

  test("normalizes forgotten-favorites filters", () => {
    const params = new URLSearchParams({
      minStreams: "10",
      notPlayedSince: "2023-01-01",
    });

    expect(normalizeTrackQuery(params)).toMatchObject({
      minStreams: 10,
      notPlayedSince: "2023-01-01",
    });
  });

  test("ignores invalid forgotten-favorites filters", () => {
    const params = new URLSearchParams({
      minStreams: "-4",
      notPlayedSince: "not-a-date",
    });

    expect(normalizeTrackQuery(params)).toMatchObject({
      minStreams: null,
      notPlayedSince: null,
    });
  });

  test("maps datatable multi-sort state to stable SQL order clauses", () => {
    expect(
      getTrackOrderBy([
        { column: "stream_count", order: "desc" },
        { column: "last_streamed", order: "desc" },
      ]),
    ).toBe("stream_count DESC, last_streamed_at DESC, track_key ASC");
    expect(
      getTrackOrderBy([
        { column: "last_streamed", order: "asc" },
        { column: "track_name", order: "desc" },
      ]),
    ).toBe("last_streamed_at ASC, track_name DESC, track_key ASC");
  });

  test("uses stream count descending as the fallback when no sort rule is active", () => {
    expect(getTrackOrderBy([])).toBe("stream_count DESC, last_streamed_at DESC, track_key ASC");
  });
});
