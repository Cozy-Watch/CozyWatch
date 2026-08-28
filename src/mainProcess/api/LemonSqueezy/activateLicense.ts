import {
  activateLicense as lemonActivateLicense,
  deactivateLicense as lemonDeactivateLicense,
  validateLicense as lemonValidateLicense,
} from "@lemonsqueezy/lemonsqueezy.js";
import os from "node:os";
import { APP_NAME } from "../../keys";
import {
  getLicenseState,
  setLicenseState,
} from "../../licensing/licenseState";
import {
  assertLicenseProduct,
  createLicenseStateFromLemon,
} from "../../licensing/lemonLicense.utils";
import {
  assertLicenseProductConfig,
  COZYWATCH_LICENSE_PRODUCT_CONFIG,
} from "../../licensing/licenseProductConfig";
import {
  deleteData,
  getData,
  storeData,
} from "../../safeStorage/safeStorage";
import { validateLicense as validateStoredLicense } from "./validateLicense";

const getInstanceName = () => `${APP_NAME} on ${os.hostname()}`.slice(0, 255);

export const activateLicense = async (licenseKey: string) => {
  const trimmedLicenseKey = licenseKey.trim();

  if (!trimmedLicenseKey) {
    throw new Error("Enter a license key.");
  }

  assertLicenseProductConfig(COZYWATCH_LICENSE_PRODUCT_CONFIG);

  const existingLicenseKey = await getData("licenseKey");

  if (existingLicenseKey && existingLicenseKey !== trimmedLicenseKey) {
    throw new Error("Deactivate the current license before using another key.");
  }

  if (existingLicenseKey === trimmedLicenseKey) {
    return validateStoredLicense();
  }

  const preflight = await lemonValidateLicense(trimmedLicenseKey);

  if (preflight.error || !preflight.data) {
    throw new Error(preflight.error?.message ?? "Unable to validate license.");
  }

  assertLicenseProduct(preflight.data, COZYWATCH_LICENSE_PRODUCT_CONFIG);

  if (!preflight.data.valid) {
    throw new Error(preflight.data.error ?? "This license is not valid.");
  }

  const response = await lemonActivateLicense(
    trimmedLicenseKey,
    getInstanceName(),
  );

  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? "Unable to activate license.");
  }

  assertLicenseProduct(response.data, COZYWATCH_LICENSE_PRODUCT_CONFIG);

  if (!response.data.activated || !response.data.instance) {
    throw new Error(response.data.error ?? "Unable to activate license.");
  }

  const currentState = await getLicenseState();
  const nextState = createLicenseStateFromLemon({
    data: response.data,
    previousState: currentState,
  });
  const licenseKeySaved = await storeData({
    name: "licenseKey",
    data: trimmedLicenseKey,
  });

  if (!licenseKeySaved) {
    await lemonDeactivateLicense(
      trimmedLicenseKey,
      response.data.instance.id,
    );
    throw new Error("Unable to save the license key.");
  }

  try {
    await setLicenseState(nextState);
  } catch (error) {
    if (!existingLicenseKey) {
      await deleteData("licenseKey");
    }
    await lemonDeactivateLicense(
      trimmedLicenseKey,
      response.data.instance.id,
    );
    throw error;
  }

  return nextState;
};
