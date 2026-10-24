import { AsyncLocalStorage } from "node:async_hooks";
import type { LicenseState } from "./licenseState.types";

const operation = new AsyncLocalStorage<{ active: boolean }>();
let tail: Promise<unknown> = Promise.resolve();
let generation = 0;
let lastMutation: { key: string; result: Promise<LicenseState> } | undefined;

const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
  const execute = () => {
    const context = { active: true };
    return operation.run(context, async () => {
      try { return await work(); }
      finally { context.active = false; }
    });
  };
  const result = tail.then(execute, execute);
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

/** Local normalization shares the queue, including when called inside a mutation. */
export const runLicenseRead = <T>(read: () => Promise<T>): Promise<T> =>
  operation.getStore()?.active ? read() : enqueue(read);
