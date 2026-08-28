import {
  COMMERCIAL_TRIAL_DAYS,
  EXPIRY_REMINDER_INTERVAL_DAYS,
  LICENSE_STATE_SCHEMA_VERSION,
} from "../licenseState.types";
import {
  createCommercialTrialLicenseState,
  createPersonalLicenseState,
  createUnconfiguredLicenseState,
  isLicenseState,
  resolveTimeBasedLicenseState,
  selectCommercialUse,
  selectPersonalUse,
  shouldShowExpiryReminder,
} from "../licenseState.utils";

describe("license state", () => {
  it("creates an unconfigured state for a fresh installation", () => {
    expect(createUnconfiguredLicenseState()).toEqual({
      schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
      status: "unconfigured",
    });
  });

  it("creates a personal-use state", () => {
    expect(createPersonalLicenseState()).toEqual({
      schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
      status: "personal",
    });
  });

  it(`creates a ${COMMERCIAL_TRIAL_DAYS}-day commercial trial`, () => {
    const now = new Date("2026-08-27T10:00:00.000Z");
    const state = createCommercialTrialLicenseState(now);

    expect(state).toEqual({
      schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
      status: "commercial-trial",
      trialStartedAt: "2026-08-27T10:00:00.000Z",
      trialEndsAt: "2026-09-26T10:00:00.000Z",
    });
  });

  it("expires a commercial trial after its end date", () => {
    const state = createCommercialTrialLicenseState(
      new Date("2026-08-01T00:00:00.000Z"),
    );

    expect(
      resolveTimeBasedLicenseState(
        state,
        new Date("2026-09-01T00:00:00.000Z"),
      ).status,
    ).toBe("expired");
  });

  it("does not expire a commercial trial early", () => {
    const state = createCommercialTrialLicenseState(
      new Date("2026-08-01T00:00:00.000Z"),
    );

    expect(
      resolveTimeBasedLicenseState(
        state,
        new Date("2026-08-15T00:00:00.000Z"),
      ).status,
    ).toBe("commercial-trial");
  });

  it("does not restart a commercial trial after switching to personal use", () => {
    const trial = createCommercialTrialLicenseState(
      new Date("2026-08-01T00:00:00.000Z"),
    );
    const personal = selectPersonalUse(trial);

    expect(
      selectCommercialUse(
        personal,
        new Date("2026-09-01T00:00:00.000Z"),
      ).status,
    ).toBe("expired");
  });

  it("expires an annual license locally when its paid period ends", () => {
    expect(
      resolveTimeBasedLicenseState(
        {
          schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
          status: "commercial-active",
          licenseExpiresAt: "2026-08-31T00:00:00.000Z",
        },
        new Date("2026-09-01T00:00:00.000Z"),
      ).status,
    ).toBe("expired");
  });

  it("marks malformed trial dates as invalid", () => {
    expect(
      resolveTimeBasedLicenseState({
        schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
        status: "commercial-trial",
        trialEndsAt: "not-a-date",
      }).status,
    ).toBe("invalid");
  });

  it("shows an expiry reminder at most once every configured interval", () => {
    const expiredState = {
      schemaVersion: LICENSE_STATE_SCHEMA_VERSION,
      status: "expired" as const,
      lastExpiryReminderAt: "2026-08-01T00:00:00.000Z",
    };

    expect(
      shouldShowExpiryReminder(
        expiredState,
        new Date("2026-08-10T00:00:00.000Z"),
      ),
    ).toBe(false);
    expect(
      shouldShowExpiryReminder(
        expiredState,
        new Date("2026-08-01T00:00:00.000Z"),
      ),
    ).toBe(false);
    expect(
      shouldShowExpiryReminder(
        expiredState,
        new Date("2026-08-15T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect(EXPIRY_REMINDER_INTERVAL_DAYS).toBe(14);
  });

  it("rejects unknown and outdated stored state", () => {
    expect(isLicenseState(null)).toBe(false);
    expect(isLicenseState({ schemaVersion: 0, status: "personal" })).toBe(
      false,
    );
    expect(
      isLicenseState({ schemaVersion: 1, status: "unknown-status" }),
    ).toBe(false);
  });
});
