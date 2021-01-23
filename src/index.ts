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
        const activeBackupPath = baseBackupPath + "/activeBackupJob";
        const backupDate = new Date();

        // Create tmp dir for active backup
        try {
          fs.emptyDirSync(activeBackupPath)
        } catch (e) {
          showError("Backup error", "Create activeBackupPath<br>" + e);
          console.error(e);
          throw e;
        }

        // Create profile backupfolder
        try {
          fs.emptyDirSync(activeBackupPath + "/profile")
        } catch (e) {
          showError("Backup error", "Create activeBackupPath/profile<br>" + e);
          console.error(e);
          throw e;
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
            noteBooksIds.push(folder.id);
            noteBookInfo[folder.id] = {};
            noteBookInfo[folder.id]["title"] = folder.title;
            noteBookInfo[folder.id]["parent_id"] = folder.parent_id;
          }
        } while (folders.has_more);

        const singleJex = await joplin.settings.value("singleJex");
        if (singleJex === true) {
          // Create on single file JEX backup
          console.info("Create single file JEX backup");
          try {
            let status: string = await joplin.commands.execute(
              "exportFolders",
              noteBooksIds,
              "jex",
              activeBackupPath + "/all_notebooks.jex"
            );
          } catch (e) {
            showError("Backup error", "exportFolders single JEX<br>" + e);
            console.error(e);
            throw e;
          }
        } else {
          // Backup notebooks with notes in seperatet JEX
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
              console.info(
                "Backup '" +
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
                  activeBackupPath + "/" + name
                );
              } catch (e) {
                showError("Backup error", "exportFolders JEX<br>" + e);
                console.error(e);
                throw e;
              }
            }
          }
        }

        const profileDir = await joplin.settings.globalValue("profileDir");

        // Backup Keymap
        await backupFile(
          profileDir + "/keymap-desktop.json",
          activeBackupPath + "/profile/keymap-desktop.json"
        );

        // Backup userchrome.css
        await backupFile(
          profileDir + "/userchrome.css",
          activeBackupPath + "/profile/userchrome.css"
        );

        // Backup userstyle.css
        await backupFile(
          profileDir + "/userstyle.css",
          activeBackupPath + "/profile/userstyle.css"
        );
        
        // Backup Templates
        await backupFolder(
          profileDir + "/templates",
          activeBackupPath + "/profile/templates"
        )

        await moveBackup(baseBackupPath, activeBackupPath, backupDate);

        await joplin.settings.setValue("lastBackup", backupDate.getTime());
      } else {
        console.error("Backup Path '" + baseBackupPath + "' does not exist");
        showError("Backup error", "Backup Path '" + baseBackupPath + "' does not exist");
        return;
      }

      if (showMsg === true) {
        showError("Backup finished", "The backup was created");
      }
      console.info("End backup");
    }

    // Backup templates
    async function backupFolder(src: string, dst: string) {
      if (fs.existsSync(src)) {
        try {
          fs.copySync(src, dst)
        } catch (e) {
          showError("Backup error", "backupFolder<br>" + e);
          console.error(e);
          throw e;
        }
      } else {
        console.info("Automatic backup disabled");
      }
    }

    // Cleanup old backups / move created backup
    async function moveBackup(baseBackupPath: string, activeBackupPath: string, backupDate: any) {
      const backupRetention = await joplin.settings.value("backupRetention");
      if (backupRetention > 1) {
        const backupDateFolder = backupDate.getFullYear().toString() +
        (backupDate.getMonth() + 1).toString().padStart(2, "0") +
        backupDate.getDate().toString().padStart(2, "0") +
        backupDate.getHours().toString().padStart(2, "0") +
        backupDate.getMinutes().toString().padStart(2, "0");
        try {
          fs.renameSync(activeBackupPath, baseBackupPath + "/" + backupDateFolder);        
        } catch (e) {
          showError("Backup error", "moveBackup rename<br>" + e);
          console.error(e);
          throw e;
        }
        await removeOldBackups(baseBackupPath, backupRetention);
      } else {
        await removeOldBackups(baseBackupPath, backupRetention);

        const oldBackupData = fs
          .readdirSync(activeBackupPath, { withFileTypes: true })
          .map((dirent) => dirent.name);
        for (const file of oldBackupData) {
          try {
            fs.moveSync(activeBackupPath + "/" + file, baseBackupPath + "/" + file);
          } catch (e) {
            showError("Backup error", "moveBackup<br>" + e);
            console.error(e);
            throw e;
          }
        }

        try {
          fs.rmdirSync(activeBackupPath, {
            recursive: true,
          });
        } catch (e) {
          showError("Backup error", "moveBackup rm activeBackupPath<br>" + e);
          console.error(e);
          throw e;
        }
      }
    }

    async function removeOldBackups(backupPath: string, backupRetention: number) {
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
            fs.rmdirSync(backupPath + "/" + oldBackupSets[i], {
              recursive: true,
            });
          } catch (e) {
            showError("Backup error", "removeOldBackups folder<br>" + e);
            console.error(e);
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
          try {
            fs.removeSync(backupPath + "/" + file);
          } catch (e) {
            showError("Backup error", "removeOldBackups files<br>" + e);
            console.error(e);
            throw e;
          }
        }

        try {
          fs.removeSync(backupPath + "/templates");
        } catch (e) {
          showError("Backup error", "removeOldBackups templates<br>" + e);
          console.error(e);
          throw e;
        }

        try {
          fs.removeSync(backupPath + "/profile");
        } catch (e) {
          showError("Backup error", "removeOldBackups profile<br>" + e);
          console.error(e);
          throw e;
        }
      }
    }

    async function backupFile(src: string, dest: string): Promise<boolean> {
      if (fs.existsSync(src)) {
        try {
          fs.copyFileSync(src, dest);
        } catch (e) {
          showError("Backup error", "backupFile<br>" + e);
          console.error(e);
          throw e;
        }
        return true;
      } else {
        console.info("No file '" + src);
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
