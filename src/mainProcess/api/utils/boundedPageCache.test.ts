import { BoundedPageCache } from "./boundedPageCache";

it("evicts the least recently read entry when its entry budget is reached", () => {
  const cache = new BoundedPageCache<number>(1000, 2);
  cache.set("a", 1); cache.set("b", 2);
  expect(cache.get("a")).toBe(1);
  cache.set("c", 3);
  expect(cache.get("b")).toBeUndefined();
  expect(cache.get("a")).toBe(1);
});
it("bounds retained payloads by bytes and does not retain oversized results", () => {
  const cache = new BoundedPageCache<string>(10, 10);
  cache.set("a", "1234"); cache.set("b", "5678");
  expect(cache.get("a")).toBeUndefined();
  expect(cache.get("b")).toBe("5678");
  cache.set("large", "x".repeat(11));
  expect(cache.get("large")).toBeUndefined();
});
it("expires unused pages and maintains its byte count when replacing entries", () => {
  jest.useFakeTimers();
  try {
    const cache = new BoundedPageCache<string>(10, 2, 1000);
    cache.set("a", "1234"); cache.set("a", "12"); cache.set("b", "34");
    expect([...cache.keys()]).toEqual(["a", "b"]);
    jest.advanceTimersByTime(1001);
    expect(cache.get("a")).toBeUndefined();
    expect([...cache.keys()]).toEqual([]);
  } finally { jest.useRealTimers(); }
});
