import { SettingSection, SettingItem } from "api/types";

export default {
  settings: {
    value: async (key: string): Promise<any> => {
      return 0;
    },
    globalValue: async (key: string): Promise<any> => {
      return 0;
    },
    setValue: async (key: string, value: any): Promise<void> => {},
    registerSection: async (
      name: string,
      section: SettingSection
    ): Promise<void> => {},
    registerSettings: async (
      settings: Record<string, SettingItem>
    ): Promise<void> => {},
  },
  plugins: {
    installationDir: async (): Promise<string> => {
      return "";
    },
    dataDir: async (): Promise<string> => {
      return "";
    },
  },
};
