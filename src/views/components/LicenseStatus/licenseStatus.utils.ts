import type { LicenseState } from "../../../mainProcess/licensing/licenseState.types";

export const isDesktopLicensed = (state?: LicenseState) =>
  state?.status === "licensed" || state?.status === "community";
export const getLicenseStatusLabel = (state?: LicenseState) => {
  switch (state?.status) {
    case "licensed":
      return "Lifetime license";
    case "trial":
      return state.transitionPending ? "New terms" : "Full-feature trial";
    case "trial-ended":
      return "Trial ended";
    case "revoked":
      return "License needs attention";
    case "community":
      return "Community build";
    default:
      return "Ready to try";
  }
};
export const getTrialDaysRemaining = (state: LicenseState) => {
  if (state.status !== "trial" || !state.trialEndsAt) return null;
  return Math.max(
    0,
    Math.ceil((Date.parse(state.trialEndsAt) - Date.now()) / 86_400_000),
  );
};
