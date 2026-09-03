import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AtomicFileWriter } from "./atomicFileWriter";

describe("AtomicFileWriter", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "cozy-watch-storage-"));
  });

  afterEach(async () => {
    await rm(directory, { force: true, recursive: true });
  });

  it("serializes concurrent writes and leaves no temporary files", async () => {
    const writer = new AtomicFileWriter();
    const filePath = path.join(directory, "storage.json");

    await Promise.all([
      writer.write(filePath, "first"),
      writer.write(filePath, "second"),
      writer.write(filePath, "third"),
    ]);

    await expect(readFile(filePath, "utf8")).resolves.toBe("third");
    await expect(readdir(directory)).resolves.toEqual(["storage.json"]);
  });
});
