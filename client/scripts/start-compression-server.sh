#!/bin/bash

# Start Server with Video Compression
echo "🚀 Starting server with video compression..."

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg is not installed. Please install FFmpeg first:"
    echo "   - Ubuntu/Debian: sudo apt install ffmpeg"
    echo "   - macOS: brew install ffmpeg"
    echo "   - Windows: Download from https://ffmpeg.org/download.html"
    exit 1
fi

echo "✅ FFmpeg found: $(ffmpeg -version | head -n 1)"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set environment variables
export R2_ENDPOINT="https://31ad0bcfb7e2c3a8bab2566eeabf1f4c.r2.cloudflarestorage.com"
export R2_ACCESS_KEY_ID="3273ac17ec3ae48a772292d23a0475d3"
export R2_SECRET_ACCESS_KEY="a69fbcb07331f7232ba245dc5378fb11ac6f861bb68503b4d9f3e6fb3ab0d47c"
export R2_BUCKET_NAME="testsports"

echo "🔧 Environment variables set:"
echo "   - R2_ENDPOINT: $R2_ENDPOINT"
echo "   - R2_BUCKET_NAME: $R2_BUCKET_NAME"

# Start the server
echo "🎬 Starting compression server on port 8082..."
node server/server-with-compression.js
