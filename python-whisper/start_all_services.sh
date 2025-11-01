#!/bin/bash

echo "🚀 Starting All Local AI Services..."

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

export EMBEDDING_MODEL_NAME=${EMBEDDING_MODEL_NAME:-"all-MiniLM-L6-v2"}
export EMBEDDING_PORT=${EMBEDDING_PORT:-5001}
export EMBEDDING_HOST=${EMBEDDING_HOST:-"127.0.0.1"}

export CHAT_MODE=${CHAT_MODE:-"ollama"}
export OLLAMA_MODEL=${OLLAMA_MODEL:-"llama2:7b"}
export CHAT_PORT=${CHAT_PORT:-5002}
export CHAT_HOST=${CHAT_HOST:-"127.0.0.1"}

echo "📋 Configuration:"
echo "   Whisper Model: $WHISPER_MODEL_SIZE (Port: $WHISPER_PORT)"
echo "   Embedding Model: $EMBEDDING_MODEL_NAME (Port: $EMBEDDING_PORT)"
echo "   Chat Model: $OLLAMA_MODEL (Port: $CHAT_PORT)"
echo ""

# Function to start service in background
start_service() {
    local service_name=$1
    local script_name=$2
    local port=$3
    
    echo "🔄 Starting $service_name on port $port..."
    python $script_name &
    local pid=$!
    echo "$pid" > "${service_name}.pid"
    echo "✅ $service_name started (PID: $pid)"
}

# Start all services
start_service "whisper" "whisper_server.py" $WHISPER_PORT
sleep 2

start_service "embedding" "embedding_server.py" $EMBEDDING_PORT
sleep 2

start_service "chat" "chat_server.py" $CHAT_PORT
sleep 2

echo ""
echo "🎉 All services started!"
echo ""
echo "Service URLs:"
echo "  Whisper:   http://$WHISPER_HOST:$WHISPER_PORT"
echo "  Embedding: http://$EMBEDDING_HOST:$EMBEDDING_PORT"
echo "  Chat:      http://$CHAT_HOST:$CHAT_PORT"
echo ""
echo "Health checks:"
echo "  curl http://$WHISPER_HOST:$WHISPER_PORT/health"
echo "  curl http://$EMBEDDING_HOST:$EMBEDDING_PORT/health"
echo "  curl http://$CHAT_HOST:$CHAT_PORT/health"
echo ""
echo "To stop all services: ./stop_all_services.sh"
