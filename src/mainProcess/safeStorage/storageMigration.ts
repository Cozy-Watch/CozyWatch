import type { StoreDataName } from "./safeStorage.types";

export type EncryptedStorageObject = Partial<Record<StoreDataName, string>>;

const DERIVED_CACHE_KEYS = new Set<StoreDataName>([
  "pull_requests_cache",
  "repositories_cache",
]);

export const parseEncryptedStorage = (
  contents: string,
): EncryptedStorageObject => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error("Invalid encrypted storage object.");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    !Object.values(parsed).every((value) => typeof value === "string")
  ) {
    throw new Error("Invalid encrypted storage object.");
  }
  return parsed as EncryptedStorageObject;
};

export const isDerivedCacheKey = (
  name: StoreDataName,
): name is "pull_requests_cache" | "repositories_cache" =>
  DERIVED_CACHE_KEYS.has(name);

export const withoutDerivedCaches = (
  storage: EncryptedStorageObject,
): EncryptedStorageObject =>
  Object.fromEntries(
    Object.entries(storage).filter(
      ([name]) => !DERIVED_CACHE_KEYS.has(name as StoreDataName),
    ),
  );

export const getActiveRepositories = (
  repositoryCache: unknown,
): Record<number, boolean> | null => {
  if (typeof repositoryCache !== "object" || repositoryCache === null) {
    return null;
  }
  const activeRepositories = (
    repositoryCache as { activeRepositories?: unknown }
  ).activeRepositories;
  if (
    typeof activeRepositories !== "object" ||
    activeRepositories === null ||
    Array.isArray(activeRepositories) ||
    !Object.entries(activeRepositories).every(
      ([key, value]) => /^\d+$/.test(key) && typeof value === "boolean",
    )
  ) {
    return null;
  }
  return activeRepositories as Record<number, boolean>;
};
