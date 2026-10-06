import { expect, test } from "bun:test";
import { getRecentDateRange, validateDateInput } from "../src/lib/date";

test("past week includes seven Taiwan calendar days across a year boundary", () => {
  expect(getRecentDateRange("week", new Date("2025-12-31T17:00:00Z"))).toEqual({
    from: "2025-12-26",
    to: "2026-01-01",
  });
});

test("past month clamps to the last valid day of the previous month", () => {
  expect(getRecentDateRange("month", new Date("2026-03-31T04:00:00Z"))).toEqual({
    from: "2026-02-28",
    to: "2026-03-31",
  });
});

test("past year handles leap day", () => {
  expect(getRecentDateRange("year", new Date("2024-02-29T04:00:00Z"))).toEqual({
    from: "2023-02-28",
    to: "2024-02-29",
  });
});

test("date text validates format, real calendar dates, and range boundaries", () => {
  expect(validateDateInput("")).toBeNull();
  expect(validateDateInput("2026-06-30")).toBeNull();
  expect(validateDateInput("2026-6-30")).toContain("YYYY-MM-DD");
  expect(validateDateInput("2026/06/30")).toContain("YYYY-MM-DD");
  expect(validateDateInput("2026-02-29")).toContain("does not exist");
  expect(validateDateInput("2024-02-29")).toBeNull();
  expect(validateDateInput("2026-04-31")).toContain("does not exist");
  expect(validateDateInput("2026-06-30", "2026-07-01")).toContain("on or after");
  expect(validateDateInput("2026-07-01", undefined, "2026-06-30")).toContain("on or before");
  expect(validateDateInput("2026-06-30", "2026-06-30", "2026-06-30")).toBeNull();
});
