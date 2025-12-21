import { electronAPI } from "./electronIPC";

export type PlayerType = "ruffle" | "flash";

export interface PlayerAvailability {
  ruffle: boolean;
  flash: boolean;
  recommended: PlayerType;
}

export class PlayerDetector {
  private static ruffleChecked = false;
  private static ruffleAvailable = false;
  private static flashChecked = false;
  private static flashAvailable = false;

  /**
   * Проверить доступность Ruffle
   */
  static async checkRuffle(): Promise<boolean> {
    if (this.ruffleChecked) {
      return this.ruffleAvailable;
    }

    // Ruffle отключен из-за несовместимости с Electron 9.4.4
    // Современный JS синтаксис не поддерживается в старом Chromium
    this.ruffleAvailable = false;
    console.log(
      "[PlayerDetector] Ruffle disabled (incompatible with Electron 9.4.4)"
    );

    this.ruffleChecked = true;
    return this.ruffleAvailable;
  }

  /**
   * Проверить доступность Flash плагина
   */
  static async checkFlash(): Promise<boolean> {
    if (this.flashChecked) {
      return this.flashAvailable;
    }

    try {
      // Проверяем через Electron API
      this.flashAvailable = await electronAPI.isFlashAvailable();

      if (this.flashAvailable) {
        console.log("[PlayerDetector] Flash plugin is available");
      } else {
        console.log("[PlayerDetector] Flash plugin not available");
      }
    } catch (error) {
      console.warn("[PlayerDetector] Failed to check Flash:", error);
      this.flashAvailable = false;
    }

    this.flashChecked = true;
    return this.flashAvailable;
  }

  /**
   * Проверить доступность всех плееров
   */
  static async checkAll(): Promise<PlayerAvailability> {
    const [ruffle, flash] = await Promise.all([
      this.checkRuffle(),
      this.checkFlash(),
    ]);

    // Приоритет: Ruffle > Flash
    const recommended: PlayerType = ruffle ? "ruffle" : "flash";

    return {
      ruffle,
      flash,
      recommended,
    };
  }

  /**
   * Получить рекомендуемый плеер
   */
  static async getRecommendedPlayer(): Promise<PlayerType> {
    const availability = await this.checkAll();
    return availability.recommended;
  }

  /**
   * Проверить, доступен ли хотя бы один плеер
   */
  static async hasAnyPlayer(): Promise<boolean> {
    const availability = await this.checkAll();
    return availability.ruffle || availability.flash;
  }

  /**
   * Сбросить кеш проверок (для тестирования)
   */
  static reset(): void {
    this.ruffleChecked = false;
    this.ruffleAvailable = false;
    this.flashChecked = false;
    this.flashAvailable = false;
  }
}
