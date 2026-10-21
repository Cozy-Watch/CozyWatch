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
import { readLicenseSnapshot, commitLicenseValidation } from "../../licensing/licenseCoordinator";
import type { LicenseState } from "../../licensing/licenseState.types";
import { getData } from "../../safeStorage/safeStorage";

const readActivation = () => Promise.all([getData("licenseKey"), getLicenseState()]);

export const validateLicense = async () => {
  const { value: [licenseKey, currentState], version } = await readLicenseSnapshot(readActivation);
  return validateSnapshot(licenseKey, currentState, state =>
    commitLicenseValidation(version, () => setLicenseState(state), getLicenseState));
};

// Used only while activation already holds the mutation queue.
export const validateLicenseDuringActivation = async () => {
  const [licenseKey, state] = await readActivation();
  return validateSnapshot(licenseKey, state, setLicenseState);
};

const validateSnapshot = async (
  licenseKey: string | null,
  currentState: LicenseState,
  commit: (state: LicenseState) => Promise<LicenseState>,
) => {
  const startedAt = performance.now();
  if (currentState.status === "community") return currentState;
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

    // A structured rejection is authoritative even when returned with a 4xx.
    const rejection = response.data;
    if (rejection && rejection.valid === false && rejection.license_key && rejection.meta && response.statusCode !== 429 && (response.statusCode ?? 500) < 500) {
      assertLicenseProduct(rejection, COZYWATCH_LICENSE_PRODUCT_CONFIG);
      return commit(createLicenseStateFromLemon({ data: rejection, previousState: currentState }));
    }
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
    const savedState = await commit(nextState);

    log.info("[License] validation complete", {
      durationMs: performance.now() - startedAt,
      status: nextState.status,
    });

    return savedState;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "License validation failed.";

    if (error instanceof LicenseProductMismatchError) {
      const invalidState = {
        ...currentState,
        status: "revoked" as const,
        lastValidatedAt: new Date().toISOString(),
        lastValidationError: message,
      };

      return commit(invalidState);
    }

    log.error("[License] validation failed; keeping local license state", {
      message,
    });

    return commit({
      ...currentState,
      lastValidationError: currentState.status === "licensed"
        ? "Unable to reach the licensing service. Your saved activation remains valid; we will retry automatically."
        : "Unable to reach the licensing service. Your trial dates have not changed; we will retry automatically.",
    });
  }
};
