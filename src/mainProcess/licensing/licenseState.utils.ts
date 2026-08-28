import {
  COMMERCIAL_TRIAL_DAYS,
  EXPIRY_REMINDER_INTERVAL_DAYS,
  LICENSE_STATE_SCHEMA_VERSION,
  LICENSE_STATUSES,
  LicenseState,
} from "./licenseState.types";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export const createUnconfiguredLicenseState = (): LicenseState => ({
  schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
  status: "unconfigured",
});

export const createPersonalLicenseState = (): LicenseState => ({
  schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
  status: "personal",
});

export const createCommercialTrialLicenseState = (
  now = new Date(),
): LicenseState => ({
  schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
  status: "commercial-trial",
  trialStartedAt: now.toISOString(),
  trialEndsAt: new Date(
    now.getTime() + COMMERCIAL_TRIAL_DAYS * DAY_IN_MILLISECONDS,
  ).toISOString(),
});

export const isLicenseState = (value: unknown): value is LicenseState => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<LicenseState>;

  return (
    candidate.schemaVersion === LICENSE_STATE_SCHEMA_VERSION &&
    LICENSE_STATUSES.some((status) => status === candidate.status)
  );
};

export const resolveTimeBasedLicenseState = (
  state: LicenseState,
  now = new Date(),
): LicenseState => {
  if (state.status === "commercial-trial") {
    if (!state.trialEndsAt) {
      return { ...state, status: "invalid" };
    }

    const trialEndsAt = new Date(state.trialEndsAt);

    if (Number.isNaN(trialEndsAt.getTime())) {
      return { ...state, status: "invalid" };
    }

    if (trialEndsAt <= now) {
      return { ...state, status: "expired" };
    }
  }

  if (state.status === "commercial-active" && state.licenseExpiresAt) {
    const licenseExpiresAt = new Date(state.licenseExpiresAt);

    if (
      Number.isNaN(licenseExpiresAt.getTime()) ||
      licenseExpiresAt <= now
    ) {
      return { ...state, status: "expired" };
    }
  }

  return state;
};

export const selectPersonalUse = (state: LicenseState): LicenseState => {
  if (
    state.status === "commercial-active" ||
    state.status === "lifetime-active"
  ) {
    return state;
  }

  return {
    ...state,
    status: "personal",
    lastValidationError: undefined,
  };
};

export const selectCommercialUse = (
  state: LicenseState,
  now = new Date(),
): LicenseState => {
  if (
    state.status === "commercial-active" ||
    state.status === "lifetime-active" ||
    state.status === "commercial-trial"
  ) {
    return resolveTimeBasedLicenseState(state, now);
  }

  if (state.trialStartedAt && state.trialEndsAt) {
    return resolveTimeBasedLicenseState(
      { ...state, status: "commercial-trial" },
      now,
    );
  }

  if (state.status === "expired") {
    return state;
  }

  return createCommercialTrialLicenseState(now);
};

export const isCommercialUseLicensed = (state: LicenseState) =>
  state.status === "commercial-trial" ||
  state.status === "commercial-active" ||
  state.status === "lifetime-active";

export const shouldShowExpiryReminder = (
  state: LicenseState,
  now = new Date(),
) => {
  if (state.status !== "expired" || !state.lastExpiryReminderAt) {
    return state.status === "expired";
  }

  const lastReminderAt = new Date(state.lastExpiryReminderAt);

  if (Number.isNaN(lastReminderAt.getTime())) {
    return true;
  }

  return (
    now.getTime() - lastReminderAt.getTime() >=
    EXPIRY_REMINDER_INTERVAL_DAYS * DAY_IN_MILLISECONDS
  );
};
