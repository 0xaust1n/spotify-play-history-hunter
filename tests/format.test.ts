import { describe, expect, test } from "bun:test";
import { formatDateTime } from "../src/lib/date";

describe("date formatting", () => {
  test("uses 24-hour time without localized day periods", () => {
    expect(formatDateTime("2026-04-05T04:48:00.000Z")).toBe("2026年4月5日 12:48");
    expect(formatDateTime("2018-07-15T18:15:00.000Z")).toBe("2018年7月16日 02:15");
  });
});
