import { Settings } from "./settings";
import { MenuItemLocation } from "api/types";
import joplin from "api";
import * as path from "path";
import backupLogging from "electron-log";
import * as fs from "fs-extra";
import * as os from "os";
import { sevenZip } from "./sevenZip";
import * as moment from "moment";
import { helper } from "./helper";
import { exec } from "child_process";
import { I18n } from "i18n";

let i18n: any;

class Backup {
  private msgDialog: any;
  private backupBasePath: string;
  private activeBackupPath: string;
  private log: any;
  private logFile: string;
  private backupRetention: number;
  private timer: any;
  private passwordEnabled: boolean;
  private password: string;
  private backupStartTime: Date;
  private zipArchive: string;
  private backupPlugins: boolean;
  private compressionLevel: number;
  private singleJex: boolean;
  private createSubfolder: boolean;
  private backupSetName: string;
  private exportFormat: string;
  private execFinishCmd: string;
  private suppressErrorMsgUntil: number;

  constructor() {
    this.log = backupLogging;
    this.setupLog();
  }

  public async init() {
    this.log.verbose("Backup Plugin init");

    const installationDir = await joplin.plugins.installationDir();
    this.logFile = path.join(installationDir, "activeBackup.log");

    await this.confLocale(path.join(installationDir, "locales"));
    await this.registerSettings();
    await this.registerCommands();
    await this.registerMenues();
    await this.createErrorDialog();
    await this.loadSettings();
    await this.startTimer();
    await this.upgradeBackupPluginVersion();
    await sevenZip.updateBinPath();
    await sevenZip.setExecutionFlag();
    this.backupStartTime = null;
    this.suppressErrorMsgUntil = 0;
  }

  private async confLocale(localesDir: string) {
    this.log.verbose("Conf translation");
    const joplinLocale = await joplin.settings.globalValue("locale");
    i18n = new I18n({
      locales: ["en_US", "de_DE", "zh_CN"],
      defaultLocale: "en_US",
      fallbacks: { "en_*": "en_US" },
      updateFiles: false,
      retryInDefaultLocale: true,
      syncFiles: true,
      directory: localesDir,
      objectNotation: true,
    });
    i18n.setLocale(joplinLocale);
    this.log.verbose("localesDir: " + localesDir);
    this.log.verbose("JoplinLocale: " + joplinLocale);
    this.log.verbose("i18nLocale: " + i18n.getLocale());
  }

  private async upgradeBackupPluginVersion() {
    this.log.verbose("Upgrade Backup Plugin");
    let startVersion = await joplin.settings.value("backupVersion");
    let version = startVersion;
    const targetVersion = 3;
    for (
      let checkVersion = version + 1;
      checkVersion <= targetVersion;
      checkVersion++
    ) {
      try {
        if (checkVersion === 1) {
          if (this.backupBasePath !== "" && this.backupRetention > 1) {
            await this.saveOldBackupInfo();
          }
        } else if (checkVersion === 2) {
          // When a path is set from old installation, disable the subfolder creation
          if (
            this.backupBasePath &&
            this.backupBasePath !== "" &&
            startVersion === 1
          ) {
            this.log.verbose("createSubfolder: false");
            this.createSubfolder = false;
            await joplin.settings.setValue("createSubfolder", false);
          }
        } else if (checkVersion === 3) {
          // Apply value from singleJex to singleJexV2, because the default value was changed and for this a new field was added
          if (startVersion > 0) {
            this.log.verbose("singleJexV2: set to value from singleJex");
            await joplin.settings.setValue(
              "singleJexV2",
              await joplin.settings.value("singleJex")
            );
          }
        }

        version = checkVersion;
        await joplin.settings.setValue("backupVersion", version);
      } catch (e) {
        await this.showError(
          i18n.__("msg.error.PluginUpgrade", checkVersion, e.message)
        );
      }
    }
  }

