/** @jest-environment jsdom */
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import { LicenseSettings } from "./LicenseSettings";
import { CUSTOMER_ORDERS_URL, PURCHASE_HELP_URL, OPEN_SOURCE_CONTACT_URL } from "../../../shared/purchaseLinks";

jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock("../../api/useLicenseStatusQuery", () => ({ useLicenseStatusQuery: () => ({ data: { status: "licensed" }, isPending: false }), licenseStatusQueryKey: ["license"] }));
jest.mock("../../components/LicenseStatus/LicenseStatusCard", () => ({ LicenseStatusCard: () => null }));
jest.mock("../../components/LicenseModal/LicenseModal", () => ({ LicenseModal: () => null }));
const openExternalLink = jest.fn();
let container: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.assign(window, { electronAPI: { openExternalLink } });
  openExternalLink.mockReset().mockResolvedValue(undefined);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<Theme><LicenseSettings /></Theme>));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const click = async (label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(item => item.textContent?.trim() === label);
  if (!button) throw new Error(`Missing ${label}`);
  await act(async () => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
};
it("opens the configured orders, purchase-help, and open-source contact destinations", async () => {
  for (const [label, destination] of [["Find my purchase", CUSTOMER_ORDERS_URL], ["Purchase help", PURCHASE_HELP_URL], ["tiago@cozywatch.com", OPEN_SOURCE_CONTACT_URL]]) {
    await click(label);
    expect(openExternalLink).toHaveBeenLastCalledWith(destination);
  }
  expect(container.textContent).toContain("Working on open-source projects?");
});
it("explains a failed browser/email launch instead of silently ignoring it", async () => {
  openExternalLink.mockRejectedValue(new Error("No email app"));
  await click("Purchase help");
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("email tiago@cozywatch.com directly");
});
