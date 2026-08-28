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
    product_id: 400,
    product_name: "CozyWatch",
    variant_id: 500,
    variant_name: "Annual",
    customer_id: 600,
    customer_name: "Customer",
    customer_email: "customer@example.com",
  },
});

describe("Lemon Squeezy license mapping", () => {
  const config = { storeId: 100, productIds: [400] } as const;

  it("accepts only the configured store and product", () => {
    expect(() => assertLicenseProduct(createResponse(), config)).not.toThrow();
    expect(() =>
      assertLicenseProduct(createResponse(), {
        storeId: 999,
        productIds: [400],
      }),
    ).toThrow("different store");
    expect(() =>
      assertLicenseProduct(createResponse(), {
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
        status: "commercial-trial",
      },
      now: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(state).toMatchObject({
      status: "commercial-active",
      licenseInstanceId: "instance-id",
      licenseProductId: 400,
      licenseVariantId: 500,
      licenseExpiresAt: "2027-08-01T00:00:00.000Z",
      lastValidatedAt: "2026-08-27T00:00:00.000Z",
    });
  });

  it("maps a non-expiring license as lifetime", () => {
    const state = createLicenseStateFromLemon({
      data: createResponse({ expires_at: null }),
      previousState: {
        schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
        status: "unconfigured",
      },
    });

    expect(state.status).toBe("lifetime-active");
  });

  it("uses the server expiration instead of trusting previous lifetime status", () => {
    const state = createLicenseStateFromLemon({
      data: createResponse({ expires_at: "2027-08-01T00:00:00.000Z" }),
      previousState: {
        schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
        status: "lifetime-active",
      },
      now: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(state.status).toBe("commercial-active");
  });

  it("maps expired and disabled licenses without deleting their identity", () => {
    const expired = createResponse({ status: "expired" });
    expired.valid = false;

    const state = createLicenseStateFromLemon({
      data: expired,
      previousState: {
        schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
        status: "commercial-active",
        licenseInstanceId: "instance-id",
      },
    });

    expect(state.status).toBe("expired");
    expect(state.licenseInstanceId).toBe("instance-id");
  });
});
