#!/bin/bash

echo "🚀 Starting Local Whisper Server..."

# Check if virtual environment exists
if [ ! -d "whisper_env" ]; then
    echo "❌ Virtual environment not found. Please run setup.sh first."
    exit 1
fi

# Activate virtual environment
source whisper_env/bin/activate

# Set environment variables
export WHISPER_MODEL_SIZE=${WHISPER_MODEL_SIZE:-"base"}
export WHISPER_PORT=${WHISPER_PORT:-5000}
export WHISPER_HOST=${WHISPER_HOST:-"127.0.0.1"}

echo "📋 Configuration:"
echo "   Model: $WHISPER_MODEL_SIZE"
echo "   Host: $WHISPER_HOST"
echo "   Port: $WHISPER_PORT"
echo ""

# Start the server
python whisper_server.py
