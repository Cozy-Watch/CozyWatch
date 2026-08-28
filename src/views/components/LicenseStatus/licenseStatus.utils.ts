import type { LicenseState } from "../../../mainProcess/licensing/licenseState.types";

export const isCommercialUseLicensed = (state?: LicenseState) =>
  state?.status === "commercial-trial" ||
  state?.status === "commercial-active" ||
  state?.status === "lifetime-active";

export const getLicenseStatusLabel = (state?: LicenseState) => {
  switch (state?.status) {
    case "commercial-trial":
      return "Commercial Trial";
    case "commercial-active":
      return "Commercial";
    case "lifetime-active":
      return "Lifetime Commercial";
    case "personal":
    case "expired":
    case "invalid":
    case "unconfigured":
    default:
      return "Personal Use Only";
  }
};

export const getTrialDaysRemaining = (state: LicenseState) => {
  if (state.status !== "commercial-trial" || !state.trialEndsAt) {
    return null;
  }

  const trialEndsAt = new Date(state.trialEndsAt);
  const remaining = trialEndsAt.getTime() - Date.now();

  if (Number.isNaN(trialEndsAt.getTime()) || remaining <= 0) {
    return 0;
  }

  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
};

export const hasStartedCommercialTrial = (state: LicenseState) =>
  Boolean(state.trialStartedAt || state.trialEndsAt);
