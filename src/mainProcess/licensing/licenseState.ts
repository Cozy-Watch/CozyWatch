import { getData, storeData } from "../safeStorage/safeStorage";
import { LicenseState, LicenseUsage } from "./licenseState.types";
import {
  createUnconfiguredLicenseState,
  isLicenseState,
  resolveTimeBasedLicenseState,
  selectCommercialUse,
  selectPersonalUse,
} from "./licenseState.utils";

export const setLicenseState = async (state: LicenseState) => {
  const saved = await storeData({ name: "licenseState", data: state });

  if (!saved) {
    throw new Error("Unable to save license state.");
  }

  return state;
};

export const getLicenseState = async (): Promise<LicenseState> => {
  const storedState = await getData("licenseState");

  if (isLicenseState(storedState)) {
    const resolvedState = resolveTimeBasedLicenseState(storedState);

    if (resolvedState.status !== storedState.status) {
      await setLicenseState(resolvedState);
    }

    return resolvedState;
  }

  const initialState = createUnconfiguredLicenseState();

  await setLicenseState(initialState);

  return initialState;
};

export const setLicenseUsage = async (
  usage: LicenseUsage,
): Promise<LicenseState> => {
  const currentState = await getLicenseState();
  const nextState =
    usage === "commercial"
      ? selectCommercialUse(currentState)
      : selectPersonalUse(currentState);

  return setLicenseState(nextState);
};

export const markExpiryReminderShown = async (): Promise<LicenseState> => {
  const currentState = await getLicenseState();

  if (currentState.status !== "expired") {
    return currentState;
  }

  return setLicenseState({
    ...currentState,
    lastExpiryReminderAt: new Date().toISOString(),
  });
};
