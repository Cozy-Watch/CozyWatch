export const LICENSE_STATE_SCHEMA_VERSION = 2 as const;
export const TRIAL_DAYS = 14;
export const TRANSITION_TRIAL_DAYS = 30;
export const EXPIRY_REMINDER_INTERVAL_DAYS = 1;

export const LICENSE_STATUSES = [
  "unconfigured",
  "community",
  "trial",
  "licensed",
  "trial-ended",
  "revoked",
] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

export interface LicenseState {
  schemaVersion: typeof LICENSE_STATE_SCHEMA_VERSION;
  status: LicenseStatus;
  trialKind?: "new" | "transition";
  trialStartedAt?: string;
  trialEndsAt?: string;
  termsAcceptedAt?: string;
  transitionPending?: boolean;
  licenseInstanceId?: string;
  licenseProductId?: number;
  licenseVariantId?: number;
  licenseExpiresAt?: string;
  entitlement?: "lifetime" | "legacy";
  legacyMigrationPending?: boolean;
  lastValidatedAt?: string;
  lastValidationError?: string;
  lastExpiryReminderAt?: string;
}
