import { Settings } from "./settings";
import { MenuItemLocation } from "api/types";
import joplin from "api";
import * as path from "path";
import backupLogging from "electron-log";
import * as fs from "fs-extra";
import { joplinWrapper } from "./joplinWrapper";
import { sevenZip } from "./sevenZip";

class Backup {
  private errorDialog: any;
  private backupBasePath: string;
  private activeBackupPath: string;
  private log: any;
  private logFile: string;
  private backupRetention: number;
  private timer: any;
  private passwordEnabled: boolean;
  private password: string;
  private passwordRepeat: string;
  private backupStartTime: Date;
  private zipArchive: string;
  private singleJex: boolean;

  constructor() {
    this.log = backupLogging;
    this.setupLog();
  }

  public async init() {
    this.log.verbose("Backup Plugin init");
    await this.registerSettings();
    await this.registerCommands();
    await this.registerMenues();
    await this.createErrorDialog();
    await this.loadSettings();
    await this.startTimer();
    await this.upgradeBackupTargetVersion();
    await sevenZip.updateBinPath();
  }

  private async upgradeBackupTargetVersion() {
    let version = await joplinWrapper.settingsValue("backupVersion");
    const targetVersion = 1;
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
        }

        version = checkVersion;
        await joplin.settings.setValue("backupVersion", version);
      } catch (e) {
        await this.showError(`Upgrade error ${checkVersion}: ${e.message}`);
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
    const info = JSON.parse(await joplinWrapper.settingsValue("backupInfo"));
    const backup = { name: folder, date: date };
    info.push(backup);
    await joplin.settings.setValue("backupInfo", JSON.stringify(info));
  }

  public async registerSettings() {
    await Settings.register();
  }

  private async enablePassword() {
    if ((await this.checkPassword()) === 1) {
      this.passwordEnabled = true;
    } else {
      this.passwordEnabled = false;
      this.password = null;
    }
  }

  private async checkPassword(): Promise<number> {
    if (this.password === "") {
      return 0;
    } else if (this.password !== "" && this.password === this.passwordRepeat) {
      return 1;
    } else {
      return -1;
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
    if (enable === true) {
      this.logFile = path.join(this.backupBasePath, "activeBackup.log");
      const fileLogLevel = await joplinWrapper.settingsValue("fileLogLevel");
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
      label: "Create Backup",
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
    const pathSetting = await joplinWrapper.settingsValue("path");
    const profileDir = await joplinWrapper.settingsGlobalValue("profileDir");

    if (path.isAbsolute(pathSetting)) {
      this.backupBasePath = path.normalize(pathSetting);
    } else {
      this.backupBasePath = path.join(
        path.normalize(profileDir),
        path.normalize(pathSetting)
      );
    }

    if (path.normalize(profileDir) === this.backupBasePath) {
      this.backupBasePath = null;
    }
  }

  public async loadSettings() {
    this.log.verbose("loadSettings");
    await this.loadBackupPath();
    this.backupRetention = await joplinWrapper.settingsValue("backupRetention");

    this.passwordRepeat = (
      await joplinWrapper.settingsValue("passwordRepeat")
    ).trim();
    this.password = (await joplinWrapper.settingsValue("password")).trim();

    this.zipArchive = await joplinWrapper.settingsValue("zipArchive");
    this.singleJex = await joplin.settings.value("singleJex");

    await this.enablePassword();
    await this.setActiveBackupPath();
  }

  private async createErrorDialog() {
    this.errorDialog = await joplin.views.dialogs.create("backupDialog");
    await joplin.views.dialogs.addScript(this.errorDialog, "webview.css");
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
    await joplin.views.dialogs.setButtons(this.errorDialog, [{ id: "ok" }]);
    await joplin.views.dialogs.setHtml(this.errorDialog, html.join("\n"));
    await joplin.views.dialogs.open(this.errorDialog);
  }

  public async setActiveBackupPath() {
    let exportPath = await joplinWrapper.settingsValue("exportPath");
    const profileDir = await joplinWrapper.settingsGlobalValue("profileDir");
    const tempDir = await joplinWrapper.settingsGlobalValue("tempDir");

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

  public async start(showDoneMsg: boolean = false) {
    this.log.verbose("start");
    this.backupStartTime = new Date();
    await this.loadSettings();

    if (this.backupBasePath === null) {
      await this.showError(
        "Please configure backup path in Joplin Tools > Options > Backup"
      );
      return;
    }

    if (fs.existsSync(this.backupBasePath)) {
      await this.deleteLogFile();
      await this.fileLogging(true);
      this.log.info("Backup started");

      if ((await this.checkPassword()) === -1) {
        await this.showError("Passwords do not match!");
        return;
      } else {
        this.log.info("Enable password protection: " + this.passwordEnabled);
      }

      await this.createEmptyFolder(this.activeBackupPath, "");

      await this.backupProfileData();

      await this.backupNotebooks();

      let backupDst = "";
      if (this.zipArchive === "no") {
        if (this.backupRetention > 1) {
          backupDst = await this.moveFinishedBackup();
          await this.deleteOldBackupSets(
            this.backupBasePath,
            this.backupRetention
          );
        } else {
          await this.clearOldBackupTarget(this.backupBasePath);
          backupDst = await this.moveFinishedBackup();
        }
      } else {
        await this.createZipArchive();
      }

      await joplin.settings.setValue(
        "lastBackup",
        this.backupStartTime.getTime()
      );
      this.log.info("Backup finished to: " + backupDst);

      this.log.info("Backup completed");
      await this.fileLogging(false);

      this.moveLogFile(backupDst);
    } else {
      await this.showError(
        `The Backup path '${this.backupBasePath}' does not exist!`
      );
    }

    this.backupStartTime = null;
  }

  private async createZipArchive() {
    this.log.info(`Create zip archive`);

    let backupDst = "";
    if (this.zipArchive === "yesone" || this.singleJex === true) {
      backupDst = await this.addToZipArchive(
        path.join(this.backupBasePath, "backup.7z"),
        path.join(this.activeBackupPath, "*"),
        this.password
      );
    } else {
      if (this.backupRetention === 1) {
      }
      // Loop ordner
    }
  }

  private async addToZipArchive(
    zipFile: string,
    addFile: string,
    password: string
  ): Promise<string> {
    this.log.verbose(`Add to zip ${zipFile}`);
    this.log.verbose(`   Src: ${addFile}`);
    const status = await sevenZip.add(zipFile, addFile, password);
    if (status !== true) {
      await this.showError("createZipArchive: " + status);
      throw new Error("createZipArchive: " + status);
    }

    return zipFile;
  }

  private async moveLogFile(logDst: string) {
    const logfileName = "backup.log";
    if (fs.existsSync(this.logFile)) {
      try {
        fs.moveSync(this.logFile, path.join(logDst, logfileName));
      } catch (e) {
        await this.showError("moveLogFile: " + e.message);
        throw e;
      }
    }
  }

  private async backupNotebooks() {
    const notebooks = await this.selectNotebooks();

    if (this.singleJex === true) {
      this.log.info("Create single file JEX backup");
      await this.jexExport(
        notebooks.ids,
        path.join(this.activeBackupPath, "all_notebooks.jex")
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
          await this.jexExport(
            folderId,
            path.join(this.activeBackupPath, notebookFile)
          );
        } else {
          this.log.verbose(
            `Skip ${notebooks.info[folderId]["title"]} (${folderId}) since no notes in notebook`
          );
        }
      }
    }
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

  private async jexExport(notebookIds: string[], file: string) {
    try {
      let status: string = await joplin.commands.execute(
        "exportFolders",
        notebookIds,
        "jex",
        file
      );
    } catch (e) {
      this.showError("Backup error", "jexExport: " + e.message);
      throw e;
    }
  }

  private async selectNotebooks(): Promise<any> {
    const noteBookInfo = {};
    const noteBooksIds = [];
    let pageNum = 0;
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

  public async startTimer() {
    if (this.timer === undefined || this.timer === null) {
      this.timer = setTimeout(this.backupTime.bind(this), 1000 * 60 * 1);
    }
  }

  private async backupTime() {
    this.log.verbose("backupTime");

    const checkEver = 5;
    const backupInterval = await joplinWrapper.settingsValue("backupInterval");
    const lastBackup = await joplinWrapper.settingsValue("lastBackup");
    const onlyOnChange = await joplinWrapper.settingsValue("onlyOnChange");
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

  private async getBackupSetFolderName(): Promise<string> {
    // Folder with date for backup retention
    const now = new Date(Date.now());
    return (
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0") +
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0")
    );
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
      await this.showError("createEmptyFolder: " + e.message);
      throw e;
    }
  }

  private async backupProfileData() {
    this.log.info("Backup Profile Data");

    const activeBackupFolderProfile = await this.createEmptyFolder(
      this.activeBackupPath,
      "profile"
    );
    const profileDir = await joplinWrapper.settingsGlobalValue("profileDir");

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

    // Backup Templates
    await this.backupFolder(
      await await joplinWrapper.settingsGlobalValue("templateDir"),
      path.join(activeBackupFolderProfile, "templates")
    );
  }

  private async backupFolder(src: string, dst: string): Promise<boolean> {
    if (fs.existsSync(src)) {
      this.log.verbose("Copy " + src);
      try {
        fs.copySync(src, dst);
        return true;
      } catch (e) {
        await this.showError("backupFolder: " + e.message);
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

  private async moveFinishedBackup(): Promise<string> {
    const backupSetFolder = await this.getBackupSetFolderName();
    let backupDestination = null;
    if (this.backupRetention > 1) {
      backupDestination = path.join(this.backupBasePath, backupSetFolder);
      try {
        fs.renameSync(this.activeBackupPath, backupDestination);
      } catch (e) {
        await this.showError("moveFinishedBackup: " + e.message);
        throw e;
      }

      await this.saveBackupInfo(
        path.basename(backupDestination),
        this.backupStartTime.getTime()
      );
    } else {
      backupDestination = path.join(this.backupBasePath);

      const oldBackupData = fs
        .readdirSync(this.activeBackupPath, { withFileTypes: true })
        .map((dirent) => dirent.name);
      for (const file of oldBackupData) {
        try {
          fs.moveSync(
            path.join(this.activeBackupPath, file),
            path.join(backupDestination, file)
          );
        } catch (e) {
          await this.showError("moveFinishedBackup: " + e.message);
          throw e;
        }
      }

      try {
        fs.rmdirSync(this.activeBackupPath, {
          recursive: true,
        });
      } catch (e) {
        this.showError("moveFinishedBackup: " + e.message);
        throw e;
      }
    }

    return backupDestination;
  }

  private async clearOldBackupTarget(backupPath: string) {
    // Remove only files
    const oldBackupData = fs
      .readdirSync(backupPath, { withFileTypes: true })
      .filter((dirent) => dirent.isFile())
      .map((dirent) => dirent.name)
      .reverse();
    for (const file of oldBackupData) {
      if (file !== path.basename(this.logFile)) {
        try {
          fs.removeSync(path.join(backupPath, file));
        } catch (e) {
          await this.showError("" + e.message);
          throw e;
        }
      }
    }

    try {
      fs.removeSync(path.join(backupPath, "templates"));
    } catch (e) {
      await this.showError("deleteOldBackupSets" + e.message);
      throw e;
    }

    try {
      fs.removeSync(path.join(backupPath, "profile"));
    } catch (e) {
      await this.showError("deleteOldBackupSets" + e.message);
      throw e;
    }
  }

  private async deleteOldBackupSets(
    backupPath: string,
    backupRetention: number
  ) {
    let info = JSON.parse(await joplinWrapper.settingsValue("backupInfo"));
    if (info.length > backupRetention) {
      info.sort((a, b) => b.date - a.date);
    }

    while (info.length > backupRetention) {
      const del = info.splice(backupRetention, 1);
      const folder = path.join(backupPath, del[0].name);
      if (fs.existsSync(folder)) {
        try {
          fs.rmdirSync(folder, {
            recursive: true,
          });
        } catch (e) {
          await this.showError("deleteOldBackupSets" + e.message);
          throw e;
        }
      }

      await joplin.settings.setValue("backupInfo", JSON.stringify(info));
    }
  }
}

export { Backup };
