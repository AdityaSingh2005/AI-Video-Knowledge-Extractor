# 🧪 Complete Testing Guide

This guide provides step-by-step instructions to test your AI Video Knowledge Extractor with real examples and payloads.

## 🚀 **Prerequisites**

1. **Start the application:**
   ```bash
   ./start-project.sh
   ```

2. **Wait for all services to be ready** (you should see):
   ```
   🎉 All services started!
   ✅ Whisper Service is running!
   ✅ Embedding Service is running!
   ✅ Chat Service is running!
   ✅ NestJS Application is running!
   ```

3. **Verify services are running:**
   ```bash
   ./test-project.sh
   ```

---

## 🧪 **Step-by-Step Testing**

### **1. Health Check - Verify Everything is Running**

```bash
# Check main application health
curl -X GET http://localhost:3000/api/health

# Expected Response:
{
  "status": "healthy",
  "timestamp": "2025-01-02T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "checks": {
    "database": {"status": "healthy", "message": "Database connection configured"},
    "redis": {"status": "healthy", "message": "Redis connection configured"},
    "openai": {"status": "unhealthy", "message": "OpenAI API key not configured"},
    "pinecone": {"status": "healthy", "message": "Pinecone configuration complete"},
    "azure": {"status": "unhealthy", "message": "Azure Blob Storage configuration incomplete"}
  }
}
```

### **2. Test Individual AI Services**

#### **Test Whisper Service:**
```bash
curl -X GET http://127.0.0.1:5000/health

# Expected Response:
{
  "status": "healthy",
  "model": "base",
  "device": "cpu",
  "model_loaded": true
}
```

#### **Test Embedding Service:**
```bash
curl -X GET http://127.0.0.1:5001/health

# Expected Response:
{
  "status": "healthy",
  "model": "all-MiniLM-L6-v2",
  "model_loaded": true,
  "embedding_dimensions": 384,
  "max_sequence_length": 256
}
```

#### **Test Chat Service:**
```bash
curl -X GET http://127.0.0.1:5002/health

# Expected Response:
{
  "status": "healthy",
  "chat_mode": "ollama",
  "ollama_running": true,
  "ollama_url": "http://127.0.0.1:11434",
  "model": "llama2:7b"
}
```

---

## 📹 **Video Upload & Processing Tests**

### **Test 1: Upload YouTube Video**

```bash
curl -X POST http://localhost:3000/api/video/upload \
  -H "Content-Type: application/json" \
  -d '{
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up"
  }'

# Expected Response:
{
  "video_id": "550e8400-e29b-41d4-a716-446655440000",
  "job_id": "660e8400-e29b-41d4-a716-446655440001",
  "status": "downloading",
  "message": "YouTube video queued for download and processing"
}
```

**Save the `video_id` from the response for next steps!**

### **Test 2: Upload Local Video File**

First, create a test video file or use an existing one:

```bash
# Using a sample video file
curl -X POST http://localhost:3000/api/video/upload \
  -F "file=@/path/to/your/video.mp4" \
  -F "title=My Test Video"

# Expected Response:
{
  "video_id": "550e8400-e29b-41d4-a716-446655440002",
  "job_id": "660e8400-e29b-41d4-a716-446655440003",
  "status": "uploaded",
  "message": "File uploaded successfully, transcription queued"
}
```

### **Test 3: Check Processing Status**

Use the `video_id` from previous responses:

```bash
# Replace VIDEO_ID with actual ID from upload response
curl -X GET http://localhost:3000/api/video/status/550e8400-e29b-41d4-a716-446655440000

# Expected Response (Processing):
{
  "video_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Rick Astley - Never Gonna Give You Up",
  "status": "transcribing",
  "progress": 45,
  "jobs": [
    {
      "job_type": "download_audio",
      "status": "completed",
      "progress": 100,
      "error_message": null
    },
    {
      "job_type": "transcribe",
      "status": "processing",
      "progress": 45,
      "error_message": null
    }
  ],
  "created_at": "2025-01-02T00:00:00.000Z",
  "updated_at": "2025-01-02T00:01:30.000Z"
}

# Expected Response (Complete):
{
  "video_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Rick Astley - Never Gonna Give You Up",
  "status": "complete",
  "progress": 100,
  "jobs": [
    {
      "job_type": "download_audio",
      "status": "completed",
      "progress": 100,
      "error_message": null
    },
    {
      "job_type": "transcribe",
      "status": "completed",
      "progress": 100,
      "error_message": null
    },
    {
      "job_type": "chunk_transcript",
      "status": "completed",
      "progress": 100,
      "error_message": null
    },
    {
      "job_type": "embed_chunks",
      "status": "completed",
      "progress": 100,
      "error_message": null
    }
  ]
}
```

---

## 📝 **Transcript & Content Tests**

### **Test 4: Get Video Transcript**

```bash
# Replace VIDEO_ID with actual ID
curl -X GET http://localhost:3000/api/video/transcript/550e8400-e29b-41d4-a716-446655440000

# Expected Response:
{
  "video_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Rick Astley - Never Gonna Give You Up",
  "status": "complete",
  "chunks": [
    {
      "id": "chunk-1",
      "text": "We're no strangers to love, you know the rules and so do I",
      "start_time": 0.0,
      "end_time": 4.2,
      "chunk_index": 0
    },
    {
      "id": "chunk-2", 
      "text": "A full commitment's what I'm thinking of, you wouldn't get this from any other guy",
      "start_time": 4.2,
      "end_time": 8.5,
      "chunk_index": 1
    }
  ]
}
```

