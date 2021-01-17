import joplin from "api";
import JoplinCommands from "api";
import { MenuItem, MenuItemLocation, SettingItemType } from "api/types";

const fs = require("fs-extra");

joplin.plugins.register({
  onStart: async function () {
    console.info("Backup plugin started");

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

    await joplin.settings.registerSetting("backupRetention", {
      value: 1,
      minimum: 1,
      maximum: 999,
      type: SettingItemType.Int,
      section: "backupSection",
      public: true,
      label: "Keep x Backups",
      description: "If more than one verison is configured, date (YYYYMMDDHHMM) folders are created in the Backup Path. ",
    });

    await joplin.settings.registerSetting("backupInterval", {
      value: 24,
      minimum: 0,
      maximum: 999,
      type: SettingItemType.Int,
      section: "backupSection",
      public: true,
      label: "Backups interval in hours",
      description: "0 = disable automatic backup",
    });

    await joplin.settings.registerSetting("lastBackup", {
      value: 0,
      type: SettingItemType.Int,
      section: "backupSection",
      public: false,
      label: "last backup run",
    });

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
      console.info("Start backup");

      const baseBackupPath = await joplin.settings.value("path");

      if (fs.existsSync(baseBackupPath)) {
        let backupPath = baseBackupPath;
        const backupDate = new Date();
        const backupRetention = await joplin.settings.value("backupRetention");
        if (backupRetention > 1) {
          backupPath =
            baseBackupPath +
            "/" +
            backupDate.getFullYear().toString() +
            (backupDate.getMonth() + 1).toString().padStart(2, "0") +
            backupDate.getDate().toString().padStart(2, "0") +
            backupDate.getHours().toString().padStart(2, "0") +
            backupDate.getMinutes().toString().padStart(2, "0");
          try {
            fs.mkdirSync(backupPath);
          } catch (e) {
            showError("Backup error", e);
            throw e;
          }

          // delete old backup sets
          const oldBackupSets = fs
            .readdirSync(baseBackupPath, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)
            .reverse();
          for (let i = backupRetention; i < oldBackupSets.length; i++) {
            try {
              fs.rmdirSync(baseBackupPath + "/" + oldBackupSets[i], {
                recursive: true,
              });
            } catch (e) {
              showError("Backup error", e);
              throw e;
            }
          }
        } else {
          const oldBackupData = fs
            .readdirSync(baseBackupPath, { withFileTypes: true })
            .filter((dirent) => dirent.isFile())
            .map((dirent) => dirent.name)
            .reverse();
          for (const file of oldBackupData) {
            try {
              fs.removeSync(baseBackupPath + "/" + file);
            } catch (e) {
              showError("Backup error", e);
              throw e;
            }
          }
        }

        const noteBookInfo = {};
        const noteBooksIds = [];
        let pageNum = 0;
        do {
          var folders = await joplin.data.get(["folders"], {
            fields: "id, title, parent_id",
            limit: 50,
            page: pageNum++,
          });
          for (const folder of folders.items) {
            noteBooksIds.push(folder.id)
            noteBookInfo[folder.id] = {};
            noteBookInfo[folder.id]["title"] = folder.title;
            noteBookInfo[folder.id]["parent_id"] = folder.parent_id;
          }
        } while (folders.has_more);

        // Backup notebooks with notes
        for (const folderId of noteBooksIds) {
          let noteCheck = await joplin.data.get(
            ["folders", folderId, "notes"],
            {
              fields: "title, id",
            }
          );
          
          if (noteCheck.items.length > 0) {
            let name: string = await getNotebookFileName(noteBookInfo, folderId);
            try {
              console.info(
                "Backup '" +
                  noteBookInfo[folderId]["title"] +
                  "' (" +
                  folderId +
                  ") as '" +
                  name +
                  "'"
              );
              let status: string = await joplin.commands.execute(
                "exportFolders",
                folderId,
                "jex",
                backupPath + "/" + name
              );
            } catch (e) {
              showError("Backup error", e);
              throw e;
            }
          }
        }

        const profileDir = await joplin.settings.globalValue("profileDir");
        
        // Backup Keymap
        await backupFile(
          profileDir + "/keymap-desktop.json",
          backupPath + "/keymap-desktop.json"
        );

        // Backup userchrome.css
        await backupFile(
          profileDir + "/userchrome.css",
          backupPath + "/userchrome.css"
        );

        // Backup userstyle.css
        await backupFile(
          profileDir + "/userstyle.css",
          backupPath + "/userstyle.css"
        );

        await joplin.settings.setValue("lastBackup", backupDate.getTime());
      } else {
        console.info("Backup Path '" + baseBackupPath + "' does not exist");
      }

      if (showMsg === true) {
        showError("Backup finished", "The backup was created");
      }
      console.info("End backup");
    }

    async function backupFile(src: string, dest: string): Promise<boolean> {
      if (fs.existsSync(src)) {
        try {
          fs.copyFileSync(
            src,
            dest
          );
        } catch (e) {
          showError("Backup error", e);
          throw e;
        }
        return true;
      }
      else{
        console.info("No file '" + src + "/keymap-desktop.json");
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
          .replace(/[[/\?%*:|"<>]]/g, "_") + ".jex"
      );
    }

    async function checkBackupTime() {
      console.info("Check for timed backup");
      const lastBackup = await joplin.settings.value("lastBackup");
      const backupInterval = await joplin.settings.value("backupInterval");
      const now = new Date();
      const checkEver = 5;

      if (backupInterval > 0) {
        // Do not start backup directly after startup
        if (startTime.getTime() + (checkEver - 1) * 60 * 1000 < now.getTime()) {
          if (now.getTime() > lastBackup + backupInterval * 60 * 60 * 1000) {
            await startBackup(false);
          }
        }

        window.setTimeout(checkBackupTime, 1000 * 60 * checkEver);
      } else {
        console.info("Automatic backup disabled");
      }
    }

    checkBackupTime();
  },
});
