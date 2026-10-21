jest.mock("electron", () => ({ ipcMain: { emit: jest.fn() } }));
jest.mock("electron-log", () => ({ info: jest.fn(), error: jest.fn() }));
jest.mock("@lemonsqueezy/lemonsqueezy.js", () => ({
  activateLicense: jest.fn(),
  validateLicense: jest.fn(),
  deactivateLicense: jest.fn(),
}));
jest.mock("../../safeStorage/safeStorage", () => ({
  getData: jest.fn(),
  saveLicenseActivation: jest.fn(),
}));
jest.mock("../licenseState", () => ({
  getLicenseState: jest.fn(),
  setLicenseState: jest.fn(),
}));
jest.mock("../licenseProductConfig", () => ({
  ...jest.requireActual("../licenseProductConfig"),
  COZYWATCH_LICENSE_PRODUCT_CONFIG: {
    storeId: 100,
    productIds: [400],
    lifetimeProductIds: [400],
  },
}));
import {
  activateLicense as remoteActivate,
  validateLicense as remoteValidate,
  deactivateLicense as remoteDeactivate,
} from "@lemonsqueezy/lemonsqueezy.js";
import { activateLicense } from "../../api/LemonSqueezy/activateLicense";
import { deactivateLicense } from "../../api/LemonSqueezy/deactivateLicense";
import { validateLicense } from "../../api/LemonSqueezy/validateLicense";
import { getData, saveLicenseActivation } from "../../safeStorage/safeStorage";
import { getLicenseState, setLicenseState } from "../licenseState";
import type { LicenseState } from "../licenseState.types";
let state: LicenseState;
let key: string | null;
const response = () => ({
  statusCode: 200,
  error: null,
  data: {
    valid: true,
    activated: true,
    error: null,
    license_key: { status: "active", expires_at: null, test_mode: false },
    instance: { id: "synthetic-device" },
    meta: { store_id: 100, product_id: 400, variant_id: 500 },
  },
});
beforeEach(() => {
  jest.resetAllMocks();
  state = {
    schemaVersion: 2,
    status: "licensed",
    entitlement: "lifetime",
    licenseInstanceId: "synthetic-device",
    licenseProductId: 400,
    lastValidatedAt: "2026-10-20T00:00:00Z",
  };
  key = "synthetic-key";
  (getData as jest.Mock).mockImplementation(async () => key);
  (getLicenseState as jest.Mock).mockImplementation(async () => state);
  (setLicenseState as jest.Mock).mockImplementation(async (value) => {
    state = value;
    return value;
  });
  (remoteValidate as jest.Mock).mockResolvedValue(response());
  (remoteActivate as jest.Mock).mockResolvedValue(response());
  (remoteDeactivate as jest.Mock).mockResolvedValue({
    data: { deactivated: true },
    error: null,
  });
});
it.each([null, 429, 503])(
  "preserves lifetime activation when the service is unavailable (%s)",
  async (statusCode) => {
    (remoteValidate as jest.Mock).mockResolvedValue({
      statusCode,
      error: new Error("Unavailable"),
      data: null,
    });
    expect((await validateLicense()).status).toBe("licensed");
    expect(state.lastValidationError).toContain(
      "saved activation remains valid",
    );
    expect(saveLicenseActivation).not.toHaveBeenCalled();
  },
);
it("recognizes an authoritative revocation even on an HTTP rejection", async () => {
  const revoked = response();
  revoked.statusCode = 400;
  revoked.data.valid = false;
  revoked.data.license_key.status = "disabled";
  (remoteValidate as jest.Mock).mockResolvedValue({
    ...revoked,
    error: new Error("Bad Request"),
  });
  expect((await validateLicense()).status).toBe("revoked");
});
it("allows replacing a revoked key without reconnecting GitHub", async () => {
  state.status = "revoked";
  expect((await activateLicense("synthetic-new-key")).status).toBe("licensed");
  expect(saveLicenseActivation).toHaveBeenCalledWith(
    "synthetic-new-key",
    expect.objectContaining({ status: "licensed" }),
  );
});
it("preserves activation limits as an actionable error without saving a key", async () => {
  key = null;
  state.status = "trial";
  (remoteActivate as jest.Mock).mockResolvedValue({
    statusCode: 400,
    error: new Error("Bad Request"),
    data: {
      activated: false,
      error: "This license key has reached the activation limit.",
    },
  });
  await expect(activateLicense("synthetic-new-key")).rejects.toThrow(
    "activation limit",
  );
  expect(saveLicenseActivation).not.toHaveBeenCalled();
});
it("releases the server instance when local persistence fails", async () => {
  key = null;
  state.status = "trial";
  (saveLicenseActivation as jest.Mock).mockRejectedValue(
    new Error("Disk full"),
  );
  await expect(activateLicense("synthetic-new-key")).rejects.toThrow(
    "Disk full",
  );
  expect(remoteDeactivate).toHaveBeenCalledWith(
    "synthetic-new-key",
    "synthetic-device",
  );
});
it("deactivates the device without granting another trial", async () => {
  state.trialStartedAt = "2026-01-01T00:00:00Z";
  state.trialEndsAt = "2026-01-15T00:00:00Z";
  expect((await deactivateLicense()).status).toBe("trial-ended");
  expect(saveLicenseActivation).toHaveBeenCalledWith(
    null,
    expect.objectContaining({ trialStartedAt: state.trialStartedAt }),
  );
});
it("rejects test purchases in a production licensing build", async () => {
  key = null;
  const test = response();
  test.data.license_key.test_mode = true;
  (remoteValidate as jest.Mock).mockResolvedValue(test);
  await expect(activateLicense("synthetic-test-key")).rejects.toThrow(
    "Test keys",
  );
});

