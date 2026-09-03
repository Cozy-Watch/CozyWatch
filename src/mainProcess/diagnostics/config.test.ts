import { isDiagnosticsEnabled } from "./config";

describe("isDiagnosticsEnabled", () => {
  it.each([
    [{ isPackaged: false, isReleaseCandidateBuild: false }, true],
    [{ isPackaged: true, isReleaseCandidateBuild: true }, true],
    [{ isPackaged: true, isReleaseCandidateBuild: false }, false],
  ])("returns %s for %o", (input, expected) => {
    expect(isDiagnosticsEnabled(input)).toBe(expected);
  });
});
