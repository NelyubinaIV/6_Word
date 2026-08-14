# Космическая академия слов

Статический SPA-интерфейс для GitVerse Pages, работающий с существующим Yandex Cloud API.

## Запуск

Можно открыть `index.html` двойным кликом или запустить проект через любой локальный статический сервер, например расширение Live Server.

## Структура

- `index.html` — точка входа
- `css/app.css` — адаптивная игровая дизайн-система
- `js/api.js` — единый API-клиент с Bearer token и обработкой 401
- `js/app.js` — login, dashboard, new/review/difficult, task, result и logout
- `assets/illustrations/` — сгенерированные игровые изображения

Правильные ответы не хранятся во frontend: проверка выполняется только через `POST /check`.
