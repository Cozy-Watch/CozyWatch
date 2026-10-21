import { readConditionalPages } from "./conditionalPages";
const unchanged = () => Object.assign(new Error("Not modified"), { status: 304 });
it("revalidates later pages and discards obsolete pages", async () => {
  const client = {}, key = "comments:org/repo/1";
  await readConditionalPages({ client, key, request: async page => ({ data: [page], headers: { etag: `page-${page}`, ...(page === 1 ? { link: '<next>; rel="next"' } : {}) } }) });
  const request = jest.fn(async (page: number) => {
    if (page === 1) throw unchanged();
    return { data: [3], headers: {} };
  });
  expect(await readConditionalPages({ client, key, request })).toEqual([[1], [3]]);
  expect(request).toHaveBeenCalledTimes(2);
  expect(await readConditionalPages({ client, key, request: async () => ({ data: [], headers: {} }) })).toEqual([[]]);
});
it("does not publish partial validators or share them between clients", async () => {
  const client = {}, key = "workflow:org/repo";
  const request = jest.fn(async (page: number) => {
    if (page === 2) throw new Error("Offline");
    return { data: [1], headers: { etag: "partial", link: '<next>; rel="next"' } };
  });
  await expect(readConditionalPages({ client, key, request })).rejects.toThrow("Offline");
  const fresh = jest.fn(async () => ({ data: [2], headers: {} }));
  await readConditionalPages({ client, key, request: fresh });
  expect(fresh).toHaveBeenCalledWith(1, undefined);
  const another = jest.fn(async () => ({ data: [3], headers: {} }));
  await readConditionalPages({ client: {}, key, request: another });
  expect(another).toHaveBeenCalledWith(1, undefined);
});
it("probes beyond a full unchanged terminal page when Link is absent", async () => {
  const client = {}, key = "comments:org/repo/2";
  await readConditionalPages({ client, key, request: async () => ({ data: Array(100).fill(1), headers: { etag: "full" } }) });
  const request = jest.fn(async (page: number) => {
    if (page === 1) throw unchanged();
    return { data: [2], headers: {} };
  });
  expect((await readConditionalPages({ client, key, request })).flat()).toHaveLength(101);
});
