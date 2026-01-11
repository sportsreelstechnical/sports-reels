#!/bin/bash

echo "🚀 Starting Google Cloud Translation Server..."
cd server

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🌐 Starting server on port 3001..."
npm run dev &

SERVER_PID=$!
echo "✅ Translation server started with PID: $SERVER_PID"
echo "📍 Health check: http://localhost:3001/api/health"
echo "🌐 Translation endpoint: http://localhost:3001/api/translate"
echo ""
echo "To stop the server, run: kill $SERVER_PID"
echo "Server is running in the background..."
