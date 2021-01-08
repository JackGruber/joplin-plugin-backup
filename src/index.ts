import joplin from "api";
import JoplinCommands from "api";
import { MenuItem, MenuItemLocation } from "api/types";

joplin.plugins.register({
  onStart: async function () {
    console.info("Backup plugin started");

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
