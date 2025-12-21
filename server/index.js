const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Массив игр
const games = [
    {
        appId: 'doodle-jump',
        title: 'Doodle Jump',
        fileName: 'Doodle Jump.swf'
    },
    {
        appId: 'fireboy-watergirl',
        title: 'Fireboy and Watergirl in The Forest Temple',
        fileName: 'Fireboy and Watergirl in The Forest Temple.swf'
    }
];

// CORS middleware для работы с Electron
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Эндпоинт для проверки здоровья сервера
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Эндпоинт для получения списка игр
app.get('/api/games', (req, res) => {
    const gamesList = games.map(game => ({
        appId: game.appId,
        title: game.title
    }));
    res.json(gamesList);
});

// Эндпоинт для получения SWF файла по appId
app.get('/api/games/:appId/swf', (req, res) => {
    const { appId } = req.params;

    // Найти игру по appId
    const game = games.find(g => g.appId === appId);

    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    // Путь к файлу
    const filePath = path.join(__dirname, 'resources', game.fileName);

    // Проверить существование файла
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'SWF file not found' });
    }

    // Отправить файл с правильными заголовками
    res.setHeader('Content-Type', 'application/x-shockwave-flash');
    res.setHeader('Content-Disposition', `attachment; filename="${game.fileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Кеширование на 1 час
    res.sendFile(filePath);
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Available games: ${games.map(g => g.appId).join(', ')}`);
});

