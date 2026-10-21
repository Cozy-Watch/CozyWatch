import { ipcMain } from "electron";
import { getData, storeData } from "../safeStorage/safeStorage";
import {
  LICENSE_STATE_SCHEMA_VERSION,
  type LicenseState,
} from "./licenseState.types";
import {
  createTrialLicenseState,
  migrateLicenseState,
  resolveTimeBasedLicenseState,
  shouldShowExpiryReminder,
} from "./licenseState.utils";
import { isOfficialBuild } from "./buildFlavor";

export const setLicenseState = async (state: LicenseState) => {
  if (!(await storeData({ name: "licenseState", data: state })))
    throw new Error("Unable to save license state.");
  ipcMain.emit("dispatch-license-state", null, state);
  return state;
};

let initialization: Promise<LicenseState> | null = null;
export const getLicenseState = async (): Promise<LicenseState> => {
  if (!isOfficialBuild())
    return { schemaVersion: LICENSE_STATE_SCHEMA_VERSION, status: "community" };
  initialization ??= (async () => {
    const [stored, account] = await Promise.all([
      getData("licenseState"),
      getData("access_token"),
    ]);
    const state = migrateLicenseState(stored, !!account);
    if (JSON.stringify(state) !== JSON.stringify(stored))
      await setLicenseState(state);
    return state;
  })().catch((error) => {
    initialization = null;
    throw error;
  });
  await initialization;
  const stored = await getData("licenseState");
  const state = migrateLicenseState(stored, false);
  if (JSON.stringify(state) !== JSON.stringify(stored))
    await setLicenseState(state);
  return state;
};

let trialMutation: Promise<unknown> = Promise.resolve();
export const startTrialAfterGitHubConnection = async () => {
  trialMutation = trialMutation
    .catch(() => undefined)
    .then(async () => {
      const state = await getLicenseState();
      if (state.status !== "unconfigured" || state.trialStartedAt) return state;
      return setLicenseState(createTrialLicenseState("new", new Date(), state));
    });
  return trialMutation;
};

export const acceptTransitionTerms = async () => {
  const state = await getLicenseState();
  if (!state.transitionPending) return state;
  return setLicenseState(
    createTrialLicenseState("transition", new Date(), state),
  );
};

export const markExpiryReminderShown = async () => {
  const state = await getLicenseState();
  if (!shouldShowExpiryReminder(state)) return state;
  return setLicenseState({
    ...state,
    lastExpiryReminderAt: new Date().toISOString(),
  });
};

export const refreshLocalLicenseState = async () =>
  resolveTimeBasedLicenseState(await getLicenseState());
