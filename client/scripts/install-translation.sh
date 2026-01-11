#!/bin/bash

echo "🌐 Setting up Google Cloud Translation Integration..."

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install axios

# Setup backend
echo "🔧 Setting up backend server..."
mkdir -p server
cd server

# Create package.json if it doesn't exist
if [ ! -f package.json ]; then
    echo "📝 Creating backend package.json..."
    cat > package.json << 'EOF'
{
  "name": "reel-connect-translation-server",
  "version": "1.0.0",
  "description": "Google Cloud Translation API server for Reel Connect Sports Hub",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "google-cloud-translate",
    "translation",
    "express",
    "api"
  ],
  "author": "Reel Connect Sports Hub",
  "license": "MIT",
  "dependencies": {
    "@google-cloud/translate": "^8.5.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
EOF
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

cd ..

# Create environment files
echo "⚙️ Creating environment configuration files..."

# Frontend .env.example
cat > .env.example << 'EOF'
# Google Cloud Translation API Configuration

# Frontend-only approach: Google Translate API Key
# Get this from Google Cloud Console > APIs & Services > Credentials
VITE_GOOGLE_TRANSLATE_API_KEY=AIza...your_api_key_here

# Backend approach: Backend server URL
VITE_BACKEND_URL=http://localhost:3001

# Optional: Default language
VITE_DEFAULT_LANGUAGE=en
EOF

# Backend .env.example
cat > server/.env.example << 'EOF'
# Google Cloud Translation Server Configuration

# Server port
PORT=3001

# Google Cloud Project ID (required for service account authentication)
GOOGLE_CLOUD_PROJECT_ID=fabled-emissary-472921

# Alternative: Google Translate API Key (if not using service account)
# GOOGLE_TRANSLATE_API_KEY=AIza...your_api_key_here

# Service Account Key File Path (relative to server directory)
GOOGLE_APPLICATION_CREDENTIALS=../key/fabled-emissary-472921-v0-65a0cfc84660.json
EOF

echo "✅ Installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy .env.example to .env and add your Google Translate API key"
echo "2. Copy server/.env.example to server/.env and configure as needed"
echo "3. For frontend-only: Set VITE_GOOGLE_TRANSLATE_API_KEY in .env"
echo "4. For backend: Start server with 'cd server && npm run dev'"
echo "5. Visit /translation-demo to test the integration"
echo ""
echo "📖 See TRANSLATION_SETUP.md for detailed instructions"
