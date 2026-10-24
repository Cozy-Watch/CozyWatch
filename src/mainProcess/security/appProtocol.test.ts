jest.mock("electron", () => ({ net: {}, protocol: {} }));
import { resolveAppResource } from "./appProtocol";
import { isAllowedRendererUrl } from "./externalUrl";
jest.mock("electron-log/main", () => ({ warn: jest.fn() }));
it("serves only renderer resources under the app host", () => {
  expect(resolveAppResource("cozy-watch://app/assets/index.js", "/renderer")).toBe("/renderer/assets/index.js");
  for (const url of ["cozy-watch://other/index.html", "file:///etc/passwd", "cozy-watch://app/..%2f..%2fsecret", "cozy-watch://app/%00", "cozy-watch://user@app/index.html"]) {
    expect(() => resolveAppResource(url, "/renderer")).toThrow();
  }
});
it("does not trust other null-origin protocols or arbitrary app documents", () => {
  const allowed = "cozy-watch://app/index.html";
  expect(isAllowedRendererUrl(`${allowed}#/overview`, allowed)).toBe(true);
  expect(isAllowedRendererUrl("cozy-watch://app/other.html", allowed)).toBe(false);
  expect(isAllowedRendererUrl("attacker://app/index.html", allowed)).toBe(false);
});