  private async saveOldBackupInfo() {
    const folders = fs
      .readdirSync(this.backupBasePath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .reverse();

    for (let folder of folders) {
      if (parseInt(folder) > 202100000000) {
        let date = new Date(
          folder.substring(0, 4),
          folder.substring(4, 6) - 1,
          folder.substring(6, 8),
          folder.substring(8, 10),
          folder.substring(10, 12)
        );

        await this.saveBackupInfo(folder, date.getTime());
      }
    }
  }

  private async saveBackupInfo(folder: string, date: number) {
    const info = JSON.parse(await joplin.settings.value("backupInfo"));
    const backup = { name: folder, date: date };
    info.push(backup);
    await joplin.settings.setValue("backupInfo", JSON.stringify(info));
  }

  public async registerSettings() {
    await Settings.register();
  }

  // For mock ups
  private async getTranslation(key: string): Promise<string> {
    return i18n.__(key);
  }

  private async enablePassword() {
    const usePassword = await joplin.settings.value("usePassword");
    if (usePassword === true && (await this.checkPassword()) === 1) {
      const pw = await joplin.settings.value("password");

      // Check for node-7z bug with double quotes
      // https://github.com/JackGruber/joplin-plugin-backup/issues/53
      // https://github.com/quentinrossetti/node-7z/issues/132
      if (pw.indexOf('"') >= 0) {
        this.log.error(
          'enablePassword: Password contains " (double quotes), disable password'
        );
        this.passwordEnabled = false;
        this.password = null;

        await this.showMsg(
          await this.getTranslation("msg.error.passwordDoubleQuotes")
        );
      } else {
        this.passwordEnabled = true;
        this.password = pw;
      }
    } else {
      this.passwordEnabled = false;
      this.password = null;

      await joplin.settings.setValue("password", "password");
      await joplin.settings.setValue("passwordRepeat", "repeat12");
    }
  }

  private async checkPassword(): Promise<number> {
    const password: string = await joplin.settings.value("password");
    const passwordRepeat: string = await joplin.settings.value(
      "passwordRepeat"
    );
    if ((await joplin.settings.value("usePassword")) === false) {
      return 0; // Not set
    } else if (
      password.trim() !== passwordRepeat.trim() ||
      password.trim() === ""
    ) {
      return -1; // PWs not OK
    } else {
      return 1; // PW OK
    }
  }

  private async setupLog() {
    const logFormat = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";
    this.log.transports.file.level = false;
    this.log.transports.file.format = logFormat;
    this.log.transports.console.level = "verbose";
    this.log.transports.console.format = logFormat;
  }

  private async fileLogging(enable: boolean) {
    const fileLogLevel = await joplin.settings.value("fileLogLevel");

    if (enable === true && fileLogLevel !== "false") {
      this.log.transports.file.resolvePath = () => this.logFile;
      this.log.transports.file.level = fileLogLevel;
    } else {
      this.log.transports.file.level = false;
    }
  }

  private async deleteLogFile() {
    this.log.verbose("Delete log file");
    if (fs.existsSync(this.logFile)) {
      try {
        await fs.unlinkSync(this.logFile);
      } catch (e) {
        this.log.error("deleteLogFile: " + e.message);
      }
    }
  }

  public async registerCommands() {
    await joplin.commands.register({
      name: "CreateBackup",
      label: i18n.__("command.createBackup"),
      execute: async () => {
        await this.start(true);
      },
    });
  }

  public async registerMenues() {
    await joplin.views.menuItems.create(
      "myMenuItemToolsCreateBackup",
      "CreateBackup",
      MenuItemLocation.Tools
    );
  }

  private async loadBackupPath() {
    this.log.verbose("loadBackupPath");
    const pathSetting = await joplin.settings.value("path");
    const profileDir = await joplin.settings.globalValue("profileDir");

    if (path.isAbsolute(pathSetting)) {
      this.backupBasePath = path.normalize(pathSetting);
    } else {
      this.backupBasePath = path.join(
        path.normalize(profileDir),
        path.normalize(pathSetting)
      );
    }

    if (this.createSubfolder) {
      this.log.verbose("append subFolder");
      const orgBackupBasePath = this.backupBasePath;
      this.backupBasePath = path.join(this.backupBasePath, "JoplinBackup");
      if (
        fs.existsSync(orgBackupBasePath) &&
        !fs.existsSync(this.backupBasePath)
      ) {
        try {
          fs.mkdirSync(this.backupBasePath);
        } catch (e) {
          await this.showError(i18n.__("msg.error.folderCreation", e.message));
        }
      }
    }

    const handleInvalidPath = async (errorId: string) => {
      const invalidBackupPath = this.backupBasePath;
      this.backupBasePath = null;
      await this.showError(i18n.__(errorId, invalidBackupPath));
    };

    if (helper.pathsEquivalent(profileDir, this.backupBasePath)) {
      await handleInvalidPath("msg.error.backupPathJoplinDir");
    } else if (helper.pathsEquivalent(os.homedir(), this.backupBasePath)) {
      await handleInvalidPath("msg.error.backupPathHomeDir");
    }
  }

  public async loadSettings() {
    this.log.verbose("loadSettings");
    this.createSubfolder = await joplin.settings.value("createSubfolder");
    await this.loadBackupPath();
    this.backupRetention = await joplin.settings.value("backupRetention");

    this.zipArchive = await joplin.settings.value("zipArchive");
    this.compressionLevel = await joplin.settings.value("compressionLevel");
    this.singleJex = await joplin.settings.value("singleJexV2");
    this.exportFormat = await joplin.settings.value("exportFormat");
    this.execFinishCmd = (await joplin.settings.value("execFinishCmd")).trim();

    this.backupPlugins = await joplin.settings.value("backupPlugins");

    this.backupSetName = await joplin.settings.value("backupSetName");
    if (
      this.backupSetName.trim() === "" ||
      (await this.getBackupSetFolderName()).trim() === "" ||
      (await helper.validFileName(this.backupSetName)) === false
    ) {
      this.backupSetName = "{YYYYMMDDHHmm}";
      await this.showError(
        i18n.__("msg.error.BackupSetNotSupportedChars", '\\/:*?"<>|')
      );
    }

    await this.enablePassword();
    await this.setActiveBackupPath();
  }

  private async createErrorDialog() {
    this.msgDialog = await joplin.views.dialogs.create("backupDialog");
    await joplin.views.dialogs.addScript(this.msgDialog, "webview.css");
  }

  private async showMsg(msg: string, title: string = null) {
    const html = [];

    if (title !== null) {
      this.log.info(`${title}: ${msg}`);
    } else {
      this.log.info(`${msg}`);
    }

    html.push('<div id="backuperror" style="backuperror">');
    html.push(`<h3>Backup plugin</h3>`);
    if (title) {
      html.push(`<p>${title}</p>`);
    }
    html.push(`<div id="msg">${msg}`);
    html.push("</div>");
    await joplin.views.dialogs.setButtons(this.msgDialog, [{ id: "ok" }]);
    await joplin.views.dialogs.setHtml(this.msgDialog, html.join("\n"));
    await joplin.views.dialogs.open(this.msgDialog);
  }

  private async showError(msg: string, title: string = null) {
    const html = [];

    if (title !== null) {
      this.log.error(`${title}: ${msg}`);
    } else {
      this.log.error(`${msg}`);
    }

    html.push('<div id="backuperror" style="backuperror">');
    html.push(`<h3>Backup plugin</h3>`);
    if (title) {
      html.push(`<p>${title}</p>`);
    }
    html.push(`<div id="errormsg">${msg}`);
    html.push("</div>");
    await joplin.views.dialogs.setButtons(this.msgDialog, [{ id: "ok" }]);
    await joplin.views.dialogs.setHtml(this.msgDialog, html.join("\n"));
    await joplin.views.dialogs.open(this.msgDialog);
    this.backupStartTime = null;
  }

  public async setActiveBackupPath() {
    let exportPath = await joplin.settings.value("exportPath");
    const profileDir = await joplin.settings.globalValue("profileDir");
    const tempDir = await joplin.settings.globalValue("tempDir");

    if (exportPath !== "") {
      if (path.isAbsolute(exportPath)) {
        exportPath = path.normalize(exportPath);
      } else {
        exportPath = path.join(
          path.normalize(profileDir),
          path.normalize(exportPath)
        );
      }
    }

    const folderName = "joplin_active_backup_job";
    if (this.backupBasePath !== null) {
      if (exportPath !== "") {
        this.activeBackupPath = path.join(exportPath, folderName);
      } else if (this.passwordEnabled === true) {
        this.activeBackupPath = path.join(tempDir, folderName);
      } else {
        this.activeBackupPath = path.join(this.backupBasePath, folderName);
      }
    } else {
      this.activeBackupPath = null;
    }
  }

  private async logSettings(showDoneMsg: boolean) {
    const settings = [
      "path",
      "singleJex",
      "singleJexV2",
      "backupRetention",
      "backupInterval",
      "onlyOnChange",
      "usePassword",
      "lastBackup",
      "fileLogLevel",
      "zipArchive",
      "compressionLevel",
      "exportPath",
      "backupSetName",
      "backupInfo",
      "backupVersion",
      "backupPlugins",
      "createSubfolder",
      "createSubfolder",
      "exportFormat",
    ];

    this.log.verbose("Plugin settings:");
    for (let setting of settings) {
      this.log.verbose(setting + ": " + (await joplin.settings.value(setting)));
    }
    this.log.verbose("activeBackupPath: " + this.activeBackupPath);
    this.log.verbose("backupBasePath: " + this.backupBasePath);
    this.log.verbose("logFile: " + this.logFile);
    this.log.verbose("showDoneMsg: " + showDoneMsg);
    this.log.verbose(
      "installationDir: " + (await joplin.plugins.installationDir())
    );
  }

  public async start(showDoneMsg: boolean = false) {
    if (this.backupStartTime === null) {
      this.backupStartTime = new Date();

      await this.deleteLogFile();
      await this.fileLogging(true);
      this.log.info("Backup started");

      await this.stopTimer();

      await this.loadSettings();

      await this.logSettings(showDoneMsg);

      if (this.backupBasePath === null) {
        await this.showError(i18n.__("msg.error.ConfigureBackupPath"));
        return;
      }

      if (fs.existsSync(this.backupBasePath)) {
        if ((await this.checkPassword()) === -1) {
          await this.showError(i18n.__("msg.error.PasswordMissMatch"));
          return;
        } else {
          this.log.info("Enable password protection: " + this.passwordEnabled);
        }
        this.log.verbose(`Backup path: ${this.backupBasePath}`);
        this.log.verbose(
          `Active backup path (export path): ${this.activeBackupPath}`
        );
        await this.createEmptyFolder(this.activeBackupPath, "");

        await this.backupProfileData();

        await this.backupNotebooks();

        const backupDst = await this.makeBackupSet();

        await joplin.settings.setValue(
          "lastBackup",
          this.backupStartTime.getTime()
        );
        this.log.info("Backup finished to: " + backupDst);

        await this.fileLogging(false);

        if (this.execFinishCmd !== "") {
          await this.execCmd(this.execFinishCmd);
        }

        this.log.info("Backup completed");
        await this.moveLogFile(backupDst);

        this.suppressErrorMsgUntil = 0;

        if (showDoneMsg === true) {
          await this.showMsg(i18n.__("msg.backup.completed"));
        }
      } else {
        const now = new Date();

        // Show error msg only every x hours on automatic runs
        if (
          showDoneMsg === false &&
          this.suppressErrorMsgUntil > now.getTime()
        ) {
          this.log.error(
            `The Backup path '${this.backupBasePath}' does not exist!`
          );
          this.log.info("Error dialog suppressed");
        } else {
          await this.showError(
            i18n.__("msg.error.BackupPathDontExist", this.backupBasePath)
          );

          if (showDoneMsg === false) {
            this.suppressErrorMsgUntil = now.getTime() + 6 * 60 * 60 * 1000;
          }
        }
      }

      this.backupStartTime = null;
      await this.startTimer();
    } else {
      this.log.warn(
        "Backup already running since " +
          moment(this.backupStartTime).format("YYYY-MM-DD HH:MM:SS") +
          " (" +
          this.backupStartTime.getTime() +
          ")"
      );

      if (showDoneMsg === true) {
        await this.showError(i18n.__("msg.error.BackupAlreadyRunning"));
      }
    }
  }

  private async makeBackupSet(): Promise<string> {
    let backupDst = "";
    if (this.zipArchive === "no" && this.passwordEnabled === false) {
      if (this.backupRetention > 1) {
        backupDst = await this.moveFinishedBackup();
        await this.deleteOldBackupSets(
          this.backupBasePath,
          this.backupRetention
        );
      } else {
        await this.clearBackupTarget(this.backupBasePath);
        backupDst = await this.moveFinishedBackup();
      }
    } else {
      const zipFile = await this.createZipArchive();
      if (this.backupRetention > 1) {
        backupDst = await this.moveFinishedBackup(zipFile);
        try {
          fs.removeSync(this.activeBackupPath);
        } catch (e) {
          await this.showError("" + e.message);
          throw e;
        }
        await this.deleteOldBackupSets(
          this.backupBasePath,
          this.backupRetention
        );
      } else {
        await this.clearBackupTarget(this.backupBasePath);
        backupDst = await this.moveFinishedBackup(zipFile);
      }
    }

    return backupDst;
  }

  private async createZipArchive() {
    this.log.info(`Create zip archive`);

    let zipFile = null;
    if (this.zipArchive === "yesone") {
      const singleZipFile = path.join(
        this.backupBasePath,
        "newJoplinBackup.7z"
      );

      if (fs.existsSync(singleZipFile)) {
        this.log.warn(
          `New Single ZIP already exist, delete file: ` + singleZipFile
        );
        fs.unlinkSync(singleZipFile);
      }

      zipFile = await this.addToZipArchive(
        singleZipFile,
        path.join(this.activeBackupPath, "*"),
        this.password
      );
    } else {
      const content = fs.readdirSync(this.activeBackupPath, {
        withFileTypes: true,
      });

      for (const file of content) {
        await this.addToZipArchive(
          path.join(this.activeBackupPath, file.name + ".7z"),
          path.join(
            this.activeBackupPath,
            file.isFile() ? file.name : path.join(file.name, "*")
          ),
          this.password
        );

        try {
          fs.removeSync(path.join(this.activeBackupPath, file.name));
        } catch (e) {
          await this.showError("" + e.message);
          throw e;
        }
      }
    }

    return zipFile;
  }

  private async addToZipArchive(
    zipFile: string,
    addFile: string,
    password: string,
    options: string[] = null
  ): Promise<string> {
    this.log.verbose(`Add ${addFile} to zip ${zipFile}`);

    let zipOptions: any = {};
    if (options) {
      zipOptions = { ...zipOptions, ...options };
    }
    zipOptions.method = [];
    if (this.compressionLevel) {
      zipOptions.method.push("x" + this.compressionLevel);
    } else {
      zipOptions.method.push("x0");
    }

    const status = await sevenZip.add(zipFile, addFile, password, zipOptions);
    if (status !== true) {
      await this.showError("createZipArchive: " + status);
      throw new Error("createZipArchive: " + status);
    }

    return zipFile;
  }

  private async moveLogFile(logDst: string): Promise<boolean> {
    this.log.verbose(`moveLogFile: ${logDst}`);
    const logfileName = "backup.log";
    let logFile = this.logFile;
    if (fs.existsSync(logFile)) {
      if (this.zipArchive === "yesone" || this.password !== null) {
        this.log.verbose(`Single zip or password`);
        if (this.zipArchive !== "yesone") {
          logDst = path.join(logDst, "backuplog.7z");
        }
        try {
          const newlogFile = path.join(path.dirname(logFile), logfileName);
          fs.renameSync(logFile, newlogFile);
          logFile = newlogFile;
        } catch (e) {
          await this.showError("moveLogFile rename: " + e.message);
          throw e;
        }
        await this.addToZipArchive(logDst, logFile, this.password, ["-sdel"]);
      } else {
        try {
          fs.moveSync(logFile, path.join(logDst, logfileName));
        } catch (e) {
          await this.showError("moveLogFile: " + e.message);
          throw e;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  private async backupNotebooks() {
    const notebooks = await this.selectNotebooks();

    if (this.exportFormat === "jex") {
      if (this.singleJex === true) {
        this.log.info("Create single file JEX backup");
        await this.exportNotebooks(
          notebooks.ids,
          path.join(this.activeBackupPath, "all_notebooks.jex"),
          this.exportFormat
        );
      } else {
        this.log.info("Export each notbook as JEX backup");
        for (const folderId of notebooks.ids) {
          if ((await this.notebookHasNotes(folderId)) === true) {
            this.log.verbose(
              `Export ${notebooks.info[folderId]["title"]} (${folderId})`
            );
            const notebookFile = await this.getNotebookFileName(
              notebooks.info,
              folderId
            );

            const file = await this.getNumberdFileNameIfExist(
              path.join(this.activeBackupPath, notebookFile)
            );
            this.log.verbose(`Save as ${file}`);

            await this.exportNotebooks(folderId, file, this.exportFormat);
          } else {
            this.log.verbose(
              `Skip ${notebooks.info[folderId]["title"]} (${folderId}) since no notes in notebook`
            );
          }
        }
      }
    } else {
      this.log.info("Export as " + this.exportFormat);
      const exportPath = path.join(this.activeBackupPath, "notes");
      if (!fs.existsSync(exportPath)) {
        try {
          fs.mkdirSync(exportPath);
        } catch (e) {
          await this.showError(i18n.__("msg.error.folderCreation", e.message));
        }
      }
      await this.exportNotebooks(notebooks.ids, exportPath, this.exportFormat);
    }
  }

  private async getNumberdFileNameIfExist(file: string): Promise<string> {
    const fileExt = path.parse(file).ext;
    const fileDir = path.parse(file).dir;
    const fileName = path.parse(file).name;

    let indexNr = 1;
    let checkFile = fileName;
    while (fs.existsSync(path.join(fileDir, checkFile + fileExt))) {
      checkFile = fileName + "_" + indexNr;
      indexNr++;
    }

    return path.join(fileDir, checkFile + fileExt);
  }

  private async getNotebookFileName(
    notebooks: any,
    id: string
  ): Promise<string> {
    const names = [];
    let parentId = "";

    do {
      names.push(notebooks[id].title);
      parentId = notebooks[id].parent_id;
      id = parentId;
    } while (parentId != "");
    return (
      names
        .reverse()
        .join("_")
        .replace(/[/\\?%*:|"<>]/g, "_") + ".jex"
    );
  }

  private async notebookHasNotes(notebookId: string): Promise<boolean> {
    let noteCheck = await joplin.data.get(["folders", notebookId, "notes"], {
      fields: "title, id",
    });

    if (noteCheck.items.length > 0) {
      return true;
    } else {
      return false;
    }
  }

  private async exportNotebooks(
    notebookIds: string[],
    file: string,
    format: string
  ) {
    try {
      let status: string = await joplin.commands.execute(
        "exportFolders",
        notebookIds,
        format,
        file
      );
    } catch (e) {
      await this.showError(i18n.__("msg.error.Backup", format, e.message));
      throw e;
    }
  }

  private async selectNotebooks(): Promise<any> {
    const noteBookInfo = {};
    const noteBooksIds = [];
    let pageNum = 1;
    this.log.info("Select notebooks for export");
    do {
      var folders = await joplin.data.get(["folders"], {
        fields: "id, title, parent_id",
        limit: 50,
        page: pageNum++,
      });
      for (const folder of folders.items) {
        noteBooksIds.push(folder.id);
        noteBookInfo[folder.id] = {};
        noteBookInfo[folder.id]["title"] = folder.title;
        noteBookInfo[folder.id]["parent_id"] = folder.parent_id;
        this.log.verbose("Add '" + folder.title + "' (" + folder.id + ")");
      }
    } while (folders.has_more);

    return {
      ids: noteBooksIds,
      info: noteBookInfo,
    };
  }

  private async getLastChangeDate(): Promise<number> {
    this.log.verbose("getLastChangeDate");

    let lastUpdate = 0;
    const toCheck = ["folders", "notes", "resources", "tags"];
    for (let check of toCheck) {
      try {
        let checkUpdated = await joplin.data.get([check], {
          fields: "title, id, updated_time",
          order_by: "updated_time",
          order_dir: "DESC",
          limit: 10,
          page: 1,
        });
        if (
          checkUpdated.items.length > 0 &&
          checkUpdated.items[0].updated_time > lastUpdate
        ) {
          lastUpdate = checkUpdated.items[0].updated_time;
        }
      } catch (error) {
        this.log.error(error);
      }
    }
    return lastUpdate;
  }

  public async stopTimer() {
    clearTimeout(this.timer);
    this.timer = null;
  }

  public async startTimer() {
    if (this.timer === undefined || this.timer === null) {
      this.timer = setTimeout(this.backupTime.bind(this), 1000 * 60 * 1);
    }
  }

  private async backupTime() {
    this.log.verbose("backupTime");

    const checkEver = 5;
    const backupInterval = await joplin.settings.value("backupInterval");
    const lastBackup = await joplin.settings.value("lastBackup");
    const onlyOnChange = await joplin.settings.value("onlyOnChange");
    const lastChange = await this.getLastChangeDate();
    const now = new Date();

    if (backupInterval > 0) {
      if (now.getTime() > lastBackup + backupInterval * 60 * 60 * 1000) {
        this.log.info("Backup interval reached");
        if (
          onlyOnChange === false ||
          (onlyOnChange === true &&
            (lastChange === 0 || lastBackup < lastChange))
        ) {
          await this.start(false);
        } else {
          this.log.info("create no backup (no change)");
        }
      }
      this.timer = setTimeout(
        this.backupTime.bind(this),
        1000 * 60 * checkEver
      );
    } else {
      this.log.info("Automatic backup disabled");
      this.timer = null;
    }
  }

  private async getBackupSetFolderName(folder: string = null): Promise<string> {
    return this.backupSetName.replace(/{([^}]+)}/g, (match, groups) => {
      const now = new Date(Date.now());
      return moment(now.getTime()).format(groups);
    });
  }

  private async createEmptyFolder(
    inPath: string,
    folder: string
  ): Promise<string> {
    const dir = path.join(inPath, folder);
    this.log.verbose("Create folder " + dir);
    try {
      fs.emptyDirSync(dir);
      return dir;
    } catch (e) {
      await this.showError(i18n.__("msg.error.folderCreation:", e.message));
      throw e;
    }
  }

  private async backupProfileData() {
    this.log.info("Backup Profile Data");

    const activeBackupFolderProfile = await this.createEmptyFolder(
      this.activeBackupPath,
      "profile"
    );
    const profileDir = await joplin.settings.globalValue("profileDir");

    // Backup Joplin settings
    await this.backupFile(
      path.join(profileDir, "settings.json"),
      path.join(activeBackupFolderProfile, "settings.json")
    );

    // Backup Keymap
    await this.backupFile(
      path.join(profileDir, "keymap-desktop.json"),
      path.join(activeBackupFolderProfile, "keymap-desktop.json")
    );

    // Backup userchrome.css
    await this.backupFile(
      path.join(profileDir, "userchrome.css"),
      path.join(activeBackupFolderProfile, "userchrome.css")
    );

    // Backup userstyle.css
    await this.backupFile(
      path.join(profileDir, "userstyle.css"),
      path.join(activeBackupFolderProfile, "userstyle.css")
    );

    // Backup plugins files
    if (this.backupPlugins === true) {
      await this.backupFolder(
        path.join(profileDir, "plugins"),
        path.join(activeBackupFolderProfile, "plugins")
      );
    }

    // Backup Templates
    try {
      await this.backupFolder(
        await await joplin.settings.globalValue("templateDir"),
        path.join(activeBackupFolderProfile, "templates")
      );
    } catch (error) {
      this.log.info("No templateDir, Joplin >= v2.2.5");
    }
  }

  private async backupFolder(src: string, dst: string): Promise<boolean> {
    if (fs.existsSync(src)) {
      this.log.verbose("Copy " + src);
      try {
        fs.copySync(src, dst);
        return true;
      } catch (e) {
        await this.showError(
          i18n.__("msg.error.fileCopy", "backupFolder", e.message)
        );
        throw e;
      }
    } else {
      this.log.info("no folder " + src);
      return false;
    }
  }

  private async backupFile(src: string, dest: string): Promise<boolean> {
    if (fs.existsSync(src)) {
      this.log.verbose("Copy " + src);
      try {
        fs.copyFileSync(src, dest);
        return true;
      } catch (e) {
        this.log.error("backupFile: " + e.message);
        throw e;
      }
    } else {
      this.log.verbose("No file '" + src);
      return false;
    }
  }

  private async moveFinishedBackup(zipFile: string = null): Promise<string> {
    this.log.info("Move finished backup");
    let backupDestination = null;
    if (this.backupRetention > 1) {
      const backupSetFolder = await this.getBackupSetFolderName();
      backupDestination = zipFile
        ? path.join(this.backupBasePath, backupSetFolder + ".7z")
        : path.join(this.backupBasePath, backupSetFolder);
      const src = zipFile ? zipFile : this.activeBackupPath;

      if (fs.existsSync(backupDestination)) {
        this.log.warn(`Backupset already exists: ${backupDestination}`);
        let ext = "";
        let name = path.basename(backupDestination);
        if (fs.statSync(backupDestination).isFile()) {
          ext = path.extname(backupDestination);
          name = name.replace(ext, "");
        }
        let nr = 0;
        let newBackupDestination = backupDestination;
        do {
          nr++;
          newBackupDestination = path.join(
            path.dirname(backupDestination),
            `${name} (${nr})${ext}`
          );
        } while (fs.existsSync(newBackupDestination));
        backupDestination = newBackupDestination;
        this.log.warn(`Backupset new name: ${backupDestination}`);
      }

      try {
        fs.moveSync(src, backupDestination);
      } catch (e) {
        await this.showError(
          i18n.__("msg.error.fileCopy", "moveFinishedBackup", e.message)
        );
        throw e;
      }

      await this.saveBackupInfo(
        path.basename(backupDestination),
        this.backupStartTime.getTime()
      );
    } else {
      if (zipFile) {
        backupDestination = path.join(this.backupBasePath, "JoplinBackup.7z");
        try {
          fs.moveSync(zipFile, backupDestination);
        } catch (e) {
          await this.showError(
            i18n.__("msg.error.fileCopy", "moveFinishedBackup", e.message)
          );
          throw e;
        }
      } else {
        backupDestination = this.backupBasePath;
        const backupData = fs
          .readdirSync(this.activeBackupPath, { withFileTypes: true })
          .map((dirent) => dirent.name);
        for (const file of backupData) {
          let dst = path.join(backupDestination, file);
          try {
            fs.moveSync(path.join(this.activeBackupPath, file), dst, {
              overwrite: true,
            });
          } catch (e) {
            await this.showError(
              i18n.__("msg.error.fileCopy", "moveFinishedBackup", e.message)
            );
            this.log.error(
              path.join(this.activeBackupPath, file) + " => " + dst
            );
            throw e;
          }
        }
      }

      try {
        fs.rmSync(this.activeBackupPath, {
          recursive: true,
        });
      } catch (e) {
        await this.showError(
          i18n.__("msg.error.fileCopy", "moveFinishedBackup", e.message)
        );
        throw e;
      }
    }

    return backupDestination;
  }

  private async clearBackupTarget(backupPath: string) {
    this.log.verbose(`Clear backup target`);
    // Remove only files
    const oldBackupData = fs
      .readdirSync(backupPath, { withFileTypes: true })
      .filter((dirent) => dirent.isFile())
      .map((dirent) => dirent.name)
      .reverse();
    for (const file of oldBackupData) {
      if (
        file !== path.basename(this.logFile) &&
        file !== "newJoplinBackup.7z"
      ) {
        try {
          fs.removeSync(path.join(backupPath, file));
        } catch (e) {
          await this.showError(
            i18n.__("msg.error.deleteFile", "clearBackupTarget", e.message)
          );
          throw e;
        }
      }
    }

    try {
      fs.removeSync(path.join(backupPath, "notes"));
    } catch (e) {
      await this.showError(
        i18n.__("msg.error.deleteFile", "clearBackupTarget", e.message)
      );
      throw e;
    }

    try {
      fs.removeSync(path.join(backupPath, "templates"));
    } catch (e) {
      await this.showError(
        i18n.__("msg.error.deleteFile", "clearBackupTarget", e.message)
      );
      throw e;
    }

    try {
      fs.removeSync(path.join(backupPath, "profile"));
    } catch (e) {
      await this.showError(
        i18n.__("msg.error.deleteFile", "clearBackupTarget", e.message)
      );
      throw e;
    }
  }

  private async deleteOldBackupSets(
    backupPath: string,
    backupRetention: number
  ) {
    this.log.verbose("deleteOldBackupSets");
    let info = JSON.parse(await joplin.settings.value("backupInfo"));
    let setOk = [];
    for (let check of info) {
      const folder = path.join(backupPath, check.name);
      if (fs.existsSync(folder)) {
        setOk.push(check);
      } else {
        this.log.verbose("Backup set " + folder + " no longer exist");
      }
    }
    await joplin.settings.setValue("backupInfo", JSON.stringify(setOk));
    info = JSON.parse(await joplin.settings.value("backupInfo"));
    if (info.length > backupRetention) {
      info.sort((a, b) => b.date - a.date);
    }

    while (info.length > backupRetention) {
      const del = info.splice(backupRetention, 1);
      const folder = path.join(backupPath, del[0].name);
      if (fs.existsSync(folder)) {
        this.log.verbose("Remove backup set " + folder);

        try {
          if (fs.lstatSync(folder).isDirectory()) {
            fs.rmSync(folder, {
              recursive: true,
            });
          } else {
            fs.unlinkSync(folder);
          }
        } catch (e) {
          await this.showError(
            i18n.__("msg.error.deleteFile", "deleteOldBackupSets", e.message)
          );
          throw e;
        }
      }
      await joplin.settings.setValue("backupInfo", JSON.stringify(info));
    }
  }

  private async execCmd(cmd: string): Promise<boolean> {
    this.log.info("execCmd: " + cmd);
    exec(cmd, (error, stdout, stderr) => {
      this.log.verbose("execCmd stdout: " + stdout);
      this.log.verbose("execCmd stderr: " + stderr);
      if (error) {
        this.log.error(`execCmd error: ${error}`);
        return false;
      }
    });
    return true;
  }
}

export { Backup, i18n };
