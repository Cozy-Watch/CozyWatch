import { sanitizeDiagnosticAttributes } from "./sanitize";

describe("sanitizeDiagnosticAttributes", () => {
  it("removes secrets and URL query parameters", () => {
    expect(
      sanitizeDiagnosticAttributes({
        accessToken: "secret-value",
        callback: "https://example.com/callback?code=secret",
        durationMs: 42,
      }),
    ).toEqual({
      accessToken: "[redacted]",
      callback: "https://example.com/callback?[redacted]",
      durationMs: 42,
    });
  });
});
