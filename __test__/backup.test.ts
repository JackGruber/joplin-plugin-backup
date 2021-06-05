import { Backup } from "../src/Backup";
import * as fs from "fs-extra";
import * as path from "path";

async function getTestPaths(): Promise<any> {
  const testPath: any = {};
  testPath.base = path.join(__dirname, "tests");
  testPath.backupDest = path.join(testPath.base, "Backup");
  testPath.joplinProfile = path.join(testPath.base, "joplin-desktop");
  testPath.templates = path.join(testPath.joplinProfile, "templates");
  return testPath;
}

let backup = null;

async function createTestStructure() {
  const test = await getTestPaths();
  fs.emptyDirSync(test.base);
  fs.emptyDirSync(test.backupDest);
  fs.emptyDirSync(test.joplinProfile);
  fs.emptyDirSync(test.templates);
}

describe("Backup", function () {
  beforeEach(async () => {
    await createTestStructure();
    backup = new Backup() as any;
    backup.log.transports.console.level = "warn";
    backup.log.transports.file.level = "warn";
  });

  it(`File`, async () => {
    const testPath = await getTestPaths();
    const src1 = path.join(testPath.joplinProfile, "settings.json");
    const src2 = path.join(testPath.joplinProfile, "doesNotExist.json");
    const dst = path.join(testPath.backupDest, "settings.json");
    fs.writeFileSync(src1, "data");

    expect(await backup.backupFile(src1, dst)).toBe(true);
    expect(fs.existsSync(dst)).toBe(true);

    expect(await backup.backupFile(src2, dst)).toBe(false);
  });
});
