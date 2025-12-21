import { useState, useEffect, useRef } from "react";
import { GameManager, type Game, type GameUrls } from "../services/gameManager";
import { PlayerDetector, type PlayerType } from "../services/playerDetector";
import "./HybridFlashPlayer.css";

interface HybridFlashPlayerProps {
  game: Game;
  onExit: () => void;
}

interface RufflePlayerElement extends HTMLElement {
  load(url: string): Promise<void>;
  remove(): void;
}

function HybridFlashPlayer({ game, onExit }: HybridFlashPlayerProps) {
  const [mode, setMode] = useState<PlayerType | null>(null);
  const [gameUrls, setGameUrls] = useState<GameUrls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState({
    ruffle: false,
    flash: false,
  });

  const ruffleContainerRef = useRef<HTMLDivElement>(null);
  const flashContainerRef = useRef<HTMLDivElement>(null);
  const rufflePlayerRef = useRef<RufflePlayerElement | null>(null);
  const objectRef = useRef<HTMLElement | null>(null);

  // Проверяем доступные плееры при монтировании
  useEffect(() => {
    const checkPlayers = async () => {
      const availability = await PlayerDetector.checkAll();
      setAvailablePlayers({
        ruffle: availability.ruffle,
        flash: availability.flash,
      });

      // Устанавливаем рекомендуемый плеер
      setMode(availability.recommended);

      if (!availability.ruffle && !availability.flash) {
        setError("Не найдено ни одного доступного плеера для Flash");
        setIsLoading(false);
      }
    };

    checkPlayers();
  }, []);

  // Загружаем игру
  useEffect(() => {
    if (!mode) return;

    const loadGame = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Очистка старых временных файлов
        await GameManager.clearOldTempFiles();

        // Загружаем SWF файл и получаем URLs
        const urls = await GameManager.downloadGame(game.appId);
        setGameUrls(urls);

        console.log(`[HybridFlashPlayer] Game loaded:`, {
          dataUrlSize: urls.dataUrl.length,
          fileUrl: urls.fileUrl,
          localPath: urls.localPath,
        });
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Неизвестная ошибка";
        setError(errorMsg);
        console.error("Ошибка загрузки игры:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadGame();
  }, [game.appId, mode]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      // Cleanup Ruffle player
      if (rufflePlayerRef.current) {
        try {
          rufflePlayerRef.current.remove();
          rufflePlayerRef.current = null;
        } catch (e) {
          console.warn("Failed to cleanup Ruffle player:", e);
        }
      }

      // Cleanup Flash object
      if (objectRef.current && objectRef.current.parentNode) {
        objectRef.current.parentNode.removeChild(objectRef.current);
        objectRef.current = null;
      }
    };
  }, []);

  // Ruffle отключен из-за несовместимости с Electron 9.4.4
  useEffect(() => {
    if (mode !== "ruffle" || !gameUrls) return;

    const container = ruffleContainerRef.current;
    if (!container) return;

    // Показываем сообщение что Ruffle недоступен
    container.innerHTML = `
      <div class="fallback-content">
        <p>❌ Ruffle недоступен</p>
        <p>Electron 9.4.4 не поддерживает современный JavaScript синтаксис</p>
        <p>Используйте Flash плеер</p>
      </div>
    `;

    // Автоматическое переключение на Flash
    if (availablePlayers.flash) {
      console.log("[HybridFlashPlayer] Auto-switching to Flash...");
      setTimeout(() => setMode("flash"), 1000);
    }

    return () => {
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [mode, gameUrls, availablePlayers.flash]);

  // Инициализация Flash плеера
  useEffect(() => {
    if (mode !== "flash" || !gameUrls || !flashContainerRef.current) return;

    // Очищаем предыдущий embed/object
    flashContainerRef.current.innerHTML = "";

    // Создаем embed элемент для Flash (более надежный способ)
    const embed = document.createElement("embed");
    embed.type = "application/x-shockwave-flash";
    embed.src = gameUrls.fileUrl; // Используем swflocal:// протокол
    embed.width = "100%";
    embed.height = "100%";
    embed.style.border = "none";
    embed.setAttribute("allowScriptAccess", "always");
    embed.setAttribute("quality", "high");
    embed.setAttribute("bgcolor", "#000000");
    embed.setAttribute("wmode", "direct");
    embed.setAttribute("allowFullScreen", "true");

    flashContainerRef.current.appendChild(embed);
    objectRef.current = embed;

    console.log(
      "[HybridFlashPlayer] Flash player initialized with:",
      gameUrls.fileUrl
    );

    return () => {
      if (objectRef.current && objectRef.current.parentNode) {
        objectRef.current.parentNode.removeChild(objectRef.current);
        objectRef.current = null;
      }
    };
  }, [mode, gameUrls]);

  if (isLoading) {
    return (
      <div className="hybrid-player-container">
        <div className="hybrid-player-header">
          <button className="back-button" onClick={onExit}>
            ← Назад к списку
          </button>
          <h2>{game.title}</h2>
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка игры...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hybrid-player-container">
        <div className="hybrid-player-header">
          <button className="back-button" onClick={onExit}>
            ← Назад к списку
          </button>
          <h2>{game.title}</h2>
        </div>
        <div className="error-container">
          <p>❌ Ошибка загрузки игры: {error}</p>
          <button
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hybrid-player-container">
      <div className="hybrid-player-header">
        <button className="back-button" onClick={onExit}>
          ← Назад к списку
        </button>
        <h2>{game.title}</h2>
        <div className="mode-switcher">
          <button
            className={`mode-button ${mode === "ruffle" ? "active" : ""}`}
            onClick={() => setMode("ruffle")}
            disabled={!availablePlayers.ruffle}
            title={
              availablePlayers.ruffle
                ? "Ruffle - WebAssembly плеер (рекомендуется)"
                : "Ruffle недоступен"
            }
          >
            🎮 Ruffle
          </button>
          <button
            className={`mode-button ${mode === "flash" ? "active" : ""}`}
            onClick={() => setMode("flash")}
            disabled={!availablePlayers.flash}
            title={
              availablePlayers.flash
                ? "Flash - Нативный Flash Player"
                : "Flash плагин не установлен"
            }
          >
            ⚡ Flash
          </button>
        </div>
      </div>

      <div className="player-content">
        <div
          className={`ruffle-container ${
            mode === "ruffle" ? "active" : "hidden"
          }`}
          ref={ruffleContainerRef}
        >
          {mode === "ruffle" && !gameUrls && (
            <div className="fallback-content">
              <p>Загрузка игры...</p>
            </div>
          )}
        </div>

        <div
          className={`flash-container ${
            mode === "flash" ? "active" : "hidden"
          }`}
          ref={flashContainerRef}
        >
          {mode === "flash" && !gameUrls && (
            <div className="fallback-content">
              <p>Загрузка Flash контента...</p>
            </div>
          )}
        </div>
      </div>

      <div className="player-info">
        <p>
          <strong>Режим:</strong>{" "}
          {mode === "ruffle"
            ? "Ruffle (WebAssembly)"
            : mode === "flash"
            ? "Flash (Нативный)"
            : "Определение..."}
        </p>

        {mode === "flash" && !availablePlayers.ruffle && (
          <p className="flash-warning">
            ⚠️ Ruffle недоступен. Используется нативный Flash Player.
          </p>
        )}

        {!availablePlayers.flash && !availablePlayers.ruffle && (
          <p className="error-warning">
            ❌ Не найдено ни одного плеера. Установите Flash плагин или
            проверьте Ruffle.
          </p>
        )}
      </div>
    </div>
  );
}

export default HybridFlashPlayer;
