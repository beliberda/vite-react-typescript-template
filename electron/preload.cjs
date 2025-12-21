const { contextBridge, ipcRenderer } = require('electron');

// Предоставляем безопасный API для renderer процесса
contextBridge.exposeInMainWorld('electronAPI', {
    // Получить путь к данным приложения
    getAppPath: () => ipcRenderer.invoke('get-app-path'),

    // Получить путь к кешу
    getCachePath: () => ipcRenderer.invoke('get-cache-path'),

    // Получить путь к временным файлам
    getTempPath: () => ipcRenderer.invoke('get-temp-path'),

    // Проверить доступность Flash плагина
    isFlashAvailable: () => ipcRenderer.invoke('is-flash-available'),

    // Чтение файла
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

    // Запись файла
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),

    // Проверка существования файла
    fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),

    // Удаление файла
    deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),

    // Чтение директории
    readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),

    // Регистрация SWF файла для локального сервера
    registerSwfFile: (filePath) => ipcRenderer.invoke('register-swf-file', filePath),

    // Отмена регистрации SWF файла
    unregisterSwfFile: (fileId) => ipcRenderer.invoke('unregister-swf-file', fileId),
});

