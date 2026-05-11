import { describe, expect, test } from "bun:test";
import { ResponseCache } from "../server/response-cache";

describe("response cache", () => {
  test("returns cached values until the ttl expires", () => {
    const cache = new ResponseCache<string>(1000, 10);

    cache.set("tracks?page=1", "cached", 1000);

    expect(cache.get("tracks?page=1", 1500)).toBe("cached");
    expect(cache.get("tracks?page=1", 2000)).toBeNull();
  });

  test("evicts the least recently used entry when capacity is exceeded", () => {
    const cache = new ResponseCache<string>(1000, 2);

    cache.set("a", "A", 1000);
    cache.set("b", "B", 1000);
    expect(cache.get("a", 1001)).toBe("A");
    cache.set("c", "C", 1002);

    expect(cache.get("b", 1003)).toBeNull();
    expect(cache.get("a", 1003)).toBe("A");
    expect(cache.get("c", 1003)).toBe("C");
  });
});
