export interface LicenseProductConfig {
  storeId: number | null;
  productIds: readonly number[];
  lifetimeProductIds?: readonly number[];
  allowTestMode?: boolean;
}

export class LicenseProductConfigurationError extends Error {
  constructor() {
    super("CozyWatch license product verification is not configured.");
    this.name = "LicenseProductConfigurationError";
  }
}

export class LicenseProductMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LicenseProductMismatchError";
  }
}

// Lemon Squeezy store and product IDs are public identifiers, not secrets.
// Public Lemon Squeezy identifiers used to prevent licenses from other
// products from being activated as CozyWatch licenses.
const lifetimeProductId =
  typeof __COZYWATCH_LIFETIME_PRODUCT_ID__ !== "undefined"
    ? __COZYWATCH_LIFETIME_PRODUCT_ID__
    : null;
export const LEGACY_PRODUCT_IDS = [583215] as const;
export const COZYWATCH_LICENSE_PRODUCT_CONFIG: LicenseProductConfig = {
  allowTestMode:
    typeof __COZYWATCH_LICENSE_TEST_MODE__ !== "undefined" &&
    __COZYWATCH_LICENSE_TEST_MODE__,
  storeId: 173903,
  productIds: [
    ...LEGACY_PRODUCT_IDS,
    ...(lifetimeProductId ? [lifetimeProductId] : []),
  ],
  lifetimeProductIds: lifetimeProductId ? [lifetimeProductId] : [],
};

export const assertLicenseProductConfig = (config: LicenseProductConfig) => {
  if (config.storeId === null || config.productIds.length === 0) {
    throw new LicenseProductConfigurationError();
  }
};
