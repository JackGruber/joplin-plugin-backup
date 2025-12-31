import joplin from "api";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { copyFileSync } from "fs-extra";
import { moveSync } from "fs-extra";
import * as fs from "fs-extra";

export namespace helper {
  export async function getPluginVersion(): Promise<string> {
    const installationDir = await joplin.plugins.installationDir();
    try {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(installationDir, "manifest.json"), "utf8")
      );
      return manifest.version;
    } catch (error) {
      return "n/a";
    }
  }

  export async function validFileName(fileName: string) {
    var regChar = /[:*?"<>\/|\\]+/; // forbidden characters \ / : * ? " < > |
    var rexNames = /^(nul|prn|con|lpt[0-9]|com[0-9])(\.|$)/i; // forbidden file names

    if (regChar.test(fileName) === true || rexNames.test(fileName) === true) {
      return false;
    } else {
      return true;
    }
  }

  export async function joplinVersionInfo(): Promise<any> {
    try {
      return await joplin.versionInfo();
    } catch (error) {
      return null;
    }
  }

  // -2: Error
  // -1: Lower version
  // 0: Version equal
  // 1: Higer verison
  export async function versionCompare(
    version1: string,
    version2: string
  ): Promise<number> {
    if (version1.trim() === "" || version2.trim() === "") {
      return -2;
    }

    const vArray1 = version1.split(".");
    const vArray2 = version2.split(".");
    let result = null;

    let maxIndex = -1;
    if (vArray1.length >= vArray2.length) {
      maxIndex = vArray1.length;
    } else {
      maxIndex = vArray2.length;
    }

    for (let index = 0; index < maxIndex; index++) {
      let check1 = 0;
      if (index < vArray1.length) {
        check1 = parseInt(vArray1[index]);
      }

      let check2 = 0;
      if (index < vArray2.length) {
        check2 = parseInt(vArray2[index]);
      }

      if (check1 > check2) {
        return 1;
      } else if (check1 === check2) {
        result = 0;
      } else {
        return -1;
      }
    }

    return result;
  }

  // Doesn't resolve simlinks
  // See https://stackoverflow.com/questions/44892672/how-to-check-if-two-paths-are-the-same-in-npm
  // for possible alternative implementations.
  export function isSubdirectoryOrEqual(
    parent: string,
    possibleChild: string,

    // Testing only
    pathModule: typeof path = path
  ) {
    // Appending path.sep to handle this case:
    //   parent: /a/b/test
    //   possibleChild: /a/b/test2
    // "/a/b/test2".startsWith("/a/b/test") -> true, but
    // "/a/b/test2/".startsWith("/a/b/test/") -> false
    //
    // Note that .resolve removes trailing slashes.
    //
    const normalizedParent = pathModule.resolve(parent) + pathModule.sep;
    const normalizedChild = pathModule.resolve(possibleChild) + pathModule.sep;

    return normalizedChild.startsWith(normalizedParent);
  }

  // Workaround for "ENOTSUP: operation not supported on socket" #98
  // https://github.com/JackGruber/joplin-plugin-backup/issues/98
  export async function WorkaroundCopyFile(
    src: string,
    dst: string,
    fsWorkaroundLinux: boolean
  ): Promise<boolean> {
    if (process.platform == "linux" && fsWorkaroundLinux === true) {
      var execPromise = promisify(execFile);
      await execPromise("cp", ["-r", src, dst]);
    } else {
      copyFileSync(src, dst);
    }

    return true;
  }

  // Workaround for "ENOTSUP: operation not supported on socket" #98
  // https://github.com/JackGruber/joplin-plugin-backup/issues/98
  export async function WorkaroundMove(
    src: string,
    dst: string,
    fsWorkaroundLinux: boolean,
    overwrite: boolean = false
  ): Promise<boolean> {
    if (process.platform == "linux" && fsWorkaroundLinux === true) {
      var execPromise = promisify(execFile);
      await execPromise("mv", [src, dst]);
    } else {
      moveSync(src, dst, {
        overwrite: overwrite,
      });
    }

    return true;
  }
}
