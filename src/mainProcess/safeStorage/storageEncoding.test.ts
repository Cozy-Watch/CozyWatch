import { decodeStorageValue, encodeStorageValue } from "./storageEncoding";

describe("storage value encoding", () => {
  it("round trips small values without compression", async () => {
    const value = { appearance: "dark" };
    const encoded = await encodeStorageValue(value, false);

    expect(encoded).toBe(JSON.stringify(value));
    await expect(decodeStorageValue(encoded)).resolves.toEqual(value);
  });

  it("round trips compressed derived caches", async () => {
    const value = {
      pullRequests: Array.from({ length: 100 }, (_, index) => ({
        id: index,
        title: `Pull request ${index}`,
      })),
    };
    const encoded = await encodeStorageValue(value, true);

    expect(encoded).toMatch(/^gzip:/);
    expect(encoded.length).toBeLessThan(JSON.stringify(value).length);
    await expect(decodeStorageValue(encoded)).resolves.toEqual(value);
  });
});
