import { redactDiagnosticValue } from "./redactDiagnosticValue";

describe("diagnostic value redaction", () => {
  it("redacts URL query parameters", () => {
    expect(
      redactDiagnosticValue(
        "Navigation failed: https://github.com/login/oauth/callback?code=secret&state=value",
      ),
    ).toBe(
      "Navigation failed: https://github.com/login/oauth/callback?[redacted]",
    );
  });

  it.each([
    "authorization=Bearer-secret",
    "token:github-token",
    "license_key=license-secret",
    "password=hunter2",
  ])("redacts credential-like diagnostic values: %s", (value) => {
    expect(redactDiagnosticValue(value)).not.toContain(value.split(/[=:]/)[1]);
    expect(redactDiagnosticValue(value)).toContain("[redacted]");
  });
});
