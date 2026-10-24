const RELEASES_URL = "https://www.releaseview.com/api/v1/projects/cozy-watch-dd6341/releases";
const REQUEST_TIMEOUT_MS = 4000;
const MAX_RESPONSE_LENGTH = 128_000;

const readBoundedBody = async (response: Response): Promise<string> => {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_LENGTH) throw new Error("Release notes exceed size limit");
      chunks.push(value);
    }
    return Buffer.concat(chunks, size).toString("utf8");
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

// Match the downloaded version, never the latest published note (which may differ).
export const getReleaseViewNotes = async (releaseName: string): Promise<string | null> => {
  // Forge publishes names as vX.Y.Z. Also accept an explicit app-name prefix.
  // Reject ambiguous titles instead of guessing which version they refer to.
  const version = typeof releaseName === "string"
    ? releaseName.trim().match(/^(?:(?:Cozy Watch|CozyWatch)\s+)?v?((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)$/)?.[1]
    : undefined;
  if (!version) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    for (const tag of [`v${version}`, version]) {
      const response = await fetch(`${RELEASES_URL}/${encodeURIComponent(tag)}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        redirect: "error",
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        if (response.status === 404) continue;
        return null;
      }
      const raw = await readBoundedBody(response);
      const payload: unknown = JSON.parse(raw);
      if (!isObject(payload) || !isObject(payload.release)) return null;
      const release = payload.release;
      if (text(release.version).replace(/^v/, "") !== version) return null;

      const sections = Array.isArray(release.sections) ? release.sections : [];
      const formattedSections = sections.flatMap((section: unknown) => {
        if (!isObject(section) || !Array.isArray(section.items)) return [];
        const items = section.items.map(text).filter(Boolean);
        if (!items.length) return [];
        return [[text(section.heading), ...items.map(item => `• ${item}`)].filter(Boolean).join("\n")];
      });
      const notes = [text(release.title), text(release.summary), ...formattedSections]
        .filter(Boolean).join("\n\n");
      return notes || null;
    }
    return null;
  } catch {
    // Editorial notes are optional; network errors must not block installation.
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
