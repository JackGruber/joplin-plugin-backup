import joplin from "api";
import { Backup } from "./Backup";

const backup = new Backup();

joplin.plugins.register({
  onStart: async function () {
    console.log("Start Backup Plugin");
    await backup.init();

    joplin.settings.onChange(async (event: any) => {
      if (event.keys.indexOf("backupInterval") !== -1) {
        console.log("Backup interval changed");
        await backup.startTimer();
      }
    });
  },
});
