import { getContentSecurityPolicy, isTrustedImageUrl } from "./contentSecurityPolicy";

describe("renderer content policy", () => {
  it("blocks active remote content in production", () => {
    const policy = getContentSecurityPolicy(false);
    expect(policy).toContain("script-src 'self';");
    expect(policy).toContain("frame-src 'none';");
    expect(policy).toContain("object-src 'none';");
    expect(policy).not.toMatch(/unsafe-eval|ws:|localhost/);
    expect(policy).not.toMatch(/img-src[^;]*https:(?:\s|;)/);
  });
  it("allows Vite hot reload in development", () => {
    expect(getContentSecurityPolicy(true)).toContain("ws:");
  });
  it.each([
    "https://github.com/user-attachments/assets/123",
    "https://raw.githubusercontent.com/example/project/main/image.png",
    "https://avatars.githubusercontent.com/u/123",
    "./docs/image.png",
  ])("allows a trusted image: %s", (url) => {
    expect(isTrustedImageUrl(url)).toBe(true);
  });
  it.each([
    "", "https://tracker.example/view.png", "//tracker.example/view.png",
    "https://github.com.attacker.example/image.png",
    "http://github.com/image.png", "https://attacker@github.com/image.png",
    "file:///etc/passwd", "javascript:alert(1)", "data:image/svg+xml,test",
  ])("blocks an untrusted image: %s", (url) => {
    expect(isTrustedImageUrl(url)).toBe(false);
  });
});
