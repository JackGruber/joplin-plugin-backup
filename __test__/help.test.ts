import { helper } from "../src/helper";

describe("Test helper", function () {
  it(`validFileName`, async () => {
    const testCases = [
      {
        fileName: "some test file.txt",
        expected: true,
      },
      {
        fileName: "some ^test file.txt",
        expected: true,
      },
      {
        fileName: "some :test file.txt",
        expected: false,
      },
      {
        fileName: "some \\test file.txt",
        expected: false,
      },
      {
        fileName: "some |test file.txt",
        expected: false,
      },
      {
        fileName: "some /test file.txt",
        expected: false,
      },
      {
        fileName: "some *test file.txt",
        expected: false,
      },
      {
        fileName: "some ?test file.txt",
        expected: false,
      },
      {
        fileName: "some <test file.txt",
        expected: false,
      },
      {
        fileName: "some >test file.txt",
        expected: false,
      },
      {
        fileName: "com9.txt",
        expected: false,
      },
      {
        fileName: "nul.txt",
        expected: false,
      },
      {
        fileName: "prn.txt",
        expected: false,
      },
      {
        fileName: "con.txt",
        expected: false,
      },
      {
        fileName: "lpt5.txt",
        expected: false,
      },
    ];

    for (const testCase of testCases) {
      expect(await helper.validFileName(testCase.fileName)).toBe(
        testCase.expected
      );
    }
  });
  it(`Compare versions`, async () => {
    const testCases = [
      {
        version1: "2.9.12",
        version2: "2.9.12",
        expected: 0,
      },
      {
        version1: "2.9.12",
        version2: "2.9.13",
        expected: -1,
      },
      {
        version1: "2.9.13",
        version2: "2.9.12",
        expected: 1,
      },
      {
        version1: "2.10.6",
        version2: "2.9.12",
        expected: 1,
      },
      {
        version1: "3.10.6",
        version2: "2.11.8",
        expected: 1,
      },
      {
        version1: "2.10.6",
        version2: "3.11.8",
        expected: -1,
      },
      {
        version1: "2",
        version2: "2.1",
        expected: -1,
      },
      {
        version1: "2.1",
        version2: "2",
        expected: 1,
      },
      {
        version1: "3",
        version2: "2",
        expected: 1,
      },
      {
        version1: "2",
        version2: "2",
        expected: 0,
      },
      {
        version1: "3.11.8",
        version2: "3.11.8-a",
        expected: 0,
      },
      {
        version1: "2",
        version2: "",
        expected: -2,
      },
      {
        version1: "3.a.8",
        version2: "3.11.8",
        expected: -1,
      },
    ];

    for (const testCase of testCases) {
      expect(
        await helper.versionCompare(testCase.version1, testCase.version2)
      ).toBe(testCase.expected);
    }
  });
});
