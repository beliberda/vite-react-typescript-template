import { electronAPI } from "./electronIPC";

export interface SWFHeader {
  signature: string;
  version: number;
  fileSize: number;
  frameRate: number;
  isCompressed: boolean;
  isAS3: boolean;
  isAS2: boolean;
}

export interface Game {
  appId: string;
  title: string;
}

export interface GameUrls {
  dataUrl: string; // Для Ruffle - Data URL
  fileUrl: string; // Для Flash - swflocal:// протокол
  localPath: string; // Локальный путь к файлу
}

export class GameManager {
  // private static readonly CACHE_DIR = "games";
  private static readonly TEMP_DIR = "flash-game-launcher";
  private static readonly SERVER_URL = "http://localhost:3000";

  /**
   * Получить путь к кешу игр
   * Зарезервировано для будущего использования (может использоваться для долгосрочного кеширования)
   */
  // private static async getCacheDir(): Promise<string> {
  //   const cachePath = await electronAPI.getCachePath();
  //   // Определяем разделитель пути по содержимому пути
  //   const separator = cachePath.includes("\\") ? "\\" : "/";
  //   return `${cachePath}${separator}${this.CACHE_DIR}`;
  // }

  /**
   * Получить путь к временным файлам
   */
  private static async getTempDir(): Promise<string> {
    const tempPath = await electronAPI.getTempPath();
    const separator = tempPath.includes("\\") ? "\\" : "/";
    return `${tempPath}${separator}${this.TEMP_DIR}`;
  }

  /**
   * Получить список игр с сервера
   */
  static async getGamesList(): Promise<Game[]> {
    try {
      const response = await fetch(`${this.SERVER_URL}/api/games`);
      if (!response.ok) {
        throw new Error(`Failed to fetch games list: ${response.statusText}`);
      }
      const games = await response.json();
      return games;
    } catch (error) {
      throw new Error(`Failed to get games list: ${error}`);
    }
  }

  /**
   * Скачать игру с сервера и сохранить во временный файл
   * Возвращает URLs для разных плееров
   */
  static async downloadGame(appId: string): Promise<GameUrls> {
    const tempDir = await this.getTempDir();
    const separator = tempDir.includes("\\") ? "\\" : "/";
    const timestamp = Date.now();
    const tempPath = `${tempDir}${separator}${appId}_${timestamp}.swf`;

    console.log(`[GameManager] Downloading SWF: ${appId}`);

    // Скачать с сервера
    const swfUrl = `${this.SERVER_URL}/api/games/${appId}/swf`;
    const response = await fetch(swfUrl);
    if (!response.ok) {
      throw new Error(`Failed to download SWF: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);

    // Сохранить во временный файл
    await electronAPI.writeFile(tempPath, data);
    console.log(`[GameManager] Saved temp SWF: ${tempPath}`);

    // Создать Data URL для Ruffle
    const base64 = this.arrayBufferToBase64(buffer);
    const dataUrl = `data:application/x-shockwave-flash;base64,${base64}`;

    // Регистрируем файл в локальном HTTP сервере и получаем URL
    const fileUrl = await electronAPI.registerSwfFile(tempPath);

    console.log(`[GameManager] Created URLs for: ${appId}`);
    console.log(`[GameManager] - Data URL size: ${dataUrl.length} chars`);
    console.log(`[GameManager] - File URL: ${fileUrl}`);
    console.log(`[GameManager] - Local path: ${tempPath}`);

    return {
      dataUrl,
      fileUrl,
      localPath: tempPath,
    };
  }

  /**
   * Преобразовать ArrayBuffer в base64 строку
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Проанализировать SWF header
   */
  static analyzeSWFHeader(swfData: Uint8Array): SWFHeader {
    const signature = String.fromCharCode(swfData[0], swfData[1], swfData[2]);
    const version = swfData[3];
    const fileSize = new DataView(swfData.buffer).getUint32(4, true);
    const frameRate = new DataView(swfData.buffer).getUint16(12, true) >> 8;

    return {
      signature,
      version,
      fileSize,
      frameRate,
      isCompressed: signature !== "FWS",
      isAS3: version >= 9,
      isAS2: version >= 6 && version < 9,
    };
  }

  /**
   * Очистить старые временные файлы (старше 1 часа)
   */
  static async clearOldTempFiles(): Promise<void> {
    try {
      const tempDir = await this.getTempDir();
      const exists = await electronAPI.fileExists(tempDir);

      if (!exists) {
        console.log(
          "[GameManager] Temp directory doesn't exist, nothing to clean"
        );
        return;
      }

      const files = await electronAPI.readDir(tempDir);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      for (const file of files) {
        if (file.endsWith(".swf")) {
          // Извлекаем timestamp из имени файла
          const match = file.match(/_(\d+)\.swf$/);
          if (match) {
            const timestamp = parseInt(match[1], 10);
            if (now - timestamp > oneHour) {
              const separator = tempDir.includes("\\") ? "\\" : "/";
              const filePath = `${tempDir}${separator}${file}`;
              const deleted = await electronAPI.deleteFile(filePath);
              if (deleted) {
                console.log(`[GameManager] Deleted old temp file: ${file}`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(`[GameManager] Failed to clear temp files: ${error}`);
    }
  }

  /**
   * Очистить кеш
   */
  static async clearCache(): Promise<void> {
    console.log("[GameManager] Clearing cache...");
    await this.clearOldTempFiles();
  }
}
