import Maker from "@electron-forge/maker-base";
import type { MakerOptions } from "@electron-forge/maker-base";
import { execFile } from "node:child_process";
import { cp, mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
/** Native macOS maker: fixed, trusted artwork; no third-party image decoder. */
export class CozyDmgMaker extends Maker<Record<string, never>> {
  name = "cozy-watch-native-dmg";
  defaultPlatforms: Array<"darwin"> = ["darwin"];
  isSupportedOnCurrentPlatform() { return process.platform === "darwin"; }
  async make({ dir, makeDir, appName, packageJSON, targetArch }: MakerOptions) {
    const work = await mkdtemp(path.join(os.tmpdir(), "cozy-dmg-"));
    const image = path.join(work, "installer.dmg");
    const mount = path.join(work, "mount");
    const destination = path.join(makeDir, `${appName}-${packageJSON.version}-${targetArch}.dmg`);
    let attached = false;
    try {
      await mkdir(makeDir, { recursive: true });
      await run("hdiutil", ["create", "-size", "1g", "-fs", "HFS+", "-volname", "Install Cozy Watch", image]);
      await run("hdiutil", ["attach", "-nobrowse", "-mountpoint", mount, image]); attached = true;
      await cp(path.join(dir, `${appName}.app`), path.join(mount, `${appName}.app`), { recursive: true, verbatimSymlinks: true });
      await symlink("/Applications", path.join(mount, "Applications"));
      await mkdir(path.join(mount, ".background"));
      await cp(path.resolve("assets/dmg-background@2x.png"), path.join(mount, ".background/background.png"));
      // Optional macOS-only build dependency, never imported on other platforms.
      const { default: DSStore } = await import("ds-store");
      const store = new DSStore();
      store.vSrn(1); store.setIconSize(100); store.setWindowSize(720, 480);
      store.setIconPos(`${appName}.app`, 190, 265); store.setIconPos("Applications", 530, 265);
      store.setBackgroundPath(path.join(mount, ".background/background.png"));
      await new Promise<void>((resolve, reject) => store.write(path.join(mount, ".DS_Store"), (error: Error | null) => error ? reject(error) : resolve()));
      await run("hdiutil", ["detach", mount]); attached = false;
      await run("hdiutil", ["convert", image, "-format", "UDZO", "-o", destination, "-ov"]);
      return [destination];
    } finally {
      if (attached) await run("hdiutil", ["detach", mount, "-force"]);
      await rm(work, { recursive: true, force: true });
    }
  }
}
