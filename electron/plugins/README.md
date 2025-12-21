# Flash Player Plugin

Для использования нативного Flash Player требуется файл `pepflashplayer.dll` (Windows).

## 🔴 ВАЖНО: Ruffle отключен

Из-за несовместимости с Electron 9.4.4, Ruffle временно отключен.
**Flash Player - единственный доступный плеер для SWF файлов.**

## 📥 Где взять Flash Player

### Вариант 1: Flash Player PPAPI (Рекомендуется)

1. Скачать: [Flash Player 32.0.0.465 PPAPI](https://archive.org/details/flashplayer_old)
2. Распаковать архив и найти `pepflashplayer.dll`
3. Положить файл в эту папку: `electron/plugins/pepflashplayer.dll`

### Вариант 2: Извлечь из Chrome

1. Найти папку Chrome: `C:\Program Files (x86)\Google\Chrome\Application\<version>\PepperFlash\`
2. Скопировать `pepflashplayer.dll` в `electron/plugins/`

## ✅ Проверка установки

После установки:

1. Перезапустить приложение
2. В консоли должно появиться: `[Flash] Plugin loaded from: ...`
3. Кнопка "⚡ Flash" станет активной

## 🔍 Структура файлов

```
electron/
  └── plugins/
      ├── README.md (этот файл)
      └── pepflashplayer.dll (поместить сюда)
```

## ⚠️ Безопасность

Flash Player устарел и имеет известные уязвимости.
Используйте только для локальных доверенных SWF файлов.