it("ignores delayed validation after successful deactivation", async () => {
  let finish: (value: ReturnType<typeof response>) => void = () => undefined;
  (remoteValidate as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  (saveLicenseActivation as jest.Mock).mockImplementation(async (nextKey, nextState) => { key = nextKey; state = nextState; });
  const validation = validateLicense();
  await new Promise(resolve => setImmediate(resolve));
  expect(remoteValidate).toHaveBeenCalledTimes(1);
  await deactivateLicense();
  expect(key).toBeNull();
  expect(state.status).not.toBe("licensed");
  finish(response());
  await validation;
  expect(state.status).not.toBe("licensed");
  expect(key).toBeNull();
});
it("coalesces overlapping activation requests for the same key", async () => {
  key = null; state.status = "trial";
  await Promise.all([activateLicense("synthetic-key"), activateLicense("synthetic-key")]);
  expect(remoteActivate).toHaveBeenCalledTimes(1);
  expect(saveLicenseActivation).toHaveBeenCalledTimes(1);
});

it.each(["unavailable", "revoked", "wrong-product"])("ignores stale %s responses after deactivation", async (outcome) => {
  let finish: (value: unknown) => void = () => undefined;
  (remoteValidate as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  (saveLicenseActivation as jest.Mock).mockImplementation(async (nextKey, nextState) => { key = nextKey; state = nextState; });
  const validation = validateLicense();
  await new Promise(resolve => setImmediate(resolve));
  await deactivateLicense();
  const deactivated = state;
  const result = response();
  if (outcome === "revoked") { result.data.valid = false; result.data.license_key.status = "disabled"; }
  if (outcome === "wrong-product") result.data.meta.product_id = 999;
  finish(outcome === "unavailable" ? { error: new Error("Offline"), data: null } : result);
  expect(await validation).toEqual(deactivated);
  expect(state).toEqual(deactivated);
});
it("rejects an older valid response after a newer revocation response", async () => {
  let finish: (value: unknown) => void = () => undefined;
  (remoteValidate as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const old = validateLicense();
  await new Promise(resolve => setImmediate(resolve));
  const revoked = response(); revoked.data.valid = false; revoked.data.license_key.status = "disabled";
  (remoteValidate as jest.Mock).mockResolvedValueOnce(revoked);
  expect((await validateLicense()).status).toBe("revoked");
  finish(response());
  expect((await old).status).toBe("revoked");
});
