/** @jest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import { PagedList } from "./PagedList";
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div"); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); });
const render = async (length: number, scope = "my") => {
  await act(async () => root.render(<Theme><PagedList key={scope} items={Array.from({length}, (_, id) => id)} getKey={id => id} renderItem={id => <article>PR {id + 1}</article>}/></Theme>));
};
const click = async (label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(button => button.textContent === label)!;
  await act(async () => button.dispatchEvent(new MouseEvent("click", {bubbles: true})));
};
it("bounds mounted cards and makes every result reachable", async () => {
  await render(65);
  expect(container.querySelectorAll("article")).toHaveLength(30);
  expect(container.textContent).toContain("1–30 of 65");
  await click("Next");
  expect(container.querySelectorAll("article")).toHaveLength(30);
  expect(container.textContent).toContain("31–60 of 65");
  await click("Next");
  expect(container.querySelectorAll("article")).toHaveLength(5);
  expect(container.textContent).toContain("PR 65");
  expect(Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Next")!.disabled).toBe(true);
  await click("Previous");
  expect(container.textContent).toContain("31–60 of 65");
});
it("handles shrinking lists and resets when changing scope", async () => {
  await render(65); await click("Next"); await click("Next");
  await render(35);
  expect(container.querySelectorAll("article")).toHaveLength(5);
  expect(container.textContent).toContain("31–35 of 35");
  await render(65);
  expect(container.textContent).toContain("31–60 of 65");
  await render(65, "team");
  expect(container.textContent).toContain("1–30 of 65");
});
it("avoids pagination controls for small lists", async () => {
  await render(5);
  expect(container.querySelectorAll("article")).toHaveLength(5);
  expect(container.querySelector("button")).toBeNull();
});
