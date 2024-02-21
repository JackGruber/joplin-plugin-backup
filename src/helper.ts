import joplin from "api";
import * as path from "path";

export namespace helper {
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
}
