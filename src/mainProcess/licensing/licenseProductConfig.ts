export interface LicenseProductConfig {
  storeId: number | null;
  productIds: readonly number[];
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
export const COZYWATCH_LICENSE_PRODUCT_CONFIG: LicenseProductConfig = {
  storeId: 173903,
  productIds: [583215],
};

export const assertLicenseProductConfig = (
  config: LicenseProductConfig,
) => {
  if (config.storeId === null || config.productIds.length === 0) {
    throw new LicenseProductConfigurationError();
  }
};
