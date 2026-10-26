import {
  createTrialLicenseState,
  createUnconfiguredLicenseState,
  isLicenseState,
  migrateLicenseState,
  resolveTimeBasedLicenseState,
  withoutActivation,
  canUseDesktop,
  shouldShowExpiryReminder,
} from "../licenseState.utils";
import type { LicenseState } from "../licenseState.types";
const now = new Date("2026-10-20T12:00:00Z");
const paid: LicenseState = {
  schemaVersion: 2,
  status: "licensed",
  licenseInstanceId: "synthetic-device",
  licenseProductId: 400,
  entitlement: "lifetime",
  lastValidatedAt: now.toISOString(),
};

it("does not start a trial merely by opening a fresh installation", () => {
  expect(migrateLicenseState(null, false)).toEqual(
    createUnconfiguredLicenseState(),
  );
});
it("starts a 14-day full-feature trial", () => {
  const trial = createTrialLicenseState("new", now);
  expect(trial.trialEndsAt).toBe("2026-11-03T12:00:00.000Z");
  expect(canUseDesktop(trial, now)).toBe(true);
  expect(
    resolveTimeBasedLicenseState(trial, new Date("2026-11-03T12:00:00Z"))
      .status,
  ).toBe("trial-ended");
});
it.each([
  null,
  { schemaVersion: 1, status: "personal" },
  { schemaVersion: 1, status: "expired" },
])("protects existing users until they review the new terms (%s)", (stored) => {
  const state = migrateLicenseState(stored, true);
  expect(state.transitionPending).toBe(true);
  expect(state.trialEndsAt).toBeUndefined();
  expect(canUseDesktop(state)).toBe(true);
});
it("grants the full transition period after accepting the new terms", () => {
  const state = createTrialLicenseState("transition", now);
  expect(state.trialEndsAt).toBe("2026-11-19T12:00:00.000Z");
  expect(state.termsAcceptedAt).toBe(now.toISOString());
});
it("preserves purchased access across migration without claiming renewals are cancelled", () => {
  const state = migrateLicenseState(
    {
      ...paid,
      schemaVersion: 1,
      status: "commercial-active",
      licenseExpiresAt: "2026-10-01T00:00:00Z",
    },
    true,
  );
  expect(state.status).toBe("licensed");
  expect(state.legacyMigrationPending).toBe(true);
});
it("never expires a lifetime activation locally", () => {
  expect(
    resolveTimeBasedLicenseState(paid, new Date("2040-01-01")).status,
  ).toBe("licensed");
});
it("retains an expired trial when a purchased device is deactivated", () => {
  const trial = createTrialLicenseState("new", new Date("2026-01-01"));
  const state = withoutActivation({ ...trial, ...paid });
  expect(state.status).toBe("trial-ended");
  expect(state.trialStartedAt).toBe(trial.trialStartedAt);
  expect(state.licenseInstanceId).toBeUndefined();
});
it("rejects malformed activation records", () => {
  expect(isLicenseState({ schemaVersion: 2, status: "licensed" })).toBe(false);
  expect(
    isLicenseState({
      schemaVersion: 2,
      status: "trial",
      trialEndsAt: "bad-date",
    }),
  ).toBe(false);
  expect(isLicenseState(paid)).toBe(true);
});
it("reminds near the end and preserves the dismissed reminder across restarts", () => {
  const trial = createTrialLicenseState("new", now);
  const nearEnd = new Date("2026-11-02T12:00:00Z");
  expect(shouldShowExpiryReminder(trial, now)).toBe(false);
  expect(shouldShowExpiryReminder(trial, nearEnd)).toBe(true);
  expect(
    shouldShowExpiryReminder(
      { ...trial, lastExpiryReminderAt: nearEnd.toISOString() },
      nearEnd,
    ),
  ).toBe(false);
});
it.each(["trial-ended", "revoked", "unconfigured"] as const)(
  "pauses access for %s",
  (status) => {
    expect(canUseDesktop({ schemaVersion: 2, status })).toBe(false);
  },
);
