import { Settings } from "./settings";
import { MenuItemLocation } from "api/types";
import joplin from "api";
import * as path from "path";
import backupLogging from "electron-log";
import * as fs from "fs-extra";
import { joplinWrapper } from "./joplinWrapper";

class Backup {
  private errorDialog: any;
  private backupBasePath: string;
  private activeBackupPath: string;
  private log: any;
  private logFile: string;
  private backupRetention: number;
  private timer: any;

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
  }

  public async registerSettings() {
    await Settings.register();
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
  }

  private async createErrorDialog() {
    this.errorDialog = await joplin.views.dialogs.create("backupDialog");
    await joplin.views.dialogs.addScript(this.errorDialog, "webview.css");
  }

  private async showError(msg: string, title: string = null) {
    const html = [];

    this.log.error(`${title} ${msg}`);

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

  public async start(showDoneMsg: boolean = false) {
    this.log.verbose("start");
    const backupStartTime = new Date();
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

      this.activeBackupPath = await this.createEmptyFolder(
        this.backupBasePath,
        "activeBackupJob"
      );

      await this.backupProfileData();

      const notebooks = await this.selectNotebooks();

      const backupDst = await this.moveFinishedBackup();

      await joplin.settings.setValue("lastBackup", backupStartTime.getTime());
      this.log.info("Backup finished to: " + backupDst);

      this.log.info("Backup completed");
      await this.fileLogging(false);

      this.moveLogFile(backupDst);
    } else {
      await this.showError(
        `The Backup path '${this.backupBasePath}' does not exist!`
      );
    }
  }

  private async moveLogFile(logPath: string) {
    if (fs.existsSync(this.logFile) && logPath != this.backupBasePath) {
      const logfileName = "backup.log";
      if (this.backupRetention > 1) {
        try {
          fs.moveSync(this.logFile, path.join(logPath, logfileName));
        } catch (e) {
          await this.showError("moveLogFile: " + e.message);
          throw e;
        }
      } else {
        try {
          fs.renameSync(this.logFile, path.join(logPath, logfileName));
        } catch (e) {
          await this.showError("moveLogFile: " + e.message);
          throw e;
        }
      }
    }
  }

  private async backupNotebooks() {
    const notebooks = await this.selectNotebooks();

    const singleJex = await joplin.settings.value("singleJex");
    if (singleJex === true) {
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

  private async deleteOldBackupSets(
    backupPath: string,
    backupRetention: number
  ) {
    if (backupRetention > 1) {
      const folders = fs
        .readdirSync(backupPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .reverse();

      // Check if folder is a old backupset
      const oldBackupSets = [];
      for (let folder of folders) {
        if (parseInt(folder) > 202100000000) {
          oldBackupSets.push(folder);
        }
      }

      for (let i = backupRetention; i < oldBackupSets.length; i++) {
        try {
          fs.rmdirSync(path.join(backupPath, oldBackupSets[i]), {
            recursive: true,
          });
        } catch (e) {
          await this.showError("deleteOldBackupSets" + e.message);
          throw e;
        }
      }
    } else {
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
  }
}

export { Backup };
