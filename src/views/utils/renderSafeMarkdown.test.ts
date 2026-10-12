/** @jest-environment jsdom */
import { renderSafeMarkdown } from "./renderSafeMarkdown";

describe("markdown image privacy", () => {
  it("removes tracking images and alternative picture sources", () => {
    const container = document.createElement("div");
    container.innerHTML = renderSafeMarkdown(
      '<picture><source srcset="https://tracker.example/view.png"><img src="https://raw.githubusercontent.com/example/project/main/image.png" srcset="https://tracker.example/other.png"></picture><img alt="tracking" src="https://tracker.example/view.png">',
    );
    expect(container.querySelector("source, [srcset]")).toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.querySelector("img")?.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(container.textContent).toContain("Image unavailable: tracking");
  });
});
