import { describe, expect, test } from "bun:test";
import { getPaginationItems } from "../src/lib/pagination";

describe("pagination items", () => {
  test("shows all pages when the page count is small", () => {
    expect(getPaginationItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  test("shows the opening range with a trailing ellipsis", () => {
    expect(getPaginationItems(1, 20)).toEqual([1, 2, 3, 4, 5, "ellipsis", 20]);
  });

  test("centers pages around the current page", () => {
    expect(getPaginationItems(8, 20)).toEqual([1, "ellipsis", 6, 7, 8, 9, 10, "ellipsis", 20]);
  });

  test("shows the closing range with a leading ellipsis", () => {
    expect(getPaginationItems(19, 20)).toEqual([1, "ellipsis", 16, 17, 18, 19, 20]);
  });
});
