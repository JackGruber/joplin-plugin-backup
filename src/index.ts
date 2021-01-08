import joplin from "api";
import JoplinCommands from "api";
import { MenuItem, MenuItemLocation, SettingItemType } from "api/types";

const fs = require("fs-extra");

joplin.plugins.register({
  onStart: async function () {
    console.info("Backup plugin started");

		await joplin.settings.registerSection('backupSection', {
			label: 'Backup',
			iconName: 'fas fa-archive',
		});
		
		await joplin.settings.registerSetting('path', {
			value: 123,
			type: SettingItemType.String,
			section: 'backupSection',
			public: true,
			label: 'Backup Path',
		});

    await joplin.commands.register({
      name: "CreateBackup",
      label: "Create Backup",
      execute: async () => {
        console.info("Start backup");

        const backupPath = await joplin.settings.value("path");
        if (fs.existsSync(backupPath)) {
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

          for (const folder of folders.items) {
            let name: string = await getNotebookFileName(noteBooks, folder.id);
            await joplin.commands.execute(
              "exportFolders",
              folder.id,
              "jex",
              backupPath + "/" + name
            );
          }
        } else {
          console.info("Backup Path '" + backupPath + "' does not exist");
        }

        console.info("End backup");
      },
    });

    await joplin.views.menuItems.create(
      "myMenuItemToolsCreateBackup",
      "CreateBackup",
      MenuItemLocation.Tools
    );
  },
});
