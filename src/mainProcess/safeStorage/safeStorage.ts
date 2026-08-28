import { app, safeStorage } from "electron";
import fs from "fs";
import path from "path";
import os from "os";
import log from "electron-log";
import {
  StoreDataMap,
  StoreDataName,
  StoreDataParams,
} from "./safeStorage.types";
import { APP_NAME } from "../keys";

const isDevelopment = !app.isPackaged;

const STORAGE_DIR = path.join(os.homedir(), `.${APP_NAME}`);
const STORAGE_PATH = path.join(
  STORAGE_DIR,
  `${isDevelopment ? "dev-" : ""}storage.json`,
);

type StorageObject = {
  [key in StoreDataName]?: string;
};

const ensureStoragePathExists = () => {
  fs.mkdirSync(STORAGE_DIR, { recursive: true, mode: 0o700 });
  fs.chmodSync(STORAGE_DIR, 0o700);
};

const readStorage = (): StorageObject => {
  const start = Date.now();
  ensureStoragePathExists();

  if (!fs.existsSync(STORAGE_PATH)) {
    fs.writeFileSync(
      STORAGE_PATH,
      JSON.stringify({ access_token: "" }),
      "utf-8",
    );
    fs.chmodSync(STORAGE_PATH, 0o600);
    log.info(
      `[Storage] readStorage duration: ${Date.now() - start}ms (created new file)`,
    );
    return {};
  }

  fs.chmodSync(STORAGE_PATH, 0o600);
  const data = fs.readFileSync(STORAGE_PATH, "utf-8");
  try {
    const parsed = JSON.parse(data);
    log.info(`[Storage] readStorage duration: ${Date.now() - start}ms`);
    return parsed;
  } catch (e) {
    log.error("[Storage] storage.json is corrupted or invalid JSON:", e);
    // Optionally, backup and recreate the file here
    return {};
  }
};

const writeStorage = (data: string) => {
  const start = Date.now();
  ensureStoragePathExists();
  fs.writeFileSync(STORAGE_PATH, data, { encoding: "utf-8", mode: 0o600 });
  fs.chmodSync(STORAGE_PATH, 0o600);
  log.info(`[Storage] writeStorage duration: ${Date.now() - start}ms`);
};

export const storeData = async <T extends keyof StoreDataMap>({
  name,
  data,
}: StoreDataParams<T>): Promise<boolean> => {
  try {
    await app.whenReady();

    if (!safeStorage.isEncryptionAvailable()) {
      log.error("Encryption is not available on this system.");
      return false;
    }

    const start = Date.now();

    const dataToSave = JSON.stringify(data);
    const encryptedData = safeStorage
      .encryptString(dataToSave)
      .toString("base64");

    const fileStorage = readStorage();
    const storage = { ...fileStorage, [name]: encryptedData };
    writeStorage(JSON.stringify(storage));

    log.info(`[Storage] storeData ${name} duration: ${Date.now() - start}ms`);
    return true;
  } catch (err) {
    log.error(`Failed to store ${name}:`, err);
    return false;
  }
};

export const getData = async <T extends StoreDataName>(
  name: T
): Promise<StoreDataMap[T] | null> => {
  try {
    await app.whenReady();

    if (!safeStorage.isEncryptionAvailable()) {
      log.error("Encryption is not available on this system.");
      return null;
    }

    const start = Date.now();

    const storage = readStorage();
    const encryptedBase64 = storage[name];

    if (!encryptedBase64) {
      log.warn(
        `[Storage] No data found for key: ${name} (duration: ${Date.now() - start}ms)`,
      );
      return null;
    }

    let decryptedData: string;

    try {
      decryptedData = safeStorage.decryptString(
        Buffer.from(encryptedBase64, "base64"),
      );
    } catch (error) {
      if (!isDevelopment) {
        throw error;
      }

      // Development builds used to store serialized values as plaintext.
      // Validate and immediately replace a legacy value with encrypted data.
      JSON.parse(encryptedBase64);
      decryptedData = encryptedBase64;
      storage[name] = safeStorage
        .encryptString(decryptedData)
        .toString("base64");
      writeStorage(JSON.stringify(storage));
      log.info(`[Storage] migrated legacy development value for ${name}`);
    }

    log.info(`[Storage] getData ${name} duration: ${Date.now() - start}ms`);
    return JSON.parse(decryptedData);
  } catch (err) {
    log.error(`Failed to get ${name}:`, err);
    return null;
  }
};

export const deleteData = async (name: StoreDataName) => {
  try {
    const start = Date.now();
    const storage = readStorage();

    if (storage[name]) {
      delete storage[name];
      writeStorage(JSON.stringify(storage));
      log.info(
        `[Storage] deleteData ${name} duration: ${Date.now() - start}ms`,
      );
      return true;
    } else {
      log.warn(
        `[Storage] No data found for key: ${name} (duration: ${Date.now() - start}ms)`,
      );
      return false;
    }
  } catch (err) {
    log.error("Failed to delete data:", err);
    return false;
  }
};

export const deleteAllData = async () => {
  try {
    const start = Date.now();
    const storage = readStorage();

    await Promise.all(
      (Object.keys(storage) as StoreDataName[]).map((name) => deleteData(name))
    );

    log.info(`[Storage] deleteAllData duration: ${Date.now() - start}ms`);
    return true;
  } catch (err) {
    log.error("Failed to delete all data:", err);
    return false;
  }
};
