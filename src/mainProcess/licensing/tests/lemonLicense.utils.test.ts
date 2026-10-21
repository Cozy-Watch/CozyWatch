import type { ValidateLicense } from "@lemonsqueezy/lemonsqueezy.js";
import { LICENSE_STATE_SCHEMA_VERSION } from "../licenseState.types";
import {
  assertLicenseProduct,
  createLicenseStateFromLemon,
} from "../lemonLicense.utils";

const createResponse = (
  overrides: Partial<ValidateLicense["license_key"]> = {},
): ValidateLicense => ({
  valid: true,
  error: null,
  license_key: {
    id: 10,
    status: "active",
    key: "test-key",
    activation_limit: 3,
    activation_usage: 1,
    created_at: "2026-08-01T00:00:00.000Z",
    expires_at: "2027-08-01T00:00:00.000Z",
    test_mode: true,
    ...overrides,
  },
  instance: {
    id: "instance-id",
    name: "CozyWatch on Mac",
    created_at: "2026-08-27T00:00:00.000Z",
  },
  meta: {
    store_id: 100,
    order_id: 200,
    order_item_id: 300,
    product_id: 583215,
    product_name: "CozyWatch",
    variant_id: 500,
    variant_name: "Annual",
    customer_id: 600,
    customer_name: "Customer",
    customer_email: "customer@example.com",
  },
});

describe("Lemon Squeezy license mapping", () => {
  const config = {
    allowTestMode: true,
    storeId: 100,
    productIds: [583215],
  } as const;

  it("accepts only the configured store and product", () => {
    expect(() => assertLicenseProduct(createResponse(), config)).not.toThrow();
    expect(() =>
      assertLicenseProduct(createResponse(), {
        allowTestMode: true,
        storeId: 999,
        productIds: [583215],
      }),
    ).toThrow("different store");
    expect(() =>
      assertLicenseProduct(createResponse(), {
        allowTestMode: true,
        storeId: 100,
        productIds: [999],
      }),
    ).toThrow("not for CozyWatch");
  });

  it("fails closed when product verification is not configured", () => {
    expect(() =>
      assertLicenseProduct(createResponse(), {
        storeId: null,
        productIds: [],
      }),
    ).toThrow("not configured");
  });

  it("maps a subscription license and stores its device instance", () => {
    const state = createLicenseStateFromLemon({
      data: createResponse(),
      previousState: {
        schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
        status: "unconfigured",
      },
      now: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(state).toMatchObject({
      status: "licensed",
      licenseInstanceId: "instance-id",
      licenseProductId: 583215,
      licenseVariantId: 500,
      licenseExpiresAt: undefined,
      legacyMigrationPending: true,
      lastValidatedAt: "2026-08-27T00:00:00.000Z",
    });
  });

  it("maps a non-expiring license as lifetime", () => {
    const state = createLicenseStateFromLemon({
      data: {
        ...createResponse({ expires_at: null }),
        meta: { ...createResponse().meta, product_id: 400 },
      },
      config: { storeId: 100, productIds: [400], lifetimeProductIds: [400] },
      previousState: {
        schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
        status: "unconfigured",
      },
    });

    expect(state.status).toBe("licensed");
  });

  it("keeps legacy access protected while migration is pending", () => {
    const state = createLicenseStateFromLemon({
      data: createResponse({ expires_at: "2027-08-01T00:00:00.000Z" }),
      previousState: {
        schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
        status: "licensed",
      },
      now: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(state.status).toBe("licensed");
  });

  it("preserves an expired annual purchase pending migration but honors revocation", () => {
    const previousState = {
      schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
      status: "licensed" as const,
      entitlement: "legacy" as const,
      legacyMigrationPending: true,
      licenseInstanceId: "instance-id",
    };
    const expired = { ...createResponse({ status: "expired" }), valid: false };
    expect(createLicenseStateFromLemon({ data: expired, previousState })).toMatchObject({
      status: "licensed",
      legacyMigrationPending: true,
      licenseExpiresAt: undefined,
    });
    const disabled = { ...createResponse({ status: "disabled" }), valid: false };
    expect(createLicenseStateFromLemon({ data: disabled, previousState }).status).toBe("revoked");
  });

  it("maps expired and disabled licenses without deleting their identity", () => {
    const expired = createResponse({ status: "expired" });
    expired.valid = false;

    const state = createLicenseStateFromLemon({
      data: expired,
      previousState: {
        schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
        status: "licensed",
        licenseInstanceId: "instance-id",
      },
    });

    expect(state.status).toBe("revoked");
    expect(state.licenseInstanceId).toBe("instance-id");
  });
});
