import { mkdtemp, mkdir, readFile, rm, writeFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

jest.mock("electron", () => ({
  app: { isPackaged: true, whenReady: jest.fn().mockResolvedValue(undefined), getPath: jest.fn() },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (value: Buffer) => value.toString(),
  },
}));
jest.mock("electron-log", () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock("../diagnostics/diagnostics", () => ({ performanceDiagnostics: { record: jest.fn() } }));

describe("credential storage cleanup", () => {
  let directory: string;
  let primaryPath: string;
  let legacyPath: string;
  let storage: typeof import("./safeStorage");

  beforeEach(async () => {
    jest.resetModules();
    directory = await mkdtemp(path.join(os.tmpdir(), "cozy-storage-test-"));
    jest.spyOn(os, "homedir").mockReturnValue(directory);
    const { app } = await import("electron");
    (app.getPath as jest.Mock).mockReturnValue(path.join(directory, "current"));
    const { APP_NAME } = await import("../keys");
    primaryPath = path.join(directory, "current", "storage", "secure-storage.json");
    legacyPath = path.join(directory, `.${APP_NAME}`, "storage.json");
    await mkdir(path.dirname(legacyPath), { recursive: true });
    storage = await import("./safeStorage");
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  });

  const encryptedToken = Buffer.from(JSON.stringify("test-token")).toString("base64");

  it("preserves migrated credentials in current storage and removes the legacy file", async () => {
    await writeFile(legacyPath, JSON.stringify({ access_token: encryptedToken }));
    expect(await storage.getData("access_token")).toBe("test-token");
    expect(JSON.parse(await readFile(primaryPath, "utf8")).access_token).toBe(encryptedToken);
    await expect(access(legacyPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("removes backups created by older versions without restoring their token", async () => {
    await mkdir(path.dirname(primaryPath), { recursive: true });
    await writeFile(primaryPath, "{}");
    await writeFile(legacyPath, JSON.stringify({ access_token: encryptedToken }));
    expect(await storage.getData("access_token")).toBeNull();
    await expect(access(legacyPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps the legacy copy if writing current storage fails", async () => {
    await writeFile(legacyPath, JSON.stringify({ access_token: encryptedToken }));
    await writeFile(path.join(directory, "current"), "blocks directory creation");
    await expect(storage.getData("access_token")).rejects.toThrow("Unable to read secure storage");
    await expect(access(legacyPath)).resolves.toBeUndefined();
  });

  it("clears a reappearing legacy file when deleting the access token", async () => {
    await storage.storeData({ name: "access_token", data: "test-token" });
    await writeFile(legacyPath, JSON.stringify({ access_token: encryptedToken }));
    await storage.deleteDataOrThrow("access_token");
    expect(await storage.getData("access_token")).toBeNull();
    await expect(access(legacyPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("clears the legacy file when deleting all data", async () => {
    await storage.storeData({ name: "access_token", data: "test-token" });
    await writeFile(legacyPath, JSON.stringify({ access_token: encryptedToken }));
    expect(await storage.deleteAllData()).toBe(true);
    await expect(access(legacyPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("fails credential deletion if the legacy copy cannot be removed", async () => {
    await storage.storeData({ name: "access_token", data: "test-token" });
    await mkdir(legacyPath);
    await expect(storage.deleteDataOrThrow("access_token")).rejects.toThrow();
    await expect(access(legacyPath)).resolves.toBeUndefined();
    expect(await storage.getData("access_token")).toBe("test-token");
  });
  it("does not restore signed-out credentials after current storage disappears", async () => {
    await writeFile(legacyPath, JSON.stringify({ access_token: encryptedToken }));
    expect(await storage.getData("access_token")).toBe("test-token");
    await storage.deleteDataOrThrow("access_token");
    await rm(primaryPath);
    jest.resetModules();
    const { app } = await import("electron");
    (app.getPath as jest.Mock).mockReturnValue(path.join(directory, "current"));
    const restarted = await import("./safeStorage");
    expect(await restarted.getData("access_token")).toBeNull();
  });

  it("preserves the legacy copy if current storage is corrupt", async () => {
    await writeFile(legacyPath, JSON.stringify({ access_token: encryptedToken }));
    await mkdir(path.dirname(primaryPath), { recursive: true });
    await writeFile(primaryPath, "corrupt");
    await expect(storage.getData("access_token")).rejects.toThrow("saved data has not been replaced");
    expect(await readFile(primaryPath, "utf8")).toBe("corrupt");
    await expect(access(legacyPath)).resolves.toBeUndefined();
  });

  it("keeps GitHub credentials and preferences across license activation, deactivation, and restart", async () => {
    await storage.storeData({ name: "access_token", data: "test-token" });
    await storage.storeData({ name: "auth_type", data: "pat" });
    await storage.storeData({ name: "active_repositories", data: { 100: true, 200: false } });
    await storage.storeData({ name: "accentColor", data: "green" });

    await storage.saveLicenseActivation("synthetic-license-key", {
      schemaVersion: 2,
      status: "licensed",
      entitlement: "lifetime",
      licenseInstanceId: "synthetic-device",
      licenseProductId: 400,
      lastValidatedAt: "2026-10-21T00:00:00Z",
    });
    expect(await storage.getData("access_token")).toBe("test-token");
    await storage.saveLicenseActivation(null, { schemaVersion: 2, status: "trial-ended" });

    jest.resetModules();
    const { app } = await import("electron");
    (app.getPath as jest.Mock).mockReturnValue(path.join(directory, "current"));
    const restarted = await import("./safeStorage");
    expect(await restarted.getData("access_token")).toBe("test-token");
    expect(await restarted.getData("auth_type")).toBe("pat");
    expect(await restarted.getData("active_repositories")).toEqual({ 100: true, 200: false });
    expect(await restarted.getData("accentColor")).toBe("green");
    expect(await restarted.getData("licenseKey")).toBeNull();
  });

  it("atomically stores the connection and trial and preserves the previous connection on disk failure", async () => {
    const previous = { schemaVersion: 2 as const, status: "licensed" as const, entitlement: "lifetime" as const };
    await storage.saveGitHubConnection("old-token", "oauth", previous);
    const before = await readFile(primaryPath, "utf8");
    const fs = jest.requireActual<typeof import("node:fs/promises")>("node:fs/promises");
    const failure = jest.spyOn(fs, "rename").mockRejectedValueOnce(new Error("Disk full"));
    await expect(storage.saveGitHubConnection("new-token", "pat", { schemaVersion: 2, status: "trial" })).rejects.toThrow("Disk full");
    failure.mockRestore();
    expect(await readFile(primaryPath, "utf8")).toBe(before);
    expect(await storage.getData("access_token")).toBe("old-token");
    expect(await storage.getData("auth_type")).toBe("oauth");
    expect(await storage.getData("licenseState")).toEqual(previous);
    await storage.saveGitHubConnection("new-token", "pat", { schemaVersion: 2, status: "trial" });
    expect(await storage.getData("access_token")).toBe("new-token");
    expect(await storage.getData("auth_type")).toBe("pat");
    expect((await storage.getData("licenseState"))?.status).toBe("trial");
    expect(await storage.getData("authentication_notice")).toBeNull();
  });
  it("does not commit a connection cancelled while waiting for storage", async () => {
    await storage.saveGitHubConnection("old-token", "oauth");
    await expect(storage.saveGitHubConnection("cancelled-token", "pat", undefined, () => false)).rejects.toThrow("cancelled");
    expect(await storage.getData("access_token")).toBe("old-token");
  });

});
