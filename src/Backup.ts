import { Settings } from "./settings";
import { MenuItemLocation } from "api/types";
import joplin from "api";

const fs = require("fs-extra");
const path = require("path");
const backupLog = require("electron-log");

class Backup {
  private errorDialog: any;
  private backupBasePath: string;
  private log: any;
  private logFile: string;

  constructor() {
    this.log = backupLog;
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
    this.logFile = path.join(this.backupBasePath, "backup.log");
    if (enable === true) {
      const fileLogLevel = await joplin.settings.value("fileLogLevel");
      this.log.transports.file.resolvePath = () => this.logFile;
      backupLog.transports.file.level = fileLogLevel;
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

  public async loadSettings() {
    this.backupBasePath = path.normalize(await joplin.settings.value("path"));
  }

  private async createErrorDialog() {
    this.errorDialog = await joplin.views.dialogs.create("backupDialog");
    await joplin.views.dialogs.addScript(this.errorDialog, "webview.css");
  }

  private async showError(msg: string, title: string = null) {
    const html = [];
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
    if (fs.existsSync(this.backupBasePath)) {
      await this.deleteLogFile();
      await this.fileLogging(true);
      this.log.info("Backup started");
      this.log.info("Backup completed");
      await this.fileLogging(false);
    } else {
      this.showError(
        `The Backup path '${this.backupBasePath}' does not exist!`
      );
      this.log.error(
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
          backupLog.info("create no backup (no change)");
        }
      }
      window.setTimeout(this.backupTime, 1000 * 60 * checkEver);
    } else {
      this.log.info("Automatic backup disabled");
    }
  }
}

export { Backup };
