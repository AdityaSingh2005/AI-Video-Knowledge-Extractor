#!/bin/bash

echo "🧪 Testing AI Video Knowledge Extractor"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

# Function to make HTTP request and check response
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${BLUE}🔍 Testing: $description${NC}"
    echo -e "${YELLOW}   $method $endpoint${NC}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    fi
    
    # Extract HTTP status code (last line)
    http_code=$(echo "$response" | tail -n1)
    # Extract response body (all but last line)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo -e "${GREEN}   ✅ Success ($http_code)${NC}"
        echo -e "${GREEN}   Response: $body${NC}"
    else
        echo -e "${RED}   ❌ Failed ($http_code)${NC}"
        echo -e "${RED}   Response: $body${NC}"
    fi
    
    echo ""
    return $http_code
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=10
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for $name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $name is ready!${NC}"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $name is not responding after $max_attempts attempts${NC}"
    return 1
}

echo -e "${BLUE}📋 Checking if all services are running...${NC}"

# Check main application
wait_for_service "$BASE_URL/api/health" "Main Application"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Main application is not running. Please start it first with: ./start-project.sh${NC}"
    exit 1
fi

# Check AI services
wait_for_service "http://127.0.0.1:5000/health" "Whisper Service"
wait_for_service "http://127.0.0.1:5001/health" "Embedding Service"
wait_for_service "http://127.0.0.1:5002/health" "Chat Service"

echo ""
echo -e "${BLUE}🧪 Running API Tests...${NC}"
echo ""

# Test 1: Health Check
test_endpoint "GET" "/api/health" "" "Health Check"

# Test 2: Individual AI Service Health Checks
echo -e "${BLUE}🔍 Testing AI Services Health:${NC}"
curl -s http://127.0.0.1:5000/health | jq '.' 2>/dev/null || curl -s http://127.0.0.1:5000/health
echo ""
curl -s http://127.0.0.1:5001/health | jq '.' 2>/dev/null || curl -s http://127.0.0.1:5001/health
echo ""
curl -s http://127.0.0.1:5002/health | jq '.' 2>/dev/null || curl -s http://127.0.0.1:5002/health
echo ""

# Test 3: Test Whisper Service Directly
echo -e "${BLUE}🎙️ Testing Whisper Service:${NC}"
echo "   Testing with sample text-to-speech URL..."
whisper_test='{"audio_url": "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav"}'
curl -s -X POST -H "Content-Type: application/json" -d "$whisper_test" http://127.0.0.1:5000/transcribe | head -c 200
echo "..."
echo ""

# Test 4: Test Embedding Service Directly  
echo -e "${BLUE}🧠 Testing Embedding Service:${NC}"
embedding_test='{"text": "This is a test sentence for embedding generation."}'
curl -s -X POST -H "Content-Type: application/json" -d "$embedding_test" http://127.0.0.1:5001/embed | head -c 200
echo "..."
echo ""

# Test 5: Test Chat Service Directly
echo -e "${BLUE}💬 Testing Chat Service:${NC}"
chat_test='{"messages": [{"role": "user", "content": "Hello, how are you?"}], "max_tokens": 50}'
curl -s -X POST -H "Content-Type: application/json" -d "$chat_test" http://127.0.0.1:5002/chat/completions | head -c 200
echo "..."
echo ""

# Test 6: Upload Test (without actual file)
echo -e "${BLUE}📤 Testing Upload Endpoint (without file):${NC}"
test_endpoint "POST" "/api/video/upload" '{"youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "title": "Test Video"}' "YouTube URL Upload"

# Test 7: Query Test
echo -e "${BLUE}🔍 Testing Query Endpoint:${NC}"
query_test='{"query": "What is artificial intelligence?", "max_chunks": 3}'
test_endpoint "POST" "/api/query" "$query_test" "Content Query"

echo ""
echo -e "${GREEN}🎉 Testing Complete!${NC}"
echo ""
echo -e "${BLUE}📝 Manual Testing Instructions:${NC}"
echo ""
echo -e "${YELLOW}1. Upload a Video File:${NC}"
echo '   curl -X POST http://localhost:3000/api/video/upload \'
echo '     -F "file=@your-video.mp4" \'
echo '     -F "title=My Test Video"'
echo ""
echo -e "${YELLOW}2. Upload from YouTube:${NC}"
echo '   curl -X POST http://localhost:3000/api/video/upload \'
echo '     -H "Content-Type: application/json" \'
echo '     -d '"'"'{"youtube_url": "https://youtube.com/watch?v=VIDEO_ID", "title": "YouTube Video"}'"'"
echo ""
echo -e "${YELLOW}3. Check Processing Status:${NC}"
echo '   curl http://localhost:3000/api/video/status/VIDEO_ID'
echo ""
echo -e "${YELLOW}4. Query Video Content:${NC}"
echo '   curl -X POST http://localhost:3000/api/query \'
echo '     -H "Content-Type: application/json" \'
echo '     -d '"'"'{"query": "What is the main topic?", "video_id": "VIDEO_ID"}'"'"
echo ""
echo -e "${YELLOW}5. Get Video Transcript:${NC}"
echo '   curl http://localhost:3000/api/video/transcript/VIDEO_ID'
echo ""
echo -e "${BLUE}📊 Monitor Logs:${NC}"
echo "   - Main app logs: Check terminal where you ran ./start-project.sh"
echo "   - AI service logs: Check python-whisper/*.log files"
echo ""
echo -e "${BLUE}🔧 Troubleshooting:${NC}"
echo "   - If services fail: ./stop-project.sh && ./start-project.sh"
echo "   - Check individual service health: curl http://127.0.0.1:PORT/health"
echo "   - View detailed logs in the startup terminal"
