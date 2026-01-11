@echo off
echo 🌐 Setting up Google Cloud Translation Integration...

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
call npm install axios

REM Setup backend
echo 🔧 Setting up backend server...
if not exist server mkdir server
cd server

REM Install backend dependencies
echo 📦 Installing backend dependencies...
call npm install

cd ..

REM Create environment files
echo ⚙️ Creating environment configuration files...

REM Frontend .env.example
(
echo # Google Cloud Translation API Configuration
echo.
echo # Frontend-only approach: Google Translate API Key
echo # Get this from Google Cloud Console ^> APIs ^& Services ^> Credentials
echo VITE_GOOGLE_TRANSLATE_API_KEY=AIza...your_api_key_here
echo.
echo # Backend approach: Backend server URL
echo VITE_BACKEND_URL=http://localhost:3001
echo.
echo # Optional: Default language
echo VITE_DEFAULT_LANGUAGE=en
) > .env.example

REM Backend .env.example
(
echo # Google Cloud Translation Server Configuration
echo.
echo # Server port
echo PORT=3001
echo.
echo # Google Cloud Project ID ^(required for service account authentication^)
echo GOOGLE_CLOUD_PROJECT_ID=fabled-emissary-472921
echo.
echo # Alternative: Google Translate API Key ^(if not using service account^)
echo # GOOGLE_TRANSLATE_API_KEY=AIza...your_api_key_here
echo.
echo # Service Account Key File Path ^(relative to server directory^)
echo GOOGLE_APPLICATION_CREDENTIALS=../key/fabled-emissary-472921-v0-65a0cfc84660.json
) > server\.env.example

echo ✅ Installation complete!
echo.
echo 📋 Next steps:
echo 1. Copy .env.example to .env and add your Google Translate API key
echo 2. Copy server\.env.example to server\.env and configure as needed
echo 3. For frontend-only: Set VITE_GOOGLE_TRANSLATE_API_KEY in .env
echo 4. For backend: Start server with 'cd server && npm run dev'
echo 5. Visit /translation-demo to test the integration
echo.
echo 📖 See TRANSLATION_SETUP.md for detailed instructions

pause
