import joplin from "api";
import { SettingItemType, SettingItemSubType } from "api/types";
import { helper } from "./helper";
import { i18n } from "./Backup";

export namespace Settings {
  export async function register() {
    await joplin.settings.registerSection("backupSection", {
      label: "Backup",
      iconName: "fas fa-archive",
    });

    const joplinVersionInfo = await helper.joplinVersionInfo();
    let pathSettings = null;
    pathSettings = {
      value: "",
      type: SettingItemType.String,
      section: "backupSection",
      public: true,
      label: i18n.__("settings.path.label"),
      description: i18n.__("settings.path.description"),
    };

    let exportPathSettings = null;
    exportPathSettings = {
      value: "",
      type: SettingItemType.String,
      section: "backupSection",
      public: true,
      advanced: true,
      label: i18n.__("settings.exportPath.label"),
      description: i18n.__("settings.exportPath.description"),
    };

    // Add DirectoryPath selector for newer Joplin versions
    if (
      joplinVersionInfo !== null &&
      (await helper.versionCompare(joplinVersionInfo.version, "2.10.4")) >= 0
    ) {
      pathSettings["subType"] = SettingItemSubType.DirectoryPath;
      exportPathSettings["subType"] = SettingItemSubType.DirectoryPath;
    }

    // Make export Format only onb Joplin > 2.9.12 public
    let exportFormatPublic = false;
    if (
      joplinVersionInfo !== null &&
      (await helper.versionCompare(joplinVersionInfo.version, "2.9.12")) >= 0
    ) {
      exportFormatPublic = true;
    }

    await joplin.settings.registerSettings({
      path: pathSettings,
      backupRetention: {
        value: 1,
        minimum: 1,
        maximum: 999,
        type: SettingItemType.Int,
        section: "backupSection",
        public: true,
        label: i18n.__("settings.backupRetention.label"),
        description: i18n.__("settings.backupRetention.description"),
      },
      backupInterval: {
        value: 24,
        minimum: 0,
        maximum: 999,
        type: SettingItemType.Int,
        section: "backupSection",
        public: true,
        label: i18n.__("settings.backupInterval.label"),
        description: i18n.__("settings.backupInterval.description"),
      },
      onlyOnChange: {
        value: false,
        type: SettingItemType.Bool,
        section: "backupSection",
        public: true,
        label: i18n.__("settings.onlyOnChange.label"),
        description: i18n.__("settings.onlyOnChange.description"),
      },
      usePassword: {
        value: false,
        type: SettingItemType.Bool,
        section: "backupSection",
        public: true,
        label: i18n.__("settings.usePassword.label"),
        description: i18n.__("settings.usePassword.description"),
      },
      password: {
        value: "password",
        type: SettingItemType.String,
        section: "backupSection",
        public: true,
        secure: true,
        label: i18n.__("settings.password.label"),
        description: i18n.__("settings.password.description"),
      },
      passwordRepeat: {
        value: "repeat12",
        type: SettingItemType.String,
        section: "backupSection",
        public: true,
        secure: true,
        label: i18n.__("settings.passwordRepeat.label"),
        description: i18n.__("settings.passwordRepeat.description"),
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
        label: i18n.__("settings.fileLogLevel.label"),
        description: i18n.__("settings.fileLogLevel.description"),
        options: {
          false: "Off",
          verbose: "Verbose",
          info: "Info",
          warn: "Warning",
          error: "Error",
        },
      },
      createSubfolder: {
        value: true,
        type: SettingItemType.Bool,
        section: "backupSection",
        public: true,
        advanced: true,
        label: i18n.__("settings.createSubfolder.label"),
        description: i18n.__("settings.createSubfolder.description", {
          backupPath: i18n.__("settings.path.label"),
        }),
      },
      zipArchive: {
        value: "no",
        type: SettingItemType.String,
        section: "backupSection",
        isEnum: true,
        public: true,
        advanced: true,
        options: {
          no: "No",
          yes: "Yes",
          yesone: "Yes, one archive",
        },
        label: i18n.__("settings.zipArchive.label"),
        description: i18n.__("settings.zipArchive.description"),
      },
      compressionLevel: {
        value: 0,
        type: SettingItemType.Int,
        section: "backupSection",
        isEnum: true,
        public: true,
        advanced: true,
        options: {
          0: "Copy (no compression)",
          1: "Fastest",
          3: "Fast",
          5: "Normal",
          7: "Maximum",
          9: "Ultra",
        },
        label: i18n.__("settings.compressionLevel.label"),
        description: i18n.__("settings.compressionLevel.description"),
      },
      exportPath: exportPathSettings,
      backupSetName: {
        value: "{YYYYMMDDHHmm}",
        type: SettingItemType.String,
        section: "backupSection",
        public: true,
        advanced: true,
        label: i18n.__("settings.backupSetName.label"),
        description: i18n.__("settings.backupSetName.description"),
      },
      backupPlugins: {
        value: true,
        type: SettingItemType.Bool,
        section: "backupSection",
        public: true,
        advanced: true,
        label: i18n.__("settings.backupPlugins.label"),
        description: i18n.__("settings.backupPlugins.description"),
      },
      exportFormat: {
        value: "jex",
        type: SettingItemType.String,
        section: "backupSection",
        isEnum: true,
        public: exportFormatPublic,
        advanced: true,
        options: {
          jex: "Jex",
          md_frontmatter: "MD Frontmatter",
          raw: "RAW",
        },
        label: i18n.__("settings.exportFormat.label"),
        description: i18n.__("settings.exportFormat.description"),
      },
      singleJexV2: {
        value: true,
        type: SettingItemType.Bool,
        section: "backupSection",
        public: true,
        advanced: true,
        label: i18n.__("settings.singleJex.label"),
        description: i18n.__("settings.singleJex.description"),
      },
      singleJex: {
        value: false,
        type: SettingItemType.Bool,
        section: "backupSection",
        public: false,
        advanced: true,
        label: "Single JEX",
        description: "Old setting, for compatibility and upgrade only.",
      },
      execFinishCmd: {
        value: "",
        type: SettingItemType.String,
        section: "backupSection",
        public: true,
        advanced: true,
        label: i18n.__("settings.execFinishCmd.label"),
        description: i18n.__("settings.execFinishCmd.description"),
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
