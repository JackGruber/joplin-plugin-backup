// https://sevenzip.osdn.jp/chm/cmdline/exit_codes.htm
// https://sevenzip.osdn.jp/chm/cmdline/commands/index.htm
import * as _7z from "7zip-min";
import { joplinWrapper } from "./joplinWrapper";
import * as path from "path";

export namespace sevenZip {
  export async function updateBinPath() {
    const path7z = _7z.getPath7za();
    _7z.setPath7za(
      path.join(await joplinWrapper.installationDir(), "7zip-bin", path7z)
    );
  }

  export async function add(
    archive: string,
    src: string,
    password: string = null,
    options: string[] = null
  ): Promise<any> {
    let _7zOptions = ["a", archive, src];

    if (options) {
      _7zOptions = [..._7zOptions, ...options];
    }

    if (password) {
      _7zOptions.push("-p" + password);
      _7zOptions.push("-mhe");
    }

    const promise = new Promise((resolve, reject) => {
      _7z.cmd(_7zOptions, (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });

    return await promise
      .then((data) => {
        return data;
      })
      .catch((err) => {
        return err.message;
      });
  }

  async function list() {}

  async function hash() {}

  async function integrity() {}

  async function test() {
    _7z.pack("C:\\temp\\note.md", "C:\\temp\\note.7z", (err) => {
      if (err) {
        console.error(err);
      }
      console.error("JA");
    });

    _7z.cmd(
      ["a", "C:\\temp\\note_p.7z", "-psecret", "-mhe", "C:\\temp\\note.md"],
      (err) => {
        if (err) {
          console.error(err);
        }
        console.error("JA2");
      }
    );
  }
}
