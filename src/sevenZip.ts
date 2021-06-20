// https://sevenzip.osdn.jp/chm/cmdline/exit_codes.htm
// https://sevenzip.osdn.jp/chm/cmdline/commands/index.htm
import * as _7z from "node-7z";
import * as sevenBin from "7zip-bin";
import { joplinWrapper } from "./joplinWrapper";
import * as path from "path";
import { exec } from "child_process";

let pathTo7zip = sevenBin.path7za;

export namespace sevenZip {
  export async function updateBinPath() {
    pathTo7zip = path.join(
      await joplinWrapper.installationDir(),
      "7zip-bin",
      pathTo7zip
    );
  }

  export async function setExecutionFlag() {
    if (process.platform !== "win32") {
      exec(`chmod +x ${pathTo7zip}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
      });
    }
  }

  async function addPassword(
    _7zOptions: any,
    password: string
  ): Promise<Object> {
    if (!_7zOptions.method) {
      _7zOptions.method = [];
    }
    _7zOptions.password = password;
    return _7zOptions;
  }

  export async function add(
    archive: string,
    src: string,
    password: string = null,
    options: Object = {}
  ): Promise<any> {
    let _7zOptions: any = { $bin: pathTo7zip };
    if (options) {
      _7zOptions = { ..._7zOptions, ...options };
    }

    _7zOptions.method = [];
    _7zOptions.method.push("x0");

    if (password !== null) {
      _7zOptions = await addPassword(_7zOptions, password);
      _7zOptions.method.push("he");
    }

    const promise = new Promise((resolve, reject) => {
      const process = _7z.add(archive, src, _7zOptions);
      process.on("end", () => resolve(true));
      process.on("error", reject);
    });

    return await promise
      .then((data) => {
        return data;
      })
      .catch((err) => {
        return err.message;
      });
  }

  export async function list(
    archive: string,
    password: string = null,
    options: Object = {}
  ): Promise<any> {
    let _7zOptions: any = { $bin: pathTo7zip };
    if (options) {
      _7zOptions = { ..._7zOptions, ...options };
    }

    if (password !== null) {
      _7zOptions = await addPassword(_7zOptions, password);
    }

    const promise = new Promise((resolve, reject) => {
      const files = [];
      const process = _7z.list(archive, _7zOptions);
      process.on("data", (file) => files.push(file));
      process.on("end", () => resolve(files));
      process.on("error", reject);
    });

    return await promise
      .then((data) => {
        return data;
      })
      .catch((err) => {
        return err.message;
      });
  }

  export async function passwordProtected(
    archive: string,
    password: string = null,
    options: Object = {}
  ): Promise<any> {
    let _7zOptions: any = { $bin: pathTo7zip };
    if (options) {
      _7zOptions = { ..._7zOptions, ...options };
    }

    _7zOptions = await addPassword(_7zOptions, "WrongPasswordForTesting");

    const promise = new Promise((resolve, reject) => {
      const tests = [];
      const process = _7z.test(archive, _7zOptions);
      process.on("data", (data) => tests.push(data));
      process.on("end", () => resolve(tests));
      process.on("error", reject);
    });

    return await promise
      .then((data) => {
        return false;
      })
      .catch((err) => {
        if (archive == err.message) return true;
        else return err.message;
      });
  }

  export async function test(
    archive: string,
    password: string = null,
    options: Object = {}
  ): Promise<any> {
    let _7zOptions: any = { $bin: pathTo7zip };
    if (options) {
      _7zOptions = { ..._7zOptions, ...options };
    }

    if (password !== null) {
      _7zOptions = await addPassword(_7zOptions, password);
    }

    const promise = new Promise((resolve, reject) => {
      const tests = [];
      const process = _7z.test(archive, _7zOptions);
      process.on("data", (data) => tests.push(data));
      process.on("end", () => resolve(tests));
      process.on("error", reject);
    });

    return await promise
      .then((data) => {
        return data;
      })
      .catch((err) => {
        return err.message;
      });
  }
}
