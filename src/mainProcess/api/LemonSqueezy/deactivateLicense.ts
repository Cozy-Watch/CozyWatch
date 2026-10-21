import { ipcMain } from "electron";
import { deactivateLicense as lemonDeactivateLicense } from "@lemonsqueezy/lemonsqueezy.js";
import {
  getLicenseState,
  setLicenseState,
} from "../../licensing/licenseState";
import { withoutActivation } from "../../licensing/licenseState.utils";
import { saveLicenseActivation, getData } from "../../safeStorage/safeStorage";

export const deactivateLicense = async () => {
  const [licenseKey, currentState] = await Promise.all([
    getData("licenseKey"),
    getLicenseState(),
  ]);

  if (!licenseKey) {
    return setLicenseState(withoutActivation(currentState));
  }

  if (!currentState.licenseInstanceId) {
    throw new Error(
      "This older license cannot be deactivated automatically. Contact tiago@cozywatch.com to transfer it.",
    );
  }

  const response = await lemonDeactivateLicense(
    licenseKey,
    currentState.licenseInstanceId,
  );

  if (response.error || !response.data || !response.data.deactivated) {
    throw new Error(
      response.error?.message ??
        response.data?.error ??
        "Unable to deactivate license.",
    );
  }

  const nextState = withoutActivation(currentState);
  await saveLicenseActivation(null, nextState);
  ipcMain.emit("dispatch-license-state", null, nextState);
  return nextState;
};
