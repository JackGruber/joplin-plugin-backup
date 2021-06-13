import joplin from "api";
import { SettingItemType } from "api/types";

export namespace Settings {
  export async function register() {
    await joplin.settings.registerSection("backupSection", {
      label: "Backup",
      iconName: "fas fa-archive",
    });

    await joplin.settings.registerSetting("path", {
      value: "",
      type: SettingItemType.String,
      section: "backupSection",
      public: true,
      label: "Backup Path",
    });

    await joplin.settings.registerSetting("singleJex", {
      value: false,
      type: SettingItemType.Bool,
      section: "backupSection",
      public: true,
      label: "Single JEX",
      description: "Create only one JEX file for all notebooks.",
    });

    await joplin.settings.registerSetting("backupRetention", {
      value: 1,
      minimum: 1,
      maximum: 999,
      type: SettingItemType.Int,
      section: "backupSection",
      public: true,
      label: "Keep x Backups",
      description:
        "If more than one verison is configured, date (YYYYMMDDHHMM) folders are created in the Backup Path. ",
    });

    await joplin.settings.registerSetting("backupInterval", {
      value: 24,
      minimum: 0,
      maximum: 999,
      type: SettingItemType.Int,
      section: "backupSection",
      public: true,
      label: "Backup interval in hours",
      description: "0 = disable automatic backup",
    });

    await joplin.settings.registerSetting("onlyOnChange", {
      value: false,
      type: SettingItemType.Bool,
      section: "backupSection",
      public: true,
      label: "Only on change",
      description:
        "Creates a backup at the specified backup interval only if there was a change.",
    });

    await joplin.settings.registerSetting("password", {
      value: "",
      type: SettingItemType.String,
      section: "backupSection",
      public: true,
      secure: true,
      label: "Password",
      description:
        "If a password has been entered, the backups are protected with a password.",
    });

    await joplin.settings.registerSetting("passwordRepeat", {
      value: "",
      type: SettingItemType.String,
      section: "backupSection",
      public: true,
      secure: true,
      label: "Password (Repeat)",
      description: "Repeat password to validate.",
    });

    await joplin.settings.registerSetting("lastBackup", {
      value: 0,
      type: SettingItemType.Int,
      section: "backupSection",
      public: false,
      label: "last backup run",
    });

    await joplin.settings.registerSetting("fileLogLevel", {
      value: "error",
      type: SettingItemType.String,
      section: "backupSection",
      isEnum: true,
      public: true,
      label: "Logfile",
      options: {
        false: "Off",
        verbose: "Verbose",
        info: "Info",
        error: "Error",
      },
    });
  }
}
