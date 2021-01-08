import joplin from "api";
import JoplinCommands from "api";
import { MenuItem, MenuItemLocation, SettingItemType } from "api/types";

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
