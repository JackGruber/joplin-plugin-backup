import joplin from "../api";

export namespace joplinWrapper {
  export async function settingsValue(key: string): Promise<any> {
    return await joplin.settings.value(key);
  }

  export async function settingsGlobalValue(key: string): Promise<any> {
    return await joplin.settings.globalValue(key);
  }
}
