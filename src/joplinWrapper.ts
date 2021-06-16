import joplin from "../api";

export namespace joplinWrapper {
  export async function settingsValue(key: string): Promise<any> {
    return await joplin.settings.value(key);
  }

  export async function settingsGlobalValue(key: string): Promise<any> {
    return await joplin.settings.globalValue(key);
  }

  export async function installationDir(): Promise<any> {
    return joplin.plugins.installationDir();
  }

  export async function settingsSetValue(key: string, value: any) {
    await joplin.settings.setValue(key, value);
  }
}
