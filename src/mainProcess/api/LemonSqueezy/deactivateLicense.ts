import { deactivateLicense as lemonDeactivateLicense } from "@lemonsqueezy/lemonsqueezy.js";
import {
  getLicenseState,
  setLicenseState,
} from "../../licensing/licenseState";
import { createPersonalLicenseState } from "../../licensing/licenseState.utils";
import { deleteData, getData } from "../../safeStorage/safeStorage";

export const deactivateLicense = async () => {
  const [licenseKey, currentState] = await Promise.all([
    getData("licenseKey"),
    getLicenseState(),
  ]);

  if (!licenseKey) {
    return setLicenseState(createPersonalLicenseState());
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

  await deleteData("licenseKey");

  return setLicenseState(createPersonalLicenseState());
};