---

## 💬 **AI Query & Chat Tests**

### **Test 5: Query Video Content (Basic)**

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is this song about?",
    "video_id": "550e8400-e29b-41d4-a716-446655440000",
    "max_chunks": 5
  }'

# Expected Response:
{
  "answer": "This song is about love and commitment. The lyrics express someone making promises about never giving up on their partner, never letting them down, and never running around or deserting them. It's essentially a declaration of unwavering loyalty and dedication in a relationship.",
  "sources": [
    {
      "chunk_id": "chunk-1",
      "text": "We're no strangers to love, you know the rules and so do I",
      "start_time": 0.0,
      "end_time": 4.2,
      "similarity_score": 0.85,
      "video_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  ],
  "query": "What is this song about?",
  "video_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### **Test 6: Query Video Content (Specific Questions)**

```bash
# Ask about specific lyrics
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What promises does the singer make?",
    "video_id": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Ask about timing
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What happens in the first 10 seconds?",
    "video_id": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Ask without specifying video (searches all videos)
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Tell me about love songs",
    "max_chunks": 3
  }'
```

### **Test 7: Complex Queries**

```bash
# Analytical question
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the main theme and emotional tone of this content?",
    "video_id": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Time-based question
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Summarize what happens between 1 and 2 minutes",
    "video_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## 🔧 **Direct AI Service Tests**

### **Test 8: Test Whisper Directly**

```bash
# Test with a sample audio URL
curl -X POST http://127.0.0.1:5000/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav"
  }'

# Expected Response:
{
  "success": true,
  "result": {
    "text": "Baby elephant walk music playing",
    "language": "en",
    "segments": [
      {
        "text": "Baby elephant walk music playing",
        "start": 0.0,
        "end": 60.0
      }
    ]
  }
}
```

### **Test 9: Test Embeddings Directly**

```bash
# Single text embedding
curl -X POST http://127.0.0.1:5001/embed \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a test sentence for embedding generation."
  }'

# Batch embeddings
curl -X POST http://127.0.0.1:5001/embed/batch \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "First test sentence",
      "Second test sentence", 
      "Third test sentence"
    ]
  }'
```

### **Test 10: Test Chat Directly**

```bash
# Simple chat
curl -X POST http://127.0.0.1:5002/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "max_tokens": 100
  }'

# Chat with context
curl -X POST http://127.0.0.1:5002/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant that analyzes video content."},
      {"role": "user", "content": "Explain the importance of video content analysis in modern applications."}
    ],
    "max_tokens": 200,
    "temperature": 0.3
  }'
```

---

## 🚨 **Error Testing & Troubleshooting**

### **Test 11: Error Handling**

```bash
# Test with invalid video ID
curl -X GET http://localhost:3000/api/video/status/invalid-id

# Test with empty query
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "video_id": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Test with invalid YouTube URL
curl -X POST http://localhost:3000/api/video/upload \
  -H "Content-Type: application/json" \
  -d '{
    "youtube_url": "not-a-valid-url",
    "title": "Invalid URL Test"
  }'
```

---

## 📊 **Performance Testing**

### **Test 12: Load Testing (Optional)**

```bash
# Test multiple concurrent queries
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/query \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": \"Test query $i\",
      \"video_id\": \"550e8400-e29b-41d4-a716-446655440000\"
    }" &
done
wait
```

---

## 🎯 **Expected Processing Times**

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| YouTube Download | 30s - 2min | Depends on video length |
| Whisper Transcription | 1-5min | Depends on audio length & model |
| Chunking | 5-30s | Depends on transcript length |
| Embedding Generation | 30s - 2min | Depends on chunk count |
| Query Response | 2-10s | Depends on model and complexity |

---

## 🔍 **Monitoring & Logs**

### **Check Service Logs:**

```bash
# Main application logs (in startup terminal)
# Python service logs
tail -f python-whisper/*.log

# Individual service status
curl http://127.0.0.1:5000/health  # Whisper
curl http://127.0.0.1:5001/health  # Embeddings  
curl http://127.0.0.1:5002/health  # Chat
```

### **Common Issues & Solutions:**

1. **"Service not responding"**
   - Check if service is running: `./test-project.sh`
   - Restart services: `./stop-project.sh && ./start-project.sh`

2. **"Model not found"**
   - For Ollama: `ollama pull llama2:7b`
   - For Whisper: Models download automatically on first use

3. **"Processing stuck"**
   - Check job status: `curl http://localhost:3000/api/video/status/VIDEO_ID`
   - Check individual service health endpoints

4. **"Out of memory"**
   - Use smaller models (tiny Whisper, phi:2.7b for chat)
   - Process smaller files
   - Close other applications

---

## 🎉 **Success Indicators**

✅ **Everything is working if you can:**
1. Upload a video (file or YouTube URL)
2. See processing progress through all stages
3. Get a complete transcript with timestamps
4. Query the video content and get relevant AI responses
5. All health checks return "healthy" status

**Congratulations! Your AI Video Knowledge Extractor is fully functional! 🚀**
