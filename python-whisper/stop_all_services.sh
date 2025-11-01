#!/bin/bash

echo "🛑 Stopping All Local AI Services..."

# Function to stop service
stop_service() {
    local service_name=$1
    local pid_file="${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "🔄 Stopping $service_name (PID: $pid)..."
            kill "$pid"
            rm "$pid_file"
            echo "✅ $service_name stopped"
        else
            echo "⚠️ $service_name was not running"
            rm "$pid_file"
        fi
    else
        echo "⚠️ No PID file found for $service_name"
    fi
}

# Stop all services
stop_service "whisper"
stop_service "embedding"
stop_service "chat"

# Also try to kill any remaining Python processes on these ports
echo "🧹 Cleaning up any remaining processes..."

# Kill processes on specific ports
for port in 5000 5001 5002; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "🔄 Killing process on port $port (PID: $pid)..."
        kill $pid 2>/dev/null
    fi
done

echo ""
echo "🎉 All services stopped!"
