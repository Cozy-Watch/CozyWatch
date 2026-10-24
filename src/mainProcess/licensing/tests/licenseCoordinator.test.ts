import { runLicenseMutation, runLicenseRead } from "../licenseCoordinator";
it("keeps later background reads queued even when spawned by a completed mutation", async () => {
  let releaseChild: () => void = () => undefined;
  let releaseMutation: () => void = () => undefined;
  const gate = new Promise<void>(resolve => { releaseChild = resolve; });
  const held = new Promise<void>(resolve => { releaseMutation = resolve; });
  const events: string[] = [];
  let child: Promise<void> = Promise.resolve();
  await runLicenseMutation("first", async () => {
    child = gate.then(() => runLicenseRead(async () => { events.push("read"); }));
    return { schemaVersion: 2, status: "trial" };
  });
  const mutation = runLicenseMutation("second", async () => {
    events.push("mutation start"); await held; events.push("mutation end");
    return { schemaVersion: 2, status: "licensed" };
  });
  await new Promise(resolve => setImmediate(resolve));
  releaseChild();
  await new Promise(resolve => setImmediate(resolve));
  expect(events).toEqual(["mutation start"]);
  releaseMutation();
  await mutation; await child;
  expect(events).toEqual(["mutation start", "mutation end", "read"]);
});
