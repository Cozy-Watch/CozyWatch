import { randomUUID } from "node:crypto";
import { chmod, mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export class AtomicFileWriter {
  private readonly queues = new Map<string, Promise<void>>();

  public write = async (filePath: string, contents: string) => {
    const previousWrite = this.queues.get(filePath) ?? Promise.resolve();
    const nextWrite = previousWrite
      .catch(() => undefined)
      .then(async () => {
        await mkdir(path.dirname(filePath), { mode: 0o700, recursive: true });
        const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
        try {
          await writeFile(temporaryPath, contents, {
            encoding: "utf8",
            mode: 0o600,
          });
          await chmod(temporaryPath, 0o600);
          await rename(temporaryPath, filePath);
        } catch (error) {
          await unlink(temporaryPath).catch(() => undefined);
          throw error;
        }
      });
    this.queues.set(filePath, nextWrite);
    try {
      await nextWrite;
    } finally {
      if (this.queues.get(filePath) === nextWrite) {
        this.queues.delete(filePath);
      }
    }
  };
}
