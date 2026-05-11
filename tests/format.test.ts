import { describe, expect, test } from "bun:test";
import { formatDateInput, formatDateTime, parseDateInput } from "../src/lib/date";

describe("date formatting", () => {
  test("uses sortable Taipei date time with seconds", () => {
    expect(formatDateTime("2026-04-05T04:48:09.000Z")).toBe("2026-04-05 12:48:09");
    expect(formatDateTime("2018-07-15T18:15:30.000Z")).toBe("2018-07-16 02:15:30");
  });

  test("formats date picker values as YYYY-MM-DD", () => {
    expect(formatDateInput(new Date(2026, 3, 5))).toBe("2026-04-05");
    expect(formatDateInput(new Date(2018, 10, 9))).toBe("2018-11-09");
  });

  test("parses YYYY-MM-DD date picker values as local dates", () => {
    expect(parseDateInput("2026-04-05")).toEqual(new Date(2026, 3, 5));
    expect(parseDateInput("")).toBeUndefined();
    expect(parseDateInput("04/05/2026")).toBeUndefined();
  });
});
