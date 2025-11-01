#!/bin/bash

echo "🛑 Stopping AI Video Knowledge Extractor"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Stopping all services...${NC}"

# Stop NestJS application
if [ -f ".nestjs.pid" ]; then
    NESTJS_PID=$(cat .nestjs.pid)
    if kill -0 "$NESTJS_PID" 2>/dev/null; then
        echo -e "${YELLOW}🔄 Stopping NestJS application (PID: $NESTJS_PID)...${NC}"
        kill "$NESTJS_PID"
        rm .nestjs.pid
        echo -e "${GREEN}✅ NestJS application stopped${NC}"
    else
        rm .nestjs.pid
    fi
else
    echo -e "${YELLOW}⚠️ NestJS PID file not found, trying to find process...${NC}"
    # Try to find and kill node processes on port 3000
    PID=$(lsof -ti:3000 2>/dev/null)
    if [ ! -z "$PID" ]; then
        echo -e "${YELLOW}🔄 Killing process on port 3000 (PID: $PID)...${NC}"
        kill $PID
    fi
fi

# Stop Python AI services
echo -e "${YELLOW}🔄 Stopping Python AI services...${NC}"
cd python-whisper
./stop_all_services.sh
cd ..

if [ -f ".python_services.pid" ]; then
    rm .python_services.pid
fi

# Stop Ollama if it was started by our script
echo -e "${YELLOW}🔄 Checking Ollama processes...${NC}"
OLLAMA_PID=$(pgrep -f "ollama serve")
if [ ! -z "$OLLAMA_PID" ]; then
    echo -e "${YELLOW}ℹ️ Ollama is still running (PID: $OLLAMA_PID). Use 'killall ollama' to stop it if needed.${NC}"
fi

# Clean up any remaining processes on our ports
echo -e "${YELLOW}🧹 Cleaning up remaining processes...${NC}"
for port in 3000 5000 5001 5002; do
    PID=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$PID" ]; then
        echo -e "${YELLOW}🔄 Killing process on port $port (PID: $PID)...${NC}"
        kill $PID 2>/dev/null
    fi
done

echo ""
echo -e "${GREEN}🎉 All services stopped successfully!${NC}"
echo ""
echo -e "${BLUE}📝 To start again, run: ./start-project.sh${NC}"
