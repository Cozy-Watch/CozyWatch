import type { LicenseState } from "./licenseState.types";

let tail: Promise<unknown> = Promise.resolve();
let generation = 0;
let lastMutation: { key: string; result: Promise<LicenseState> } | undefined;

const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
  const result = tail.then(work, work);
  tail = result.then(() => undefined, () => undefined);
  return result;
};

/** Mutations serialize; only adjacent identical requests share a device operation. */
export const runLicenseMutation = (key: string, work: () => Promise<LicenseState>) => {
  if (lastMutation?.key === key) return lastMutation.result;
  generation++;
  const result = enqueue(async () => { generation++; return work(); });
  const mutation = { key, result };
  lastMutation = mutation;
  const clear = () => { if (lastMutation === mutation) lastMutation = undefined; };
  void result.then(clear, clear);
  return result;
};

export const readLicenseSnapshot = <T>(read: () => Promise<T>) => enqueue(async () => {
  const version = ++generation;
  return { value: await read(), version };
});

/** Network validation runs outside the queue so an outage cannot block transfers. */
export const commitLicenseValidation = (
  version: number,
  write: () => Promise<LicenseState>,
  readCurrent: () => Promise<LicenseState>,
) => enqueue(() => version === generation ? write() : readCurrent());
