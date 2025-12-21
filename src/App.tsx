import { useState, useEffect } from "react";
import HybridFlashPlayer from "./components/HybridFlashPlayer";
import { GameManager, type Game } from "./services/gameManager";
import "./App.css";

function App() {
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGames = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Очистка старых временных файлов при запуске
        await GameManager.clearOldTempFiles();

        const gamesList = await GameManager.getGamesList();
        setGames(gamesList);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setError(errorMsg);
        console.error("Failed to load games:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadGames();
  }, []);

  if (currentGame) {
    return (
      <HybridFlashPlayer
        game={currentGame}
        onExit={() => setCurrentGame(null)}
      />
    );
  }

  return (
    <div className="container">
      <p>Выберите игру для запуска</p>

      {isLoading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка списка игр...</p>
        </div>
      )}

      {error && (
        <div className="error-container">
          <p>❌ Ошибка загрузки игр: {error}</p>
          <p className="error-hint">
            Убедитесь, что сервер запущен на http://localhost:3000
          </p>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="games-list">
            {games.length === 0 ? (
              <p>Игры не найдены</p>
            ) : (
              games.map((game) => (
                <div
                  key={game.appId}
                  className="game-card"
                  onClick={() => setCurrentGame(game)}
                >
                  <h3>{game.title}</h3>
                  <p>Нажмите для запуска</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
