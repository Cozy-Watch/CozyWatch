/** @jest-environment jsdom */
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import { LicenseExpiryReminder } from "./LicenseExpiryReminder";
import type { LicenseState } from "../../../mainProcess/licensing/licenseState.types";

let container: HTMLDivElement;
let root: Root;
const manage = jest.fn();
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  manage.mockClear();
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const render = async (state: LicenseState) => {
  await act(async () => root.render(<Theme><LicenseExpiryReminder state={state} onManageLicense={manage} /></Theme>));
};
it("offers a quiet review action while transition consent is pending", async () => {
  await render({ schemaVersion: 2, status: "trial", trialKind: "transition", transitionPending: true });
  expect(container.querySelector('[role="note"]')?.textContent).toContain("30-day transition trial is ready");
  expect(container.querySelector(".rt-CalloutRoot")).toBeNull();
  const review = container.querySelector("button")!;
  await act(async () => review.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  expect(manage).toHaveBeenCalledTimes(1);
});
it("shows the stronger reminder only in the final three trial days", async () => {
  const state: LicenseState = { schemaVersion: 2, status: "trial", trialEndsAt: new Date(Date.now() + 10 * 86400000).toISOString() };
  await render(state);
  expect(container.textContent).toBe("");
  await render({ ...state, trialEndsAt: new Date(Date.now() + 2 * 86400000).toISOString() });
  expect(container.textContent).toContain("trial ends in 2 days");
  expect(container.querySelector(".rt-CalloutRoot")).not.toBeNull();
});
it("does not show a licensing reminder for a licensed user", async () => {
  await render({ schemaVersion: 2, status: "licensed" });
  expect(container.textContent).toBe("");
});
