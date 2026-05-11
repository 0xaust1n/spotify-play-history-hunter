import { describe, expect, test } from "bun:test";
import { queryTracks } from "../server/tracks";

type QueryCall = {
  sql: string;
  values: unknown[];
};

function createFakeClient() {
  const calls: QueryCall[] = [];

  return {
    calls,
    client: {
      async query(sql: string, values: unknown[]) {
        calls.push({ sql, values });
        return { rows: [] };
      },
    },
  };
}

describe("track queries", () => {
  test("does not apply strict playback threshold by default", async () => {
    const fake = createFakeClient();

    const result = await queryTracks(fake.client, new URLSearchParams());

    expect(result.strictMode).toBe(false);
    expect(fake.calls[0]?.values).toContain(false);
  });

  test("applies strict playback threshold before grouping tracks", async () => {
    const fake = createFakeClient();

    const result = await queryTracks(fake.client, new URLSearchParams({ strictMode: "true" }));

    expect(result.strictMode).toBe(true);
    expect(fake.calls[0]?.sql).toContain("ms_played >= 30000");
    expect(fake.calls[0]?.sql.indexOf("ms_played >= 30000")).toBeLessThan(
      fake.calls[0]?.sql.indexOf("GROUP BY") ?? -1,
    );
    expect(fake.calls[0]?.values).toContain(true);
  });
});
