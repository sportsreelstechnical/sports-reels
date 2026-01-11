@echo off
echo 🚀 Starting Google Cloud Translation Server...
cd server
start "Translation Server" cmd /k "npm run dev"
echo ✅ Translation server started in new window
echo 📍 Health check: http://localhost:3001/api/health
echo 🌐 Translation endpoint: http://localhost:3001/api/translate
echo.
echo Press any key to continue...
pause > nul
