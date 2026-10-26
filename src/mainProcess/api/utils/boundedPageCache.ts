const MAX_CACHE_BYTES = 8 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 1024;
const CACHE_TTL_MS = 15 * 60_000;

type Entry<T> = { value: T; bytes: number; expires: number };

/** Client-local LRU cache. Byte budget counts serialized payload, not total JS heap. */
export class BoundedPageCache<T> {
  private entries = new Map<string, Entry<T>>();
  private bytes = 0;

  constructor(
    private readonly maxBytes = MAX_CACHE_BYTES,
    private readonly maxEntries = MAX_CACHE_ENTRIES,
    private readonly ttl = CACHE_TTL_MS,
  ) {}

  get(key: string): T | undefined {
    this.prune();
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T) {
    this.prune();
    this.delete(key);
    const bytes = Buffer.byteLength(JSON.stringify(value), "utf8");
    // Oversized result sets still reach the caller; just don't retain a second copy.
    if (bytes > this.maxBytes) return;
    while (this.entries.size >= this.maxEntries || this.bytes + bytes > this.maxBytes) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) return;
      this.delete(oldest);
    }
    this.entries.set(key, { value, bytes, expires: Date.now() + this.ttl });
    this.bytes += bytes;
  }

  delete(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.bytes -= entry.bytes;
    this.entries.delete(key);
  }

  keys() { this.prune(); return this.entries.keys(); }

  private prune() {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expires <= now) this.delete(key);
    }
  }
}
