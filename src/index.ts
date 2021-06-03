import joplin from "api";
import { MenuItemLocation } from "api/types";
import { Settings } from "./settings";
const fs = require("fs-extra");
const path = require("path");

// Configure logging
const backupLog = require("electron-log");
backupLog.transports.file.level = false;
backupLog.transports.file.format =
  "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";
backupLog.transports.console.level = "verbose";
backupLog.transports.console.format =
  "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";
const backupLogFileName = "backup.log";

joplin.plugins.register({
  onStart: async function () {
    backupLog.info("Backup plugin started");

    await Settings.register();

    const backupDialog = await joplin.views.dialogs.create("backupDialog");
    const startTime = new Date();

    await joplin.commands.register({
      name: "CreateBackup",
      label: "Create Backup",
      execute: async () => {
        await startBackup(true);
      },
    });

    await joplin.views.menuItems.create(
      "myMenuItemToolsCreateBackup",
      "CreateBackup",
      MenuItemLocation.Tools
    );

    async function startBackup(showMsg) {
      const baseBackupPath = await joplin.settings.value("path");
      if (fs.existsSync(baseBackupPath)) {
        if (fs.existsSync(path.join(baseBackupPath, backupLogFileName))) {
          try {
            await fs.unlinkSync(path.join(baseBackupPath, backupLogFileName));
          } catch (e) {
            backupLog.error(e);
          }
        }

        // Enable File logging
        const fileLogLevel = await joplin.settings.value("fileLogLevel");
        backupLog.transports.file.resolvePath = () =>
          path.join(baseBackupPath, backupLogFileName);
        backupLog.transports.file.level = fileLogLevel;

        backupLog.info("Start backup");

        const activeBackupPath = path.join(baseBackupPath, "activeBackupJob");
        const backupDate = new Date();

        // Folder with date for backup retention
        const backupDateFolder =
          backupDate.getFullYear().toString() +
          (backupDate.getMonth() + 1).toString().padStart(2, "0") +
          backupDate.getDate().toString().padStart(2, "0") +
          backupDate.getHours().toString().padStart(2, "0") +
          backupDate.getMinutes().toString().padStart(2, "0");

        const backupRetention = await joplin.settings.value("backupRetention");
        if (
          backupRetention > 1 &&
          fs.existsSync(path.join(baseBackupPath, backupDateFolder))
        ) {
          showError(
            "Backup error",
            "Backup set " + backupDateFolder + " exists already!"
          );
          backupLog.error(
            "Backup set " + backupDateFolder + " exists already!"
          );
          return;
        }

        // Create tmp dir for active backup
        try {
          fs.emptyDirSync(activeBackupPath);
        } catch (e) {
          showError("Backup error", "Create activeBackupPath<br>" + e);
          backupLog.error("Create activeBackupPath");
          backupLog.error(e);
          throw e;
        }

        // Create profile backupfolder
        try {
          fs.emptyDirSync(path.join(activeBackupPath, "profile"));
        } catch (e) {
          showError("Backup error", "Create activeBackupPath/profile<br>" + e);
          backupLog.error("Create activeBackupPath/profile");
          backupLog.error(e);
          throw e;
        }

        const noteBookInfo = {};
        const noteBooksIds = [];
        let pageNum = 0;
        backupLog.info("Select notebooks for export");
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
            backupLog.debug("Add '" + folder.title + "' (" + folder.id + ")");
          }
        } while (folders.has_more);

        const singleJex = await joplin.settings.value("singleJex");
        if (singleJex === true) {
          // Create on single file JEX backup
          backupLog.info("Create single file JEX backup");
          try {
            let status: string = await joplin.commands.execute(
              "exportFolders",
              noteBooksIds,
              "jex",
              path.join(activeBackupPath, "/all_notebooks.jex")
            );
          } catch (e) {
            showError("Backup error", "exportFolders single JEX<br>" + e);
            backupLog.error("exportFolders single JEX");
            backupLog.error(e);
            throw e;
          }
        } else {
          // Backup notebooks with notes in seperatet JEX
          backupLog.info("Export each notbook as JEX backup");
          for (const folderId of noteBooksIds) {
            let noteCheck = await joplin.data.get(
              ["folders", folderId, "notes"],
              {
                fields: "title, id",
              }
            );

            if (noteCheck.items.length > 0) {
              let name: string = await getNotebookFileName(
                noteBookInfo,
                folderId
              );
              backupLog.debug(
                "Export '" +
                  noteBookInfo[folderId]["title"] +
                  "' (" +
                  folderId +
                  ") as '" +
                  name +
                  "'"
              );
              try {
                let status: string = await joplin.commands.execute(
                  "exportFolders",
                  folderId,
                  "jex",
                  path.join(activeBackupPath, name)
                );
              } catch (e) {
                showError("Backup error", "exportFolders JEX<br>" + e);
                backupLog.error("exportFolders JEX");
                backupLog.error(e);
                throw e;
              }
            } else {
              backupLog.debug(
                "Skip '" +
                  noteBookInfo[folderId]["title"] +
                  "' (" +
                  folderId +
                  ") since no notes in notebook"
              );
            }
          }
        }

        const profileDir = await joplin.settings.globalValue("profileDir");

        backupLog.info("Backup Profile Data");

        // Backup Joplin settings
        await backupFile(
          path.join(profileDir, "settings.json"),
          path.join(activeBackupPath, "profile", "settings.json")
        );

        // Backup Keymap
        await backupFile(
          path.join(profileDir, "keymap-desktop.json"),
          path.join(activeBackupPath, "profile", "keymap-desktop.json")
        );

        // Backup userchrome.css
        await backupFile(
          path.join(profileDir, "userchrome.css"),
          path.join(activeBackupPath, "profile", "userchrome.css")
        );

        // Backup userstyle.css
        await backupFile(
          path.join(profileDir, "userstyle.css"),
          path.join(activeBackupPath, "profile", "userstyle.css")
        );

        // Backup Templates
        const templateDir = await joplin.settings.globalValue("templateDir");
        await backupFolder(
          templateDir,
          path.join(activeBackupPath, "profile", "templates")
        );

        const backupDst = await moveBackup(
          baseBackupPath,
          activeBackupPath,
          backupDateFolder
        );
        await joplin.settings.setValue("lastBackup", backupDate.getTime());
        backupLog.info("Backup finished to: " + backupDst);

        // Disable file logging and move file
        backupLog.transports.file.level = false;
        if (
          fs.existsSync(path.join(baseBackupPath, backupLogFileName)) &&
          backupDst != baseBackupPath
        ) {
          try {
            fs.moveSync(
              path.join(baseBackupPath, backupLogFileName),
              path.join(backupDst, backupLogFileName)
            );
          } catch (e) {
            backupLog.error("move backup logfile");
            backupLog.error(e);
            throw e;
          }
        }
      } else {
        backupLog.error("Backup Path '" + baseBackupPath + "' does not exist");
        showError(
          "Backup error",
          "Backup Path '" + baseBackupPath + "' does not exist"
        );
        return;
      }

      if (showMsg === true) {
        showError("Backup finished", "The backup was created");
      }
    }

    // Backup templates
    async function backupFolder(src: string, dst: string) {
      if (fs.existsSync(src)) {
        try {
          fs.copySync(src, dst);
        } catch (e) {
          showError("Backup error", "backupFolder<br>" + e);
          backupLog.error("backupFolder");
          backupLog.error(e);
          throw e;
        }
      } else {
        backupLog.info("Automatic backup disabled");
      }
    }

    // Cleanup old backups / move created backup
    async function moveBackup(
      baseBackupPath: string,
      activeBackupPath: string,
      backupDateFolder: string
    ): Promise<string> {
      const backupRetention = await joplin.settings.value("backupRetention");
      if (backupRetention > 1) {
        try {
          fs.renameSync(
            activeBackupPath,
            path.join(baseBackupPath, backupDateFolder)
          );
        } catch (e) {
          showError("Backup error", "moveBackup rename<br>" + e);
          backupLog.error("moveBackup rename");
          backupLog.error(e);
          throw e;
        }
        await removeOldBackups(baseBackupPath, backupRetention);
        return path.join(baseBackupPath, backupDateFolder);
      } else {
        await removeOldBackups(baseBackupPath, backupRetention);

        const oldBackupData = fs
          .readdirSync(activeBackupPath, { withFileTypes: true })
          .map((dirent) => dirent.name);
        for (const file of oldBackupData) {
          try {
            fs.moveSync(
              path.join(activeBackupPath, file),
              path.join(baseBackupPath, file)
            );
          } catch (e) {
            showError("Backup error", "moveBackup<br>" + e);
            backupLog.error("moveBackup");
            backupLog.error(e);
            throw e;
          }
        }

        try {
          fs.rmdirSync(activeBackupPath, {
            recursive: true,
          });
        } catch (e) {
          showError("Backup error", "moveBackup rm activeBackupPath<br>" + e);
          backupLog.error("moveBackup rm activeBackupPath");
          backupLog.error(e);
          throw e;
        }

        return baseBackupPath;
      }
    }

    async function removeOldBackups(
      backupPath: string,
      backupRetention: number
    ) {
      if (backupRetention > 1) {
        // delete old backup sets
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
            showError("Backup error", "removeOldBackups folder<br>" + e);
            backupLog.error("removeOldBackups folder");
            backupLog.error(e);
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
          if (file != backupLogFileName) {
            try {
              fs.removeSync(path.join(backupPath, file));
            } catch (e) {
              showError("Backup error", "removeOldBackups files<br>" + e);
              backupLog.error("removeOldBackups files");
              backupLog.error(e);
              throw e;
            }
          }
        }

        try {
          fs.removeSync(path.join(backupPath, "templates"));
        } catch (e) {
          showError("Backup error", "removeOldBackups templates<br>" + e);
          backupLog.error("removeOldBackups templates");
          backupLog.error(e);
          throw e;
        }

        try {
          fs.removeSync(path.join(backupPath, "profile"));
        } catch (e) {
          showError("Backup error", "removeOldBackups profile<br>" + e);
          backupLog.error("removeOldBackups profile");
          backupLog.error(e);
          throw e;
        }
      }
    }

    async function backupFile(src: string, dest: string): Promise<boolean> {
      if (fs.existsSync(src)) {
        backupLog.debug("Copy " + src);
        try {
          fs.copyFileSync(src, dest);
        } catch (e) {
          showError("Backup error", "backupFile<br>" + e);
          backupLog.error("backupFile");
          backupLog.error(e);
          throw e;
        }
        return true;
      } else {
        backupLog.debug("No file '" + src);
        return false;
      }
    }

    async function showError(title, e) {
      await joplin.views.dialogs.setButtons(backupDialog, [{ id: "ok" }]);
      await joplin.views.dialogs.setHtml(
        backupDialog,
        `
        <div style="overflow-wrap: break-word;">
          <h3> ${title}</h3>
          ${e}
        </div>
        `
      );
      await joplin.views.dialogs.open(backupDialog);
    }

    async function getNotebookFileName(notebooks, id): Promise<string> {
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

    // Get time of last changed item
    async function getLastChangeDate(): Promise<number> {
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
        } catch (error) {}
      }
      return lastUpdate;
    }

    async function checkBackupTime() {
      backupLog.info("Check for timed backup");
      const lastBackup = await joplin.settings.value("lastBackup");
      const backupInterval = await joplin.settings.value("backupInterval");
      const now = new Date();
      const checkEver = 5;

      if (backupInterval > 0) {
        // Do not start backup directly after startup
        if (startTime.getTime() + (checkEver - 1) * 60 * 1000 < now.getTime()) {
          if (now.getTime() > lastBackup + backupInterval * 60 * 60 * 1000) {
            backupLog.info("backup interval reached");
            const onlyOnChange = await joplin.settings.value("onlyOnChange");
            const lastChange = await getLastChangeDate();
            if (
              onlyOnChange === false ||
              (onlyOnChange === true &&
                (lastChange === 0 || lastBackup < lastChange))
            ) {
              await startBackup(false);
            } else {
              backupLog.info("create no backup (no change)");
            }
          }
        }

        window.setTimeout(checkBackupTime, 1000 * 60 * checkEver);
      } else {
        backupLog.info("Automatic backup disabled");
      }
    }

    checkBackupTime();
  },
});
