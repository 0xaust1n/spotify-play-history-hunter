import { expect, test } from "bun:test";
import { toggleSearchTarget } from "../src/lib/search-targets";

test("selects, combines, and removes individual search targets", () => {
  expect(toggleSearchTarget("all", "track")).toBe("track");
  expect(toggleSearchTarget("track", "artist")).toBe("track,artist");
  expect(toggleSearchTarget("track,artist", "track")).toBe("artist");
});

test("returns to all for an empty selection, all three fields, or All button", () => {
  expect(toggleSearchTarget("track", "track")).toBe("all");
  expect(toggleSearchTarget("track,artist", "album")).toBe("all");
  expect(toggleSearchTarget("track,artist", "all")).toBe("all");
});
