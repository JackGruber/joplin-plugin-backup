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
    });

    const backupDialog = await joplin.views.dialogs.create("backupDialog");

    await joplin.commands.register({
      name: "CreateBackup",
      label: "Create Backup",
      execute: async () => {
        console.info("Start backup");

        const baseBackupPath = await joplin.settings.value("path");

        if (fs.existsSync(baseBackupPath)) {
          let backupPath = baseBackupPath;
          const backupDate = new Date();
          const backupRetention = await joplin.settings.value(
            "backupRetention"
          );
          if (backupRetention > 1) {
            backupPath =
              baseBackupPath +
              "/" +
              backupDate.getFullYear().toString() +
              (backupDate.getMonth() + 1).toString().padStart(2, "0") +
              backupDate.getDate().toString().padStart(2, "0") +
              backupDate.getHours().toString().padStart(2, "0") +
              backupDate.getMinutes().toString().padStart(2, "0") +
              backupDate.getSeconds().toString().padStart(2, "0");
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

          let noteBooks = {};
          let pageNum = 0;
          do {
            var folders = await joplin.data.get(["folders"], {
              fields: "id, title, parent_id",
              limit: 50,
              page: pageNum++,
            });
            for (const folder of folders.items) {
              noteBooks[folder.id] = {};
              noteBooks[folder.id]["title"] = folder.title;
              noteBooks[folder.id]["parent_id"] = folder.parent_id;
            }
          } while (folders.has_more);

          // Backup notebooks with notes
          for (const folder of folders.items) {
            let noteCheck = await joplin.data.get(
              ["folders", folder.id, "notes"],
              {
                fields: "id",
              }
            );
            if (noteCheck.items.length > 0) {
              let name: string = await getNotebookFileName(
                noteBooks,
                folder.id
              );
              try {
                let status: string = await joplin.commands.execute(
                  "exportFolders",
                  folder.id,
                  "jex",
                  backupPath + "/" + name
                );
              } catch (e) {
                showError("Backup error", e);
                throw e;
              }
              console.info(status);
            }
          }

          // Backup Keymap
          const profileDir = await joplin.settings.globalValue("profileDir");
          try {
            fs.copyFileSync(
              profileDir + "/keymap-desktop.json",
              backupPath + "/keymap-desktop.json"
            );
          } catch (e) {
            showError("Backup error", e);
            throw e;
          }
        } else {
          console.info("Backup Path '" + baseBackupPath + "' does not exist");
        }

        showError("Backup finished", "The backup was created");
        console.info("End backup");
      },
    });

    await joplin.views.menuItems.create(
      "myMenuItemToolsCreateBackup",
      "CreateBackup",
      MenuItemLocation.Tools
    );

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
  },
});
