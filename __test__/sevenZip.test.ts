import { sevenZip } from "../src/sevenZip";
import * as path from "path";
import * as fs from "fs-extra";

const testBaseDir = path.join(__dirname, "tests");

describe("Test sevenZip", function () {
  beforeAll(async () => {});

  beforeEach(async () => {
    fs.emptyDirSync(testBaseDir);
  });

  afterAll(async () => {
    fs.removeSync(testBaseDir);
  });

  describe("Add", function () {
    it(`File`, async () => {
      const fileName = "file.txt";
      const file = path.join(testBaseDir, fileName);
      const zip = path.join(testBaseDir, "file.7z");
      fs.writeFileSync(file, "file");
      expect(fs.existsSync(file)).toBe(true);
      expect(fs.existsSync(zip)).toBe(false);

      const result = await sevenZip.add(zip, file);
      expect(result).toBe(true);
      expect(fs.existsSync(zip)).toBe(true);

      const fileList = await sevenZip.list(zip);
      expect(fileList.length).toBe(1);
      expect(fileList[0].name).toBe(fileName);
    });

    it(`File with password`, async () => {
      const file = path.join(testBaseDir, "file.txt");
      const zip = path.join(testBaseDir, "file.7z");
      fs.writeFileSync(file, "file");
      expect(fs.existsSync(file)).toBe(true);
      expect(fs.existsSync(zip)).toBe(false);

      const result = await sevenZip.add(zip, file, "secret");
      expect(result).toBe(true);
      expect(fs.existsSync(zip)).toBe(true);

      const testWrongPassword = await sevenZip.test(zip, "wrongpassword");
      expect(testWrongPassword).toBe("Exited with code 2");

      const test = await sevenZip.test(zip, "secret");
      expect(test.method.includes("AES")).toBe(true);
    });
  });
});
