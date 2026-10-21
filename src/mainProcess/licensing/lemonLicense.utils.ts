import type {
  ActivateLicense,
  ValidateLicense,
} from "@lemonsqueezy/lemonsqueezy.js";
import {
  assertLicenseProductConfig,
  COZYWATCH_LICENSE_PRODUCT_CONFIG,
  LEGACY_PRODUCT_IDS,
  LicenseProductConfig,
  LicenseProductMismatchError,
} from "./licenseProductConfig";
import {
  LICENSE_STATE_SCHEMA_VERSION,
  LicenseState,
} from "./licenseState.types";
import { resolveTimeBasedLicenseState } from "./licenseState.utils";

type LemonLicenseData = ActivateLicense | ValidateLicense;

export const assertLicenseProduct = (
  data: LemonLicenseData,
  config: LicenseProductConfig,
) => {
  assertLicenseProductConfig(config);
  if (data.license_key.test_mode && !config.allowTestMode) {
    throw new LicenseProductMismatchError(
      "Test keys can only be used in a licensing test build.",
    );
  }

  if (data.meta.store_id !== config.storeId) {
    throw new LicenseProductMismatchError(
      "This license belongs to a different store.",
    );
  }

  if (!config.productIds.includes(data.meta.product_id)) {
    throw new LicenseProductMismatchError("This license is not for CozyWatch.");
  }
};

export const createLicenseStateFromLemon = ({
  data,
  previousState,
  now = new Date(),
  config = COZYWATCH_LICENSE_PRODUCT_CONFIG,
}: {
  data: LemonLicenseData;
  previousState: LicenseState;
  now?: Date;
  config?: LicenseProductConfig;
}): LicenseState => {
  const valid = "activated" in data ? data.activated : data.valid;
  const baseState: LicenseState = {
    ...previousState,
    schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
    licenseInstanceId: data.instance?.id ?? previousState.licenseInstanceId,
    licenseProductId: data.meta.product_id,
    licenseVariantId: data.meta.variant_id,
    licenseExpiresAt: data.license_key.expires_at ?? undefined,
    lastValidatedAt: now.toISOString(),
    lastValidationError: undefined,
  };

  const isLegacy = LEGACY_PRODUCT_IDS.includes(data.meta.product_id as 583215);
  if (
    isLegacy &&
    data.license_key.status === "expired" &&
    previousState.status === "licensed" &&
    previousState.entitlement === "legacy" &&
    previousState.legacyMigrationPending === true
  ) {
    return {
      ...baseState,
      status: "licensed",
      licenseExpiresAt: undefined,
      lastValidationError: undefined,
    };
  }

  if (!valid || data.license_key.status === "disabled") {
    return {
      ...baseState,
      status: "revoked",
      lastValidationError: data.error ?? "License validation failed.",
    };
  }

  const isLifetime =
    config.lifetimeProductIds?.includes(data.meta.product_id) &&
    data.license_key.expires_at === null;
  if (!isLifetime && !isLegacy)
    throw new LicenseProductMismatchError(
      "This product does not grant a lifetime desktop license.",
    );
  if (!data.instance?.id && !previousState.licenseInstanceId)
    throw new Error("Activate this license on this Mac first.");

  return resolveTimeBasedLicenseState(
    {
      ...baseState,
      status: "licensed",
      entitlement: isLifetime ? "lifetime" : "legacy",
      legacyMigrationPending:
        previousState.legacyMigrationPending === true ||
        (isLegacy && previousState.legacyMigrationPending !== false),
      licenseExpiresAt: undefined,
    },
    now,
  );
};
