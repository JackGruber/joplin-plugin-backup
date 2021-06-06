import { Settings } from "./settings";
import { MenuItemLocation } from "api/types";
import joplin from "api";
import * as path from "path";
import logging from "electron-log";
import * as fs from "fs-extra";

class Backup {
  private errorDialog: any;
  private backupBasePath: string;
  private activeBackupPath: string;
  private log: any;
  private logFile: string;
  private backupRetention: number;

  constructor() {
    this.log = logging;
  }

  public async init() {
    await this.registerSettings();
    await this.registerCommands();
    await this.registerMenues();
    await this.createErrorDialog();
    await this.setupLog();
    await this.loadSettings();
    window.setTimeout(this.backupTime, 1000 * 60 * 5);
  }

  public async registerSettings() {
    await Settings.register();
  }

  private async setupLog() {
    this.log.transports.file.level = false;
    this.log.transports.file.format =
      "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";
    this.log.transports.console.level = "verbose";
    this.log.transports.console.format =
      "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";
  }

  private async fileLogging(enable: boolean) {
    if (enable === true) {
      this.logFile = path.join(this.backupBasePath, "backup.log");
      const fileLogLevel = await joplin.settings.value("fileLogLevel");
      this.log.transports.file.resolvePath = () => this.logFile;
      this.log.transports.file.level = fileLogLevel;
    } else {
      this.log.transports.file.level = false;
    }
  }

  private async deleteLogFile() {
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

    if (path.normalize(profileDir) === this.backupBasePath) {
      this.backupBasePath = null;
    }
  }

  public async loadSettings() {
    await this.loadBackupPath();
    this.backupRetention = await joplin.settings.value("backupRetention");
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
    const backupStartTime = new Date();

    if (this.backupBasePath === null) {
      this.showError(
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

      this.backupProfileData();

      const backupDst = await this.moveFinishedBackup();

      await joplin.settings.setValue("lastBackup", backupStartTime.getTime());
      this.log.info("Backup finished to: " + backupDst);

      this.log.info("Backup completed");
      await this.fileLogging(false);
    } else {
      this.showError(
        `The Backup path '${this.backupBasePath}' does not exist!`
      );
    }
  }

  private async getLastChangeDate(): Promise<number> {
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
        if (checkUpdated.items[0].updated_time > lastUpdate) {
          lastUpdate = checkUpdated.items[0].updated_time;
        }
      } catch (error) {
        this.log.error(error);
      }
    }
    return lastUpdate;
  }

  private async backupTime() {
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
      window.setTimeout(this.backupTime, 1000 * 60 * checkEver);
    } else {
      this.log.info("Automatic backup disabled");
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
    try {
      fs.emptyDirSync(dir);
      return dir;
    } catch (e) {
      this.showError("createEmptyFolder: " + e.message);
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

    // Backup Templates
    await this.backupFolder(
      await joplin.settings.globalValue("templateDir"),
      path.join(activeBackupFolderProfile, "templates")
    );
  }

  private async backupFolder(src: string, dst: string): Promise<boolean> {
    if (fs.existsSync(src)) {
      try {
        fs.copySync(src, dst);
        return true;
      } catch (e) {
        this.showError("backupFolder: " + e.message);
        throw e;
      }
    } else {
      this.log.info("no folder " + src);
      return false;
    }
  }

  private async backupFile(src: string, dest: string): Promise<boolean> {
    if (fs.existsSync(src)) {
      this.log.debug("Copy " + src);
      try {
        fs.copyFileSync(src, dest);
        return true;
      } catch (e) {
        this.log.error("backupFile: " + e.message);
        throw e;
      }
    } else {
      this.log.debug("No file '" + src);
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
        this.showError("moveFinishedBackup: " + e.message);
        throw e;
      }
    } else {
      const oldBackupData = fs
        .readdirSync(this.activeBackupPath, { withFileTypes: true })
        .map((dirent) => dirent.name);
      for (const file of oldBackupData) {
        try {
          fs.moveSync(
            path.join(this.activeBackupPath, file),
            path.join(this.backupBasePath, file)
          );
        } catch (e) {
          this.showError("moveFinishedBackup: " + e.message);
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
    await this.deleteOldBackupSets(this.backupBasePath, this.backupRetention);
    return backupDestination;
  }

  private deleteOldBackupSets(backupPath: string, backupRetention: number) {
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
          this.showError("deleteOldBackupSets" + e.message);
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
        if (file != path.basename(this.logFile)) {
          try {
            fs.removeSync(path.join(backupPath, file));
          } catch (e) {
            this.showError("" + e.message);
            throw e;
          }
        }
      }

      try {
        fs.removeSync(path.join(backupPath, "templates"));
      } catch (e) {
        this.showError("deleteOldBackupSets" + e.message);
        throw e;
      }

      try {
        fs.removeSync(path.join(backupPath, "profile"));
      } catch (e) {
        this.showError("deleteOldBackupSets" + e.message);
        throw e;
      }
    }
  }
}

export { Backup };
