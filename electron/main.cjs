const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Проверяем наличие Flash плагина
const flashPath = path.join(__dirname, 'plugins', 'pepflashplayer.dll');
let flashAvailable = false;

if (fs.existsSync(flashPath)) {
    app.commandLine.appendSwitch('ppapi-flash-path', flashPath);
    app.commandLine.appendSwitch('ppapi-flash-version', '32.0.0.465');
    app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors'); // Разрешить локальные ресурсы
    flashAvailable = true;
    console.log('[Flash] Plugin loaded from:', flashPath);
} else {
    console.log('[Flash] Plugin not found at:', flashPath);
    console.log('[Flash] Please place pepflashplayer.dll in electron/plugins/');
    console.log('[Flash] Download from: https://archive.org/details/flashplayer_old');
}

let mainWindow;
let localServer;
const swfFileMap = new Map(); // Хранит маппинг ID -> путь к файлу

// Создаем локальный HTTP сервер для раздачи SWF файлов
function createLocalServer() {
    const server = http.createServer((req, res) => {
        // Извлекаем ID из URL: /swf/12345 -> 12345
        const match = req.url.match(/^\/swf\/(.+)$/);

        if (!match) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }

        const fileId = match[1];
        const filePath = swfFileMap.get(fileId);

        if (!filePath || !fs.existsSync(filePath)) {
            console.log('[LocalServer] File not found for ID:', fileId);
            console.log('[LocalServer] Available files:', Array.from(swfFileMap.keys()));
            res.writeHead(404);
            res.end('File not found');
            return;
        }

        console.log('[LocalServer] Serving file:', filePath);

        try {
            const data = fs.readFileSync(filePath);
            res.writeHead(200, {
                'Content-Type': 'application/x-shockwave-flash',
                'Content-Length': data.length,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            });
            res.end(data);
        } catch (error) {
            console.error('[LocalServer] Error reading file:', error);
            res.writeHead(500);
            res.end('Internal Server Error');
        }
    });

    // Используем случайный свободный порт
    server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        console.log('[LocalServer] Started on http://127.0.0.1:' + port);
        localServer = { server, port };
    });

    server.on('error', (error) => {
        console.error('[LocalServer] Server error:', error);
    });

    return server;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
            plugins: true, // Включить Flash плагин
            webSecurity: false, // Для локальных SWF файлов
            allowRunningInsecureContent: true, // Разрешить небезопасный контент
            experimentalFeatures: true, // Экспериментальные возможности
        },
        icon: path.join(__dirname, '..', 'src-tauri', 'icons', 'icon.ico'),
    });

    // Загружаем приложение
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    // Запускаем локальный HTTP сервер для раздачи SWF файлов
    createLocalServer();

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('before-quit', () => {
    // Останавливаем локальный сервер при закрытии приложения
    if (localServer && localServer.server) {
        localServer.server.close();
        console.log('[LocalServer] Stopped');
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC обработчики
ipcMain.handle('get-app-path', () => {
    return app.getPath('userData');
});

ipcMain.handle('get-cache-path', () => {
    return app.getPath('cache');
});

ipcMain.handle('get-temp-path', () => {
    return app.getPath('temp');
});

ipcMain.handle('is-flash-available', () => {
    return flashAvailable;
});

ipcMain.handle('register-swf-file', async (event, filePath) => {
    // Генерируем уникальный ID для файла
    const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    // Сохраняем маппинг
    swfFileMap.set(fileId, filePath);

    // Получаем URL для файла
    if (!localServer) {
        throw new Error('Local server not started');
    }

    const url = `http://127.0.0.1:${localServer.port}/swf/${fileId}`;
    console.log('[IPC] Registered SWF file:', filePath, '->', url);

    return url;
});

ipcMain.handle('unregister-swf-file', (event, fileId) => {
    swfFileMap.delete(fileId);
    console.log('[IPC] Unregistered SWF file:', fileId);
});

ipcMain.handle('read-file', async (event, filePath) => {
    const fs = require('fs').promises;
    try {
        const data = await fs.readFile(filePath);
        // Преобразуем Buffer в Uint8Array для передачи в renderer процесс
        return new Uint8Array(data);
    } catch (error) {
        throw new Error(`Failed to read file: ${error.message}`);
    }
});

ipcMain.handle('write-file', async (event, filePath, data) => {
    const fs = require('fs').promises;
    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        // Преобразуем Uint8Array в Buffer для записи
        const buffer = Buffer.from(data);
        await fs.writeFile(filePath, buffer);
        return true;
    } catch (error) {
        throw new Error(`Failed to write file: ${error.message}`);
    }
});

ipcMain.handle('file-exists', async (event, filePath) => {
    const fs = require('fs').promises;
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
});

ipcMain.handle('delete-file', async (event, filePath) => {
    const fs = require('fs').promises;
    try {
        await fs.unlink(filePath);
        return true;
    } catch (error) {
        console.error(`Failed to delete file: ${error.message}`);
        return false;
    }
});

ipcMain.handle('read-dir', async (event, dirPath) => {
    const fs = require('fs').promises;
    try {
        const files = await fs.readdir(dirPath);
        return files;
    } catch (error) {
        throw new Error(`Failed to read directory: ${error.message}`);
    }
});

