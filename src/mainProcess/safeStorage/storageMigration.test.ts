import {
  getActiveRepositories,
  isDerivedCacheKey,
  parseEncryptedStorage,
  withoutDerivedCaches,
} from "./storageMigration";

describe("storage migration", () => {
  it("preserves credentials and settings while discarding derived caches", () => {
    expect(
      withoutDerivedCaches({
        access_token: "encrypted-token",
        appearance: "encrypted-appearance",
        pull_requests_cache: "encrypted-pull-requests",
        repositories_cache: "encrypted-repositories",
      }),
    ).toEqual({
      access_token: "encrypted-token",
      appearance: "encrypted-appearance",
    });
  });

  it.each([
    ["pull_requests_cache", true],
    ["repositories_cache", true],
    ["access_token", false],
  ] as const)("classifies %s as derived cache: %s", (name, expected) => {
    expect(isDerivedCacheKey(name)).toBe(expected);
  });

  it("extracts repository selections from the discarded cache", () => {
    expect(
      getActiveRepositories({
        activeRepositories: { 1: true, 2: false },
        repositoriesByPage: { 1: [{ id: 1 }] },
      }),
    ).toEqual({ 1: true, 2: false });
  });

  it("rejects invalid repository selections", () => {
    expect(getActiveRepositories({ activeRepositories: { 1: "yes" } })).toBe(
      null,
    );
  });

  it.each(["not-json", "[]", "{\"access_token\":42}"])(
    "rejects corrupt encrypted storage: %s",
    (contents) => {
      expect(() => parseEncryptedStorage(contents)).toThrow(
        "Invalid encrypted storage object",
      );
    },
  );
});
