import { Backup } from "../src/Backup";
import joplin from "api";
import { when } from "jest-when";

let backup = null;

describe("Password", function () {
  beforeEach(async () => {
    backup = new Backup() as any;
  });

  it(`Check`, async () => {
    const spyOnsSettingsValue = jest.spyOn(joplin.settings, "value");
    const spyOnsSettingsSetValue = jest.spyOn(joplin.settings, "setValue");

    const testCases = [
      {
        usePassword: false,
        password: "",
        passwordRepeat: "",
        expected: 0,
        called: 2,
      },
      {
        usePassword: false,
        password: "test",
        passwordRepeat: "test",
        expected: 0,
        called: 2,
      },
      {
        usePassword: false,
        password: "testA",
        passwordRepeat: "testB",
        expected: 0,
        called: 2,
      },
      {
        usePassword: true,
        password: "test",
        passwordRepeat: "test",
        expected: 1,
        called: 0,
      },
      {
        usePassword: true,
        password: "testA",
        passwordRepeat: "testB",
        expected: -1,
        called: 2,
      },
      {
        usePassword: true,
        password: " ",
        passwordRepeat: " ",
        expected: -1,
        called: 2,
      },
      {
        usePassword: true,
        password: "",
        passwordRepeat: " ",
        expected: -1,
        called: 2,
      },
    ];

    for (const testCase of testCases) {
      /* prettier-ignore */
      when(spyOnsSettingsValue)
        .mockImplementation(() => Promise.resolve("no mockImplementation"))
        .calledWith("usePassword").mockImplementation(() => Promise.resolve(testCase.usePassword))
        .calledWith("password").mockImplementation(() => Promise.resolve(testCase.password))
        .calledWith("passwordRepeat").mockImplementation(() => Promise.resolve(testCase.passwordRepeat));
      expect(await backup.checkPassword()).toBe(testCase.expected);

      await backup.enablePassword();
      expect(spyOnsSettingsSetValue).toBeCalledTimes(testCase.called);
      spyOnsSettingsSetValue.mockReset();
    }
  });
});
