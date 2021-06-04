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
    backup.setLogLevel("warn", "warn");
  });

  it(`File`, async () => {
    const testPath = await getTestPaths();
    const src = path.join(testPath.joplinProfile, "settings.json");
    const dst = path.join(testPath.backupDest, "settings.json");
    fs.writeFileSync(src, "data");

    expect(await backup.backupFile(src, dst)).toBe(true);
    expect(fs.existsSync(dst)).toBe(true);
  });
});
