// Обертка для Electron IPC API
declare global {
  interface Window {
    electronAPI: {
      getAppPath: () => Promise<string>;
      getCachePath: () => Promise<string>;
      getTempPath: () => Promise<string>;
      isFlashAvailable: () => Promise<boolean>;
      readFile: (filePath: string) => Promise<Uint8Array>;
      writeFile: (filePath: string, data: Uint8Array) => Promise<boolean>;
      fileExists: (filePath: string) => Promise<boolean>;
      deleteFile: (filePath: string) => Promise<boolean>;
      readDir: (dirPath: string) => Promise<string[]>;
      registerSwfFile: (filePath: string) => Promise<string>;
      unregisterSwfFile: (fileId: string) => Promise<void>;
    };
  }
}

export const electronAPI = window.electronAPI;
