import joplin from "api";
import { SettingItemType } from "api/types";

export namespace Settings {
  export async function register() {
    await joplin.settings.registerSection("backupSection", {
      label: "Backup",
      iconName: "fas fa-archive",
    });

    await joplin.settings.registerSettings({
      path: {
        value: "",
        type: SettingItemType.String,
        section: "backupSection",
        public: true,
        label: "Backup path",
      },
      singleJex: {
        value: false,
        type: SettingItemType.Bool,
        section: "backupSection",
        public: true,
        label: "Single JEX",
        description: "Create only one JEX file for all notebooks.",
      },
      backupRetention: {
        value: 1,
        minimum: 1,
        maximum: 999,
        type: SettingItemType.Int,
        section: "backupSection",
        public: true,
        label: "Keep x backups",
        description:
          "If more than one verison is configured, folders are created in the Backup Path acording to backupSetName setting.",
      },
      backupInterval: {
        value: 24,
        minimum: 0,
        maximum: 999,
        type: SettingItemType.Int,
        section: "backupSection",
        public: true,
        label: "Backup interval in hours",
        description: "0 = disable automatic backup",
      },
      onlyOnChange: {
        value: false,
        type: SettingItemType.Bool,
        section: "backupSection",
        public: true,
        label: "Only on change",
        description:
          "Creates a backup at the specified backup interval only if there was a change.",
      },
      usePassword: {
        value: false,
        type: SettingItemType.Bool,
        section: "backupSection",
        public: true,
        label: "Password protected backups",
        description: "Protect the backups via encrypted Zip archive.",
      },
      password: {
        value: "password",
        type: SettingItemType.String,
        section: "backupSection",
        public: true,
        secure: true,
        label: "Password",
        description:
          "If a password has been entered, the backups are protected with a password.",
      },
      passwordRepeat: {
        value: "repeat12",
        type: SettingItemType.String,
        section: "backupSection",
        public: true,
        secure: true,
        label: "Password (Repeat)",
        description: "Repeat password to validate.",
      },
      lastBackup: {
        value: 0,
        type: SettingItemType.Int,
        section: "backupSection",
        public: false,
        label: "last backup run",
      },
      fileLogLevel: {
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
          warn: "Warning",
          error: "Error",
        },
      },
      zipArchive: {
        value: "no",
        type: SettingItemType.String,
        section: "backupSection",
        isEnum: true,
        public: true,
        label: "Create zip archive",
        advanced: true,
        options: {
          no: "No",
          yes: "Yes",
          yesone: "Yes, one archive",
        },
        description:
          "If a password protected backups is set, a zip archive is always created.",
      },
      compressionLevel: {
        value: 0,
        type: SettingItemType.Int,
        section: "backupSection",
        isEnum: true,
        public: true,
        label: "Zip compression level",
        advanced: true,
        options: {
          0: "Copy (no compression)",
          1: "Fastest",
          3: "Fast",
          5: "Normal",
          7: "Maximum",
          9: "Ultra",
        },
        description: "Compression level for zip archive.",
      },
      exportPath: {
        value: "",
        type: SettingItemType.String,
        section: "backupSection",
        public: true,
        advanced: true,
        label: "Temporary export path",
        description:
          "Temporary path for note export from Joplin, before they are copyed to backup destination.",
      },
      backupSetName: {
        value: "{YYYYMMDDHHmm}",
        type: SettingItemType.String,
        section: "backupSection",
        public: true,
        advanced: true,
        label: "Backup set name",
        description:
          "Name of the backup set if multiple backups are to be keep.",
      },
      backupVersion: {
        value: 0,
        type: SettingItemType.Int,
        section: "backupSection",
        public: false,
        label: "Backup Version",
      },
      backupInfo: {
        value: "[]",
        type: SettingItemType.String,
        section: "backupSection",
        public: false,
        label: "Backup info",
      },
    });
  }
}
