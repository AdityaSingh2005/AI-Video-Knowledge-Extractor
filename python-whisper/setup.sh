#!/bin/bash

echo "🐍 Setting up Python Whisper Environment..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Python version: $PYTHON_VERSION"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv whisper_env

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source whisper_env/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

# Install FFmpeg (required for Whisper)
echo "🎵 Checking FFmpeg installation..."
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️ FFmpeg not found. Please install FFmpeg:"
    echo "   macOS: brew install ffmpeg"
    echo "   Ubuntu: sudo apt update && sudo apt install ffmpeg"
    echo "   Windows: Download from https://ffmpeg.org/download.html"
else
    echo "✅ FFmpeg is installed"
fi

# Make whisper_server.py executable
chmod +x whisper_server.py

echo ""
echo "🎉 Python Whisper environment setup complete!"
echo ""
echo "To start the Whisper server:"
echo "1. cd python-whisper"
echo "2. source whisper_env/bin/activate"
echo "3. python whisper_server.py"
echo ""
echo "Or use the start script: ./start_whisper.sh"
