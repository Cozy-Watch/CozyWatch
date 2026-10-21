jest.mock("electron", () => ({ ipcMain: { emit: jest.fn() } }));
jest.mock("../buildFlavor", () => ({ isOfficialBuild: () => true }));
jest.mock("../../safeStorage/safeStorage", () => ({
  getData: jest.fn(),
  storeData: jest.fn(),
}));
let values: Record<string, unknown>;
let licensing: typeof import("../licenseState");
beforeEach(async () => {
  jest.resetModules();
  values = {};
  const storage = await import("../../safeStorage/safeStorage");
  (storage.getData as jest.Mock).mockImplementation(
    async (name) => values[name] ?? null,
  );
  (storage.storeData as jest.Mock).mockImplementation(
    async ({ name, data }) => {
      values[name] = data;
      return true;
    },
  );
  licensing = await import("../licenseState");
});
it("does not consume setup time and starts exactly once after GitHub connects", async () => {
  expect((await licensing.getLicenseState()).status).toBe("unconfigured");
  values.access_token = "synthetic-token";
  await Promise.all([
    licensing.startTrialAfterGitHubConnection(),
    licensing.startTrialAfterGitHubConnection(),
  ]);
  const state = await licensing.getLicenseState();
  expect(state.status).toBe("trial");
  expect(
    Date.parse(state.trialEndsAt!) - Date.parse(state.trialStartedAt!),
  ).toBe(14 * 86400000);
  await licensing.startTrialAfterGitHubConnection();
  expect((await licensing.getLicenseState()).trialStartedAt).toBe(
    state.trialStartedAt,
  );
});
it("does not restart the trial when a user reconnects after expiry", async () => {
  values.licenseState = {
    schemaVersion: 2,
    status: "trial",
    trialStartedAt: "2020-01-01T00:00:00Z",
    trialEndsAt: "2020-01-15T00:00:00Z",
  };
  await licensing.startTrialAfterGitHubConnection();
  expect((await licensing.getLicenseState()).status).toBe("trial-ended");
});
it("keeps an existing installation usable until transition consent and never restarts consent", async () => {
  values.access_token = "synthetic-existing-account";
  const first = await licensing.getLicenseState();
  expect(first.transitionPending).toBe(true);
  await licensing.acceptTransitionTerms();
  const accepted = await licensing.getLicenseState();
  expect(
    Date.parse(accepted.trialEndsAt!) - Date.parse(accepted.trialStartedAt!),
  ).toBe(30 * 86400000);
  await licensing.acceptTransitionTerms();
  expect(await licensing.getLicenseState()).toEqual(accepted);
});
it("restores a valid lifetime activation after module restart (update/reinstall retaining user data)", async () => {
  values.licenseState = {
    schemaVersion: 2,
    status: "licensed",
    licenseInstanceId: "synthetic-device",
    licenseProductId: 400,
    entitlement: "lifetime",
    lastValidatedAt: "2026-01-01T00:00:00Z",
  };
  expect((await licensing.getLicenseState()).status).toBe("licensed");
  jest.resetModules();
  const storage = await import("../../safeStorage/safeStorage");
  (storage.getData as jest.Mock).mockImplementation(
    async (name) => values[name] ?? null,
  );
  expect(
    (await (await import("../licenseState")).getLicenseState()).status,
  ).toBe("licensed");
});

it("preserves the GitHub connection and repository choices through upgrade migration and trial expiry", async () => {
  const existing = {
    access_token: "synthetic-existing-pat",
    auth_type: "pat",
    active_repositories: { 100: true, 200: false },
    accentColor: "green",
  };
  Object.assign(values, existing);

  expect((await licensing.getLicenseState()).transitionPending).toBe(true);
  await licensing.acceptTransitionTerms();
  values.licenseState = {
    ...(await licensing.getLicenseState()),
    trialStartedAt: "2020-01-01T00:00:00Z",
    trialEndsAt: "2020-01-31T00:00:00Z",
  };
  expect((await licensing.getLicenseState()).status).toBe("trial-ended");
  expect(values).toMatchObject(existing);
  const storage = await import("../../safeStorage/safeStorage");
  expect((storage.storeData as jest.Mock).mock.calls.every(([entry]) => entry.name === "licenseState")).toBe(true);
});
