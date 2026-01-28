#!/bin/bash

echo "Orbital Sim Android Startup..."

# Проверка Node.js
if ! command -v node &> /dev/null
then
    echo "Node.js not found. Installing..."
    pkg install nodejs -y
fi

# Установка зависимостей
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting server on port 5173..."
echo "Open your browser at http://localhost:5173"

# Запуск Vite
npm run dev -- --host