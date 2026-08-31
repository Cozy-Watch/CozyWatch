jest.mock("electron", () => ({
  shell: {
    openExternal: jest.fn(),
  },
}));

import { shell } from "electron";
import {
  isAllowedRendererUrl,
  isSafeExternalUrl,
  openExternalUrl,
} from "./externalUrl";

const openExternalMock = jest.mocked(shell.openExternal);

describe("external URL security", () => {
  beforeEach(() => {
    openExternalMock.mockReset();
    openExternalMock.mockResolvedValue(undefined);
  });

  it.each([
    "https://github.com/Cozy-Watch/CozyWatch/pull/1",
    "https://www.cozywatch.com/changelog/",
    "https://cozywatch.com/",
    "mailto:tiago@cozywatch.com",
  ])("allows an expected destination: %s", (url) => {
    expect(isSafeExternalUrl(url)).toBe(true);
  });

  it.each([
    "http://github.com/Cozy-Watch/CozyWatch",
    "https://github.com.attacker.example/phishing",
    "https://example.com/",
    "javascript:alert(1)",
    "file:///tmp/untrusted",
    "mailto:attacker@example.com",
    "mailto:tiago@cozywatch.com?body=untrusted",
  ])("blocks an unexpected destination: %s", (url) => {
    expect(isSafeExternalUrl(url)).toBe(false);
  });

  it("does not pass a blocked destination to the operating system", async () => {
    await expect(openExternalUrl("https://example.com/")).rejects.toThrow(
      "not allowed",
    );
    expect(openExternalMock).not.toHaveBeenCalled();
  });

  it("allows only the exact trusted data renderer page", () => {
    const trustedRendererUrl = "data:text/html,Cozy%20Watch";

    expect(isAllowedRendererUrl(trustedRendererUrl, trustedRendererUrl)).toBe(
      true,
    );
    expect(
      isAllowedRendererUrl("data:text/html,Unexpected", trustedRendererUrl),
    ).toBe(false);
  });
});
