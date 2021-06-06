import { Backup } from "../src/Backup";
import * as fs from "fs-extra";
import * as path from "path";
import { joplinWrapper } from "../src/joplinWrapper";
import { when } from "jest-when";

function getTestPaths(): any {
  const testPath: any = {};
  testPath.base = path.join(__dirname, "tests");
  testPath.backupDest = path.join(testPath.base, "Backup");
  testPath.joplinProfile = path.join(testPath.base, "joplin-desktop");
  testPath.templates = path.join(testPath.joplinProfile, "templates");
  return testPath;
}

let backup = null;

const spyOnsSttingsValue = jest.spyOn(joplinWrapper, "settingsValue");
const spyOnGlobalValue = jest.spyOn(joplinWrapper, "settingsGlobalValue");

async function createTestStructure() {
  const test = await getTestPaths();
  fs.emptyDirSync(test.base);
  fs.emptyDirSync(test.backupDest);
  fs.emptyDirSync(test.joplinProfile);
  fs.emptyDirSync(test.templates);
}

const testPath = getTestPaths();

describe("Backup", function () {
  beforeEach(async () => {
    /* prettier-ignore */
    when(spyOnsSttingsValue)
      .mockImplementation(() => Promise.resolve("no mockImplementation"))
      .calledWith("fileLogLevel").mockImplementation(() => Promise.resolve("error"))
      .calledWith("path").mockImplementation(() => Promise.resolve(testPath.backupDest));

    /* prettier-ignore */
    when(spyOnGlobalValue)
      .mockImplementation(() => Promise.resolve("no mockImplementation"))
      .calledWith("profileDir").mockImplementation(() => Promise.resolve(testPath.joplinProfile));

    await createTestStructure();
    backup = new Backup() as any;
    backup.log.transports.console.level = "warn";
    backup.log.transports.file.level = false;
  });

  describe("Backup path", function () {
    it(`Backup path != Profile`, async () => {
      await backup.loadBackupPath();
      expect(backup.backupBasePath).toBe(testPath.backupDest);
      expect(backup.backupBasePath).not.toBe(testPath.joplinProfile);

      /* prettier-ignore */
      when(spyOnsSttingsValue)
      .calledWith("path").mockImplementation(() => Promise.resolve(""));
      await backup.loadBackupPath();
      expect(backup.backupBasePath).not.toBe(testPath.joplinProfile);
      expect(backup.backupBasePath).toBe(null);

      /* prettier-ignore */
      when(spyOnsSttingsValue)
      .calledWith("path").mockImplementation(() => Promise.resolve(testPath.joplinProfile));
      await backup.loadBackupPath();
      expect(backup.backupBasePath).not.toBe(testPath.joplinProfile);
      expect(backup.backupBasePath).toBe(null);
    });

    it(`relative paths`, async () => {
      const backupPath = "../";
      /* prettier-ignore */
      when(spyOnsSttingsValue)
      .calledWith("path").mockImplementation(() => Promise.resolve(backupPath));
      await backup.loadBackupPath();
      const toBe = path.normalize(path.join(testPath.backupDest, backupPath));
      expect(backup.backupBasePath).toBe(toBe);
    });
  });

  describe("Div", function () {
    it(`Create empty folder`, async () => {
      const folder = await backup.createEmptyFolder(
        testPath.backupDest,
        "profile"
      );
      const check = path.join(testPath.backupDest, "profile");
      expect(folder).toBe(check);
      expect(fs.existsSync(check)).toBe(true);
    });

    it(`Delete log`, async () => {
      backup.logFile = path.join(testPath.backupDest, "test.log");
      fs.writeFileSync(backup.logFile, "data");

      expect(fs.existsSync(backup.logFile)).toBe(true);
      await backup.deleteLogFile();
      expect(fs.existsSync(backup.logFile)).toBe(false);
    });

    it(`Get Retention folder name`, async () => {
      const testEpoch = new Date(2021, 0, 2, 16, 30, 45, 0).getTime();
      const spyOnDateNow = jest
        .spyOn(Date, "now")
        .mockImplementation(() => testEpoch);
      expect(await backup.getBackupSetFolderName()).toBe("202101021630");
      spyOnDateNow.mockRestore();
    });
  });

  describe("Logging", function () {
    beforeEach(async () => {
      backup.setupLog();
    });

    it(`Default`, async () => {
      expect(backup.log.transports.console.level).toBe("verbose");
      expect(backup.log.transports.file.level).toBe(false);
    });

    it(`Toggel file`, async () => {
      await backup.fileLogging(false);
      expect(backup.log.transports.file.level).toBe(false);

      /* prettier-ignore */
      when(spyOnsSttingsValue)
        .calledWith("fileLogLevel").mockImplementation(() => Promise.resolve("verbose"));

      backup.backupBasePath = "./";
      await backup.fileLogging(true);
      expect(backup.log.transports.file.level).toBe("verbose");

      /* prettier-ignore */
      when(spyOnsSttingsValue)
        .calledWith("fileLogLevel").mockImplementation(() => Promise.resolve("error"));

      backup.backupBasePath = "./";
      await backup.fileLogging(true);
      expect(backup.log.transports.file.level).toBe("error");
    });
  });

  describe("Backup", function () {
    beforeEach(async () => {});

    it(`File`, async () => {
      const src1 = path.join(testPath.joplinProfile, "settings.json");
      const src2 = path.join(testPath.joplinProfile, "doesNotExist.json");
      const dst = path.join(testPath.backupDest, "settings.json");
      fs.writeFileSync(src1, "data");

      expect(await backup.backupFile(src1, dst)).toBe(true);
      expect(fs.existsSync(dst)).toBe(true);

      expect(await backup.backupFile(src2, dst)).toBe(false);
    });

    it(`Folder`, async () => {
      const file1 = path.join(testPath.templates, "template1.md");
      const file2 = path.join(testPath.templates, "template2.md");

      const doesNotExist = path.join(testPath.base, "doesNotExist");

      const dst = path.join(testPath.backupDest, "templates");
      const checkFile1 = path.join(dst, "template1.md");
      const checkFile2 = path.join(dst, "template2.md");

      fs.writeFileSync(file1, "template1");
      fs.writeFileSync(file2, "template2");

      expect(await backup.backupFolder(testPath.templates, dst)).toBe(true);
      expect(fs.existsSync(checkFile1)).toBe(true);
      expect(fs.existsSync(checkFile2)).toBe(true);

      expect(await backup.backupFolder(doesNotExist, dst)).toBe(false);
    });
  });
});
