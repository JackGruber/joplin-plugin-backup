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
});
