import { Backup } from "../src/Backup";
import joplin from "api";
import { when } from "jest-when";
import { I18n } from "i18n";

let backup = null;

let spyOnLogVerbose = null;
let spyOnLogInfo = null;
let spyOnLogWarn = null;
let spyOnLogError = null;
let spyOnShowError = null;

describe("Password", function () {
  beforeEach(async () => {
    backup = new Backup() as any;

    spyOnLogVerbose = jest
      .spyOn(backup.log, "verbose")
      .mockImplementation(() => {});
    spyOnLogInfo = jest.spyOn(backup.log, "info").mockImplementation(() => {});
    spyOnLogWarn = jest.spyOn(backup.log, "warn").mockImplementation(() => {});
    spyOnLogError = jest
      .spyOn(backup.log, "error")
      .mockImplementation(() => {});

    spyOnShowError = jest
      .spyOn(backup, "showError")
      .mockImplementation(() => {});
  });

  afterEach(async () => {
    spyOnLogVerbose.mockReset();
    spyOnLogInfo.mockReset();
    spyOnLogWarn.mockReset();
    spyOnLogError.mockReset();
    spyOnShowError.mockReset();
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

      if (testCase.expected == 1) {
        expect(backup.password).toBe(testCase.password);
      }
      expect(spyOnsSettingsSetValue).toBeCalledTimes(testCase.called);
      expect(backup.log.error).toHaveBeenCalledTimes(0);
      expect(backup.log.warn).toHaveBeenCalledTimes(0);
      spyOnsSettingsSetValue.mockReset();
    }
  });

  it(`Check node-7z bug`, async () => {
    const spyOnsSettingsValue = jest.spyOn(joplin.settings, "value");
    const spyOnsSettingsSetValue = jest.spyOn(joplin.settings, "setValue");
    jest.spyOn(backup, "getTranslation").mockImplementation(() => {});
    const spyOnShowMsg = jest
      .spyOn(backup, "showMsg")
      .mockImplementation(() => {});

    const testCases = [
      {
        password: "1password",
        fail: false,
      },
      {
        password: '2pass"word',
        fail: true,
      },
    ];

    for (const testCase of testCases) {
      when(spyOnsSettingsValue)
        .mockImplementation(() => Promise.resolve("no mockImplementation"))
        .calledWith("usePassword")
        .mockImplementation(() => Promise.resolve(true))
        .calledWith("password")
        .mockImplementation(() => Promise.resolve(testCase.password))
        .calledWith("passwordRepeat")
        .mockImplementation(() => Promise.resolve(testCase.password));

      await backup.enablePassword();

      if (testCase.fail == false) {
        expect(backup.password).toBe(testCase.password);
        expect(backup.log.error).toHaveBeenCalledTimes(0);
        expect(spyOnShowMsg).toHaveBeenCalledTimes(0);
      } else {
        expect(backup.password).toBe(null);
        expect(backup.log.error).toHaveBeenCalledTimes(1);
        expect(spyOnShowMsg).toHaveBeenCalledTimes(1);
      }

      expect(backup.log.warn).toHaveBeenCalledTimes(0);
      spyOnsSettingsSetValue.mockReset();
      spyOnShowMsg.mockReset();
    }
  });
});
