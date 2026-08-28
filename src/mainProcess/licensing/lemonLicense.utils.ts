import type {
  ActivateLicense,
  ValidateLicense,
} from "@lemonsqueezy/lemonsqueezy.js";
import {
  assertLicenseProductConfig,
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

  if (data.meta.store_id !== config.storeId) {
    throw new LicenseProductMismatchError(
      "This license belongs to a different store.",
    );
  }

  if (!config.productIds.includes(data.meta.product_id)) {
    throw new LicenseProductMismatchError(
      "This license is not for CozyWatch.",
    );
  }
};

export const createLicenseStateFromLemon = ({
  data,
  previousState,
  now = new Date(),
}: {
  data: LemonLicenseData;
  previousState: LicenseState;
  now?: Date;
}): LicenseState => {
  const valid = "activated" in data ? data.activated : data.valid;
  const baseState: LicenseState = {
    ...previousState,
    schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
    licenseInstanceId:
      data.instance?.id ?? previousState.licenseInstanceId,
    licenseProductId: data.meta.product_id,
    licenseVariantId: data.meta.variant_id,
    licenseExpiresAt: data.license_key.expires_at ?? undefined,
    lastValidatedAt: now.toISOString(),
    lastValidationError: undefined,
  };

  if (!valid || data.license_key.status === "disabled") {
    return {
      ...baseState,
      status:
        data.license_key.status === "expired" ? "expired" : "invalid",
      lastValidationError: data.error ?? "License validation failed.",
    };
  }

  const isLegacyLifetime =
    previousState.status === "lifetime-active" &&
    previousState.migratedFromLegacyKey;
  const isLifetime =
    isLegacyLifetime || data.license_key.expires_at === null;

  return resolveTimeBasedLicenseState(
    {
      ...baseState,
      status: isLifetime ? "lifetime-active" : "commercial-active",
    },
    now,
  );
};
