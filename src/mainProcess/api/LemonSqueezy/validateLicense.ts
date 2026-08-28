import { validateLicense as lemonValidateLicense } from "@lemonsqueezy/lemonsqueezy.js";
import log from "electron-log";
import {
  getLicenseState,
  setLicenseState,
} from "../../licensing/licenseState";
import {
  assertLicenseProduct,
  createLicenseStateFromLemon,
} from "../../licensing/lemonLicense.utils";
import {
  assertLicenseProductConfig,
  COZYWATCH_LICENSE_PRODUCT_CONFIG,
  LicenseProductMismatchError,
} from "../../licensing/licenseProductConfig";
import { getData } from "../../safeStorage/safeStorage";

export const validateLicense = async () => {
  const startedAt = performance.now();
  const [licenseKey, currentState] = await Promise.all([
    getData("licenseKey"),
    getLicenseState(),
  ]);

  if (!licenseKey) {
    log.info("[License] No license key found in storage");
    return currentState;
  }

  try {
    assertLicenseProductConfig(COZYWATCH_LICENSE_PRODUCT_CONFIG);

    const response = await lemonValidateLicense(
      licenseKey,
      currentState.licenseInstanceId,
    );

    if (response.error || !response.data) {
      throw new Error(
        response.error?.message ?? "Unable to validate the license.",
      );
    }

    assertLicenseProduct(response.data, COZYWATCH_LICENSE_PRODUCT_CONFIG);

    const nextState = createLicenseStateFromLemon({
      data: response.data,
      previousState: currentState,
    });
    await setLicenseState(nextState);

    log.info("[License] validation complete", {
      durationMs: performance.now() - startedAt,
      status: nextState.status,
    });

    return nextState;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "License validation failed.";

    if (error instanceof LicenseProductMismatchError) {
      const invalidState = {
        ...currentState,
        status: "invalid" as const,
        lastValidatedAt: new Date().toISOString(),
        lastValidationError: message,
      };

      await setLicenseState(invalidState);
      return invalidState;
    }

    log.error("[License] validation failed; keeping local license state", {
      message,
    });

    await setLicenseState({
      ...currentState,
      lastValidationError: message,
    });

    throw error;
  }
};
