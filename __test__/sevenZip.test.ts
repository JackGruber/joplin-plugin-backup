import { sevenZip } from "../src/sevenZip";
import * as path from "path";
import * as fs from "fs-extra";

const testBaseDir = path.join(__dirname, "ziptests");

describe("Test sevenZip", function () {
  beforeAll(async () => {});

  beforeEach(async () => {
    fs.emptyDirSync(testBaseDir);
  });

  afterAll(async () => {
    fs.removeSync(testBaseDir);
  });

  it(`List`, async () => {
    const file1Name = "file1.txt";
    const file2Name = "file2.txt";
    const file3Name = "file3.txt";
    const file1 = path.join(testBaseDir, file1Name);
    fs.emptyDirSync(path.join(testBaseDir, "sub"));
    const file2 = path.join(testBaseDir, "sub", file2Name);
    const file3 = path.join(testBaseDir, file3Name);
    const zip = path.join(testBaseDir, "file.7z");
    fs.writeFileSync(file1, "file");
    fs.writeFileSync(file2, "file");
    fs.writeFileSync(file3, "file");
    expect(fs.existsSync(file1)).toBe(true);
    expect(fs.existsSync(file2)).toBe(true);
    expect(fs.existsSync(file3)).toBe(true);
    expect(fs.existsSync(zip)).toBe(false);

    expect(await sevenZip.add(zip, testBaseDir + "\\*", "secret")).toBe(true);
    expect(fs.existsSync(zip)).toBe(true);

    const fileList = await sevenZip.list(zip, "secret");
    expect(fileList.length).toBe(4);
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
