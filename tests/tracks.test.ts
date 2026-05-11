import { describe, expect, test } from "bun:test";
import type pg from "pg";
import { queryTracks } from "../server/tracks";

type QueryCall = {
  sql: string;
  values?: unknown[];
};

function createFakeClient() {
  const calls: QueryCall[] = [];

  return {
    calls,
    client: {
      async query(sql: string, values?: unknown[]) {
        calls.push({ sql, values });
        return { rows: [] };
      },
    } as unknown as pg.Pool,
  };
}

describe("track queries", () => {
  test("does not apply strict playback threshold by default", async () => {
    const fake = createFakeClient();

    const result = await queryTracks(fake.client, new URLSearchParams());

    expect(result.strictMode).toBe(false);
    expect(findTrackQueryCall(fake.calls)?.values).toContain(false);
  });

  test("applies strict playback threshold before grouping tracks", async () => {
    const fake = createFakeClient();

    const result = await queryTracks(fake.client, new URLSearchParams({ strictMode: "true" }));

    expect(result.strictMode).toBe(true);
    const trackQueryCall = findTrackQueryCall(fake.calls);
    expect(trackQueryCall?.sql).toContain("ms_played >= 30000");
    expect(trackQueryCall?.sql.indexOf("ms_played >= 30000")).toBeLessThan(
      trackQueryCall?.sql.indexOf("GROUP BY") ?? -1,
    );
    expect(trackQueryCall?.values).toContain(true);
  });

  test("sets a transaction-local statement timeout around track queries", async () => {
    const fake = createFakeClient();

    await queryTracks(fake.client, new URLSearchParams());

    expect(fake.calls.map((call) => call.sql)).toEqual([
      "BEGIN",
      "SELECT set_config('statement_timeout', $1, true)",
      expect.stringContaining("WITH grouped_tracks"),
      "COMMIT",
    ]);
    expect(fake.calls[1]?.values).toEqual(["5000ms"]);
  });
});

function findTrackQueryCall(calls: QueryCall[]): QueryCall | undefined {
  return calls.find((call) => call.sql.includes("WITH grouped_tracks"));
}
