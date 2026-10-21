import { ipcMain } from "electron";
import {
  activateLicense as lemonActivateLicense,
  deactivateLicense as lemonDeactivateLicense,
  validateLicense as lemonValidateLicense,
} from "@lemonsqueezy/lemonsqueezy.js";
import os from "node:os";
import { APP_NAME } from "../../keys";
import {
  getLicenseState,
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
  getData,
  saveLicenseActivation,
} from "../../safeStorage/safeStorage";
import { validateLicense as validateStoredLicense } from "./validateLicense";

const getInstanceName = () => `${APP_NAME} on ${os.hostname()}`.slice(0, 255);

export const activateLicense = async (licenseKey: string) => {
  const trimmedLicenseKey = licenseKey.trim();

  if (!trimmedLicenseKey) {
    throw new Error("Enter a license key.");
  }

  assertLicenseProductConfig(COZYWATCH_LICENSE_PRODUCT_CONFIG);

  const currentState = await getLicenseState();
  if (currentState.status === "community") throw new Error("Community builds do not require a paid license.");
  const existingLicenseKey = await getData("licenseKey");

  if (existingLicenseKey && existingLicenseKey !== trimmedLicenseKey && currentState.status === "licensed") {
    throw new Error("Deactivate the current license before using another key.");
  }

  if (existingLicenseKey === trimmedLicenseKey) {
    const state = await validateStoredLicense();
    if (state.status !== "licensed") throw new Error("This key is no longer active. Enter another key or contact purchase support.");
    return state;
  }

  const preflight = await lemonValidateLicense(trimmedLicenseKey);

  if (preflight.error || !preflight.data) {
    throw new Error(preflight.data?.error ?? "Unable to validate this key. Check the key and your connection, then try again.");
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
    throw new Error(response.data?.error ?? "Unable to activate this key. Check your connection and try again.");
  }

  assertLicenseProduct(response.data, COZYWATCH_LICENSE_PRODUCT_CONFIG);

  if (!response.data.activated || !response.data.instance) {
    throw new Error(response.data.error ?? "Unable to activate license.");
  }

  const nextState = createLicenseStateFromLemon({
    data: response.data,
    previousState: currentState,
  });
  try {
    await saveLicenseActivation(trimmedLicenseKey, nextState);
  } catch (error) {
    await lemonDeactivateLicense(trimmedLicenseKey, response.data.instance.id);
    throw error;
  }
  ipcMain.emit("dispatch-license-state", null, nextState);
  return nextState;
};
