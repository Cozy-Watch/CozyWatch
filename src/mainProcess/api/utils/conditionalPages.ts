type Page<T> = { data: T[]; etag?: string; next: boolean };
type Response<T> = { data: T[]; headers: { etag?: string; link?: string } };
const clients = new WeakMap<object, Map<string, Page<unknown>[]>>();

/** A validator covers one page, never the whole collection. Commit complete sets only. */
export const readConditionalPages = async <T>({
  client, key, request, maxPages = Infinity,
}: {
  client: object;
  key: string;
  request: (page: number, etag?: string) => Promise<Response<T>>;
  maxPages?: number;
}): Promise<T[][]> => {
  let cache = clients.get(client);
  if (!cache) { cache = new Map(); clients.set(client, cache); }
  const previous = (cache.get(key) ?? []) as Page<T>[];
  const pages: Page<T>[] = [];
  for (let page = 1; ; page++) {
    if (page > maxPages) throw new Error("GitHub pagination exceeded the supported result limit.");
    const old = previous[page - 1];
    let value: Page<T>;
    try {
      const response = await request(page, old?.etag);
      value = { data: response.data, etag: response.headers.etag, next: /rel="next"/.test(response.headers.link ?? "") };
    } catch (error) {
      if ((error as { status?: number }).status !== 304 || !old) throw error;
      const headers = (error as { response?: { headers?: Response<T>["headers"] } }).response?.headers;
      value = {
        ...old, etag: headers?.etag ?? old.etag,
        next: headers?.link !== undefined ? /rel="next"/.test(headers.link) : old.next || (old.data.length === 100 && page < maxPages),
      };
    }
    pages.push(value);
    if (!value.next) break;
  }
  cache.set(key, pages);
  return pages.map(page => page.data);
};
