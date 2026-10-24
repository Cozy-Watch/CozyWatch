import {
  TRIAL_DAYS,
  TRANSITION_TRIAL_DAYS,
  LICENSE_STATE_SCHEMA_VERSION,
  LICENSE_STATUSES,
  type LicenseState,
} from "./licenseState.types";

const DAY = 86_400_000;
const validDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
export const createUnconfiguredLicenseState = (): LicenseState => ({
  schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
  status: "unconfigured",
});

export const createTrialLicenseState = (
  kind: "new" | "transition",
  now = new Date(),
  previous = createUnconfiguredLicenseState(),
): LicenseState => ({
  ...previous,
  status: "trial",
  trialKind: kind,
  transitionPending: false,
  trialStartedAt: now.toISOString(),
  trialEndsAt: new Date(
    now.getTime() + (kind === "new" ? TRIAL_DAYS : TRANSITION_TRIAL_DAYS) * DAY,
  ).toISOString(),
  ...(kind === "transition" ? { termsAcceptedAt: now.toISOString() } : {}),
});

export const isLicenseState = (value: unknown): value is LicenseState => {
  if (!value || typeof value !== "object") return false;
  const state = value as LicenseState;
  if (
    state.schemaVersion !== LICENSE_STATE_SCHEMA_VERSION ||
    !LICENSE_STATUSES.includes(state.status)
  )
    return false;
  if (
    state.status === "licensed" &&
    (!state.licenseInstanceId ||
      !state.licenseProductId ||
      !validDate(state.lastValidatedAt))
  )
    return false;
  if (
    state.status === "trial" &&
    !state.transitionPending &&
    (!validDate(state.trialStartedAt) || !validDate(state.trialEndsAt))
  )
    return false;
  return true;
};

export const resolveTimeBasedLicenseState = (
  state: LicenseState,
  now = new Date(),
): LicenseState => {
  if (state.status !== "trial" || state.transitionPending) return state;
  if (
    !state.trialEndsAt ||
    !validDate(state.trialEndsAt) ||
    Date.parse(state.trialEndsAt) <= now.getTime()
  )
    return { ...state, status: "trial-ended" };
  return state;
};

export const canUseDesktop = (state: LicenseState, now = new Date()) =>
  ["community", "licensed", "trial"].includes(
    resolveTimeBasedLicenseState(state, now).status,
  );
export const shouldShowExpiryReminder = (
  state: LicenseState,
  now = new Date(),
) => {
  if (state.status !== "trial" || !state.trialEndsAt || state.transitionPending)
    return false;
  const remaining = Date.parse(state.trialEndsAt) - now.getTime();
  if (remaining <= 0 || remaining > 3 * DAY) return false;
  return (
    !state.lastExpiryReminderAt ||
    now.getTime() - Date.parse(state.lastExpiryReminderAt) >= DAY
  );
};

// Never infer a new trial for an existing installation or discard a paid entitlement on update.
export const migrateLicenseState = (
  stored: unknown,
  hasExistingAccount: boolean,
): LicenseState => {
  if (isLicenseState(stored)) return resolveTimeBasedLicenseState(stored);
  const previous =
    stored && typeof stored === "object"
      ? (stored as Record<string, unknown>)
      : {};
  if (
    previous.schemaVersion === 1 &&
    ["commercial-active", "lifetime-active"].includes(
      String(previous.status),
    ) &&
    previous.licenseInstanceId &&
    previous.licenseProductId &&
    validDate(previous.lastValidatedAt)
  ) {
    return {
      ...previous,
      schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
      status: "licensed",
      entitlement:
        previous.status === "lifetime-active" ? "lifetime" : "legacy",
      legacyMigrationPending: previous.status === "commercial-active",
    } as LicenseState;
  }
  const existing =
    hasExistingAccount ||
    (previous.schemaVersion === 1 && previous.status !== "unconfigured");
  if (existing)
    return {
      ...createUnconfiguredLicenseState(),
      status: "trial",
      trialKind: "transition",
      transitionPending: true,
    };
  return createUnconfiguredLicenseState();
};

export const withoutActivation = (state: LicenseState): LicenseState => {
  // Preserve trial eligibility and transition consent when transferring a device.
  const next: LicenseState = {
    schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
    status: "trial-ended",
    trialKind: state.trialKind,
    trialStartedAt: state.trialStartedAt,
    trialEndsAt: state.trialEndsAt,
    termsAcceptedAt: state.termsAcceptedAt,
    transitionPending: state.transitionPending,
  };
  if (next.transitionPending || next.trialEndsAt) next.status = "trial";
  return resolveTimeBasedLicenseState(next);
};
