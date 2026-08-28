export const LICENSE_STATE_SCHEMA_VERSION = 1 as const;
export const COMMERCIAL_TRIAL_DAYS = 30;
export const EXPIRY_REMINDER_INTERVAL_DAYS = 14;

export const LICENSE_STATUSES = [
  "unconfigured",
  "personal",
  "commercial-trial",
  "commercial-active",
  "lifetime-active",
  "expired",
  "invalid",
] as const;

export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

export type LicenseUsage = "personal" | "commercial";

export interface LicenseState {
  schemaVersion: typeof LICENSE_STATE_SCHEMA_VERSION;
  status: LicenseStatus;
  trialStartedAt?: string;
  trialEndsAt?: string;
  licenseInstanceId?: string;
  licenseProductId?: number;
  licenseVariantId?: number;
  licenseExpiresAt?: string;
  lastValidatedAt?: string;
  lastValidationError?: string;
  lastExpiryReminderAt?: string;
}
