@echo off
title Orbital Sim - Startup
echo Checking environment...

:: Проверка наличия Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed! Please install it from https://nodejs.org/
    pause
    exit /b
)

:: Автоматическая установка зависимостей, если папка node_modules отсутствует
if not exist "node_modules\" (
    echo [INFO] First run detected. Installing dependencies...
    call npm install
)

echo [INFO] Starting Orbital Sim...

:: Запуск Vite в фоновом режиме и открытие в режиме "приложения"
:: Мы используем старт через браузер Chrome или Edge без интерфейса браузера
start /b "" npm run dev

:: Даем серверу 2 секунды на запуск перед открытием окна
timeout /t 2 /nobreak >nul

:: Пробуем открыть в Chrome в режиме приложения, если нет - просто в браузере
start chrome --app=http://localhost:5173 || start msedge --app=http://localhost:5173 || start http://localhost:5173

echo [SUCCESS] App is running!
exit