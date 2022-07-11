import joplin from "api";

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
}
