import { ipcMain } from "electron";
import { getData, storeData, saveGitHubConnection } from "../safeStorage/safeStorage";
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
import { runLicenseMutation, runLicenseRead } from "./licenseCoordinator";
import type { AuthType } from "../safeStorage/safeStorage.types";
import { isOfficialBuild } from "./buildFlavor";

export const setLicenseState = async (state: LicenseState) => {
  if (!(await storeData({ name: "licenseState", data: state })))
    throw new Error("Unable to save license state.");
  ipcMain.emit("dispatch-license-state", null, state);
  return state;
};

let initialization: Promise<LicenseState> | null = null;
export const getLicenseState = (): Promise<LicenseState> => runLicenseRead(loadLicenseState);

const loadLicenseState = async (): Promise<LicenseState> => {
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

const trialForConnection = (state: LicenseState) =>
  state.status === "unconfigured" && !state.trialStartedAt
    ? createTrialLicenseState("new", new Date(), state) : state;

export const startTrialAfterGitHubConnection = () => runLicenseMutation("start-trial", async () => {
  const state = await getLicenseState();
  const next = trialForConnection(state);
  return next === state ? state : setLicenseState(next);
});

export const completeGitHubConnection = (token: string, authType: AuthType, isCurrent = () => true) =>
  runLicenseMutation(`github-connection:${authType}:${token}`, async () => {
    if (!isCurrent()) throw new Error("GitHub connection cancelled.");
    const state = trialForConnection(await getLicenseState());
    await saveGitHubConnection(token, authType, state.status === "community" ? undefined : state, isCurrent);
    ipcMain.emit("dispatch-license-state", null, state);
    return state;
  });

export const acceptTransitionTerms = () => runLicenseMutation("accept-transition", async () => {
  const state = await getLicenseState();
  if (!state.transitionPending) return state;
  return setLicenseState(
    createTrialLicenseState("transition", new Date(), state),
  );
});

export const markExpiryReminderShown = () => runLicenseMutation("expiry-reminder", async () => {
  const state = await getLicenseState();
  if (!shouldShowExpiryReminder(state)) return state;
  return setLicenseState({
    ...state,
    lastExpiryReminderAt: new Date().toISOString(),
  });
});

export const refreshLocalLicenseState = async () =>
  resolveTimeBasedLicenseState(await getLicenseState());
