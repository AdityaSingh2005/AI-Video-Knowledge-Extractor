#!/bin/bash

echo "🚀 Starting AI Video Knowledge Extractor - Complete Local Setup"
echo "================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a service is running
check_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for $name to start...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $name is running!${NC}"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $name failed to start after $max_attempts attempts${NC}"
    return 1
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check Node.js
if ! command_exists node; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

# Check Python
if ! command_exists python3; then
    echo -e "${RED}❌ Python3 not found. Please install Python 3.8+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python3 found: $(python3 --version)${NC}"

# Check PostgreSQL
if ! command_exists psql; then
    echo -e "${YELLOW}⚠️ PostgreSQL client not found. Make sure PostgreSQL is running.${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL client found${NC}"
fi

# Check Redis
if ! command_exists redis-cli; then
    echo -e "${YELLOW}⚠️ Redis client not found. Make sure Redis is running.${NC}"
else
    echo -e "${GREEN}✅ Redis client found${NC}"
fi

# Check Ollama
if ! command_exists ollama; then
    echo -e "${YELLOW}⚠️ Ollama not found. Installing Ollama...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew install ollama
        else
            echo -e "${RED}❌ Please install Ollama manually: https://ollama.ai/download${NC}"
            exit 1
        fi
    else
        # Linux
        curl -fsSL https://ollama.ai/install.sh | sh
    fi
fi
echo -e "${GREEN}✅ Ollama found${NC}"

echo ""
echo -e "${BLUE}🔧 Setting up environment...${NC}"

# Copy .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Creating .env file from template...${NC}"
    cp env.example .env
    echo -e "${GREEN}✅ .env file created. Please configure your database and API keys.${NC}"
fi

# Install Node.js dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    npm install
fi

echo ""
echo -e "${BLUE}🐍 Setting up Python environment...${NC}"

# Setup Python environment
cd python-whisper

if [ ! -d "whisper_env" ]; then
    echo -e "${YELLOW}🔧 Setting up Python virtual environment...${NC}"
    ./setup.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Python setup failed${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}🤖 Starting Ollama and pulling models...${NC}"

# Start Ollama if not running
if ! pgrep -f "ollama serve" > /dev/null; then
    echo -e "${YELLOW}🔄 Starting Ollama...${NC}"
    ollama serve &
    sleep 3
fi

# Pull default model if not exists
if ! ollama list | grep -q "llama2:7b"; then
    echo -e "${YELLOW}📥 Pulling Llama2 model (this may take a while)...${NC}"
    ollama pull llama2:7b
fi

echo ""
echo -e "${BLUE}🚀 Starting all AI services...${NC}"

# Start Python AI services
./start_all_services.sh &
PYTHON_SERVICES_PID=$!

# Wait for services to start
sleep 5

# Check if Python services are running
check_service "http://127.0.0.1:5000/health" "Whisper Service"
check_service "http://127.0.0.1:5001/health" "Embedding Service"  
check_service "http://127.0.0.1:5002/health" "Chat Service"

cd ..

echo ""
echo -e "${BLUE}🏗️ Building and starting NestJS application...${NC}"

# Build the application
npm run build

# Start NestJS application in background
npm run start:prod &
NESTJS_PID=$!

# Wait for NestJS to start
check_service "http://localhost:3000/api/health" "NestJS Application"

echo ""
echo -e "${GREEN}🎉 All services are running!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
echo "  🎙️  Whisper (Transcription):  http://127.0.0.1:5000"
echo "  🧠 Embeddings:              http://127.0.0.1:5001"
echo "  💬 Chat (Ollama):           http://127.0.0.1:5002"
echo "  🚀 Main API:                http://localhost:3000"
echo ""
echo -e "${BLUE}🧪 Quick Health Check:${NC}"
echo "  curl http://localhost:3000/api/health"
echo ""
echo -e "${BLUE}📚 API Documentation:${NC}"
echo "  Upload Video:    POST http://localhost:3000/api/video/upload"
echo "  Check Status:    GET  http://localhost:3000/api/video/status/:videoId"
echo "  Query Content:   POST http://localhost:3000/api/query"
echo ""
echo -e "${YELLOW}⚠️  To stop all services, run: ./stop-project.sh${NC}"
echo ""

# Save PIDs for cleanup
echo "$PYTHON_SERVICES_PID" > .python_services.pid
echo "$NESTJS_PID" > .nestjs.pid

# Keep script running
echo -e "${BLUE}📝 Logs will appear below. Press Ctrl+C to stop all services.${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping all services...${NC}"
    
    # Stop NestJS
    if [ -f ".nestjs.pid" ]; then
        kill $(cat .nestjs.pid) 2>/dev/null
        rm .nestjs.pid
    fi
    
    # Stop Python services
    cd python-whisper
    ./stop_all_services.sh
    cd ..
    
    if [ -f ".python_services.pid" ]; then
        rm .python_services.pid
    fi
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Wait for user interrupt
wait
