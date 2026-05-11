import { describe, expect, test } from "bun:test";
import { toggleSortRule } from "../src/lib/sort-state";

describe("datatable sort state", () => {
  test("cycles a column through asc, desc, and nothing", () => {
    const asc = toggleSortRule([], "stream_count");
    expect(asc).toEqual([{ column: "stream_count", direction: "asc" }]);

    const desc = toggleSortRule(asc, "stream_count");
    expect(desc).toEqual([{ column: "stream_count", direction: "desc" }]);

    expect(toggleSortRule(desc, "stream_count")).toEqual([]);
  });

  test("keeps multi-sort rules in click order", () => {
    const rules = toggleSortRule(
      toggleSortRule(toggleSortRule([], "stream_count"), "stream_count"),
      "last_streamed",
    );

    expect(rules).toEqual([
      { column: "stream_count", direction: "desc" },
      { column: "last_streamed", direction: "asc" },
    ]);
  });
});
