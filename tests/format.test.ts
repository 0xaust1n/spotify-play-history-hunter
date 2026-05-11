import { describe, expect, test } from "bun:test";
import { formatDateTime } from "../src/lib/date";

describe("date formatting", () => {
  test("uses sortable Taipei date time with seconds", () => {
    expect(formatDateTime("2026-04-05T04:48:09.000Z")).toBe("2026-04-05 12:48:09");
    expect(formatDateTime("2018-07-15T18:15:30.000Z")).toBe("2018-07-16 02:15:30");
  });
});
