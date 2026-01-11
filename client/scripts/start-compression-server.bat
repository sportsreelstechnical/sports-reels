@echo off

REM Start Server with Video Compression
echo 🚀 Starting server with video compression...

REM Check if FFmpeg is installed
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ FFmpeg is not installed. Please install FFmpeg first:
    echo    - Download from https://ffmpeg.org/download.html
    echo    - Add to your PATH environment variable
    pause
    exit /b 1
)

echo ✅ FFmpeg found
ffmpeg -version | findstr /C:"ffmpeg version"

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js found:
node --version

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Set environment variables
set R2_ENDPOINT=https://31ad0bcfb7e2c3a8bab2566eeabf1f4c.r2.cloudflarestorage.com
set R2_ACCESS_KEY_ID=3273ac17ec3ae48a772292d23a0475d3
set R2_SECRET_ACCESS_KEY=a69fbcb07331f7232ba245dc5378fb11ac6f861bb68503b4d9f3e6fb3ab0d47c
set R2_BUCKET_NAME=testsports

echo 🔧 Environment variables set:
echo    - R2_ENDPOINT: %R2_ENDPOINT%
echo    - R2_BUCKET_NAME: %R2_BUCKET_NAME%

REM Start the server
echo 🎬 Starting compression server on port 8082...
node server/server-with-compression.js

pause
