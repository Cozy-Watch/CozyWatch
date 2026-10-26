import { getReleaseViewNotes } from "./releaseViewNotes";

const originalFetch = globalThis.fetch;
const fetchMock = jest.fn();
beforeEach(() => { fetchMock.mockReset(); globalThis.fetch = fetchMock; });
afterAll(() => { globalThis.fetch = originalFetch; });
const result = (release: unknown) => new Response(JSON.stringify({ release }));

it("fetches the exact version and formats published sections as plain text", async () => {
  fetchMock.mockResolvedValue(result({ version: "v0.10.0", title: "Clearer activity", summary: "Know what happened.", sections: [{ heading: "Improvements", items: ["See who reviewed your PR."] }] }));
  expect(await getReleaseViewNotes("Cozy Watch 0.10.0")).toBe("Clearer activity\n\nKnow what happened.\n\nImprovements\n• See who reviewed your PR.");
  expect(fetchMock.mock.calls[0][0]).toBe("https://www.releaseview.com/api/v1/projects/cozy-watch-dd6341/releases/v0.10.0");
});

it("supports versions stored without a v prefix", async () => {
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 })).mockResolvedValueOnce(result({ version: "0.10.0", summary: "A useful update." }));
  expect(await getReleaseViewNotes("v0.10.0")).toBe("A useful update.");
});

it("does not show notes for a different version", async () => {
  fetchMock.mockResolvedValue(result({ version: "v0.9.8", summary: "Wrong version" }));
  expect(await getReleaseViewNotes("v0.10.0")).toBeNull();
});

it.each([null, { version: "v0.10.0", sections: [null, { items: [null, 1] }] }])("handles incomplete data safely", async (release) => {
  fetchMock.mockResolvedValue(result(release));
  expect(await getReleaseViewNotes("v0.10.0")).toBeNull();
});

it("falls back when the API fails", async () => {
  fetchMock.mockRejectedValue(new Error("offline"));
  expect(await getReleaseViewNotes("v0.10.0")).toBeNull();
});

it("does not fetch unrelated notes for an unknown release name", async () => {
  expect(await getReleaseViewNotes("Cozy Watch update")).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("bounds the request so an outage cannot block the update prompt", async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementation((_url: string, { signal }: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")));
  }));
  try {
    const notes = getReleaseViewNotes("v0.10.0");
    await jest.advanceTimersByTimeAsync(4000);
    expect(await notes).toBeNull();
  } finally { jest.useRealTimers(); }
});

it("cancels oversized responses before consuming the rest of the stream", async () => {
  const cancel = jest.fn();
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(128_001)); },
    cancel,
  });
  fetchMock.mockResolvedValue(new Response(body));
  expect(await getReleaseViewNotes("v0.10.0")).toBeNull();
  expect(cancel).toHaveBeenCalledTimes(1);
});

it("does not attach GitHub credentials to the public API request", async () => {
  fetchMock.mockResolvedValue(result({ version: "v0.10.0", summary: "Update" }));
  await getReleaseViewNotes("v0.10.0");
  expect(fetchMock.mock.calls[0][1].headers).toEqual({ Accept: "application/json" });
  expect(fetchMock.mock.calls[0][1].redirect).toBe("error");
});

it.each([
  ["v0.10.0", "v0.10.1"],
  ["v0.10.0", "v0.9.9"],
  ["v0.10.0", "v0.10.0-beta.1"],
  ["v0.10.0-beta.1", "v0.10.0"],
  ["v0.10.0-beta.1", "v0.10.0-beta.2"],
  ["v0.10.0+build.1", "v0.10.0+build.2"],
])("rejects %s notes when the API returns %s", async (requested, returned) => {
  fetchMock.mockResolvedValue(result({ version: returned, summary: "Wrong notes" }));
  expect(await getReleaseViewNotes(requested)).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it.each(["0.10.0", "v0.10.0", "Cozy Watch v0.10.0", "CozyWatch 0.10.0", " v0.10.0 ", "v0.10.0-beta.1", "v0.10.0+build.1"])("accepts an unambiguous release name: %s", async name => {
  const version = name.trim().split(" ").pop()!.replace(/^v/, "");
  fetchMock.mockResolvedValue(result({ version, summary: "Correct notes" }));
  expect(await getReleaseViewNotes(name)).toBe("Correct notes");
  expect(fetchMock.mock.calls[0][0]).toContain(`/releases/${encodeURIComponent(`v${version}`)}`);
});

it.each(["Updated from v0.9.8 to v0.10.0", "v0.10.0 and v0.11.0", "v0.10", "v0.10.0.1", "v00.10.0", "Cozy Watch update", "Other App v0.10.0"])("does not guess a version from %s", async name => {
  expect(await getReleaseViewNotes(name)).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("never falls back to latest or another release when the matching note is missing", async () => {
  fetchMock.mockImplementation(async () => new Response(null, { status: 404 }));
  expect(await getReleaseViewNotes("v0.10.0")).toBeNull();
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "https://www.releaseview.com/api/v1/projects/cozy-watch-dd6341/releases/v0.10.0",
    "https://www.releaseview.com/api/v1/projects/cozy-watch-dd6341/releases/0.10.0",
  ]);
});
