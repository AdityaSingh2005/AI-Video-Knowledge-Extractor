# 🆓 Complete Local Setup Guide - Run Everything for FREE!

This guide will help you set up the entire AI Video Knowledge Extractor to run completely locally without any API costs.

## 🎯 What You'll Get

- ✅ **Local Whisper** - Free speech-to-text transcription
- ✅ **Local Embeddings** - Free text embeddings using Sentence Transformers
- ✅ **Local Chat** - Free AI chat using Ollama (Llama2, Mistral, etc.)
- ✅ **Pinecone** - Vector database (free tier: 1M vectors)
- ✅ **No OpenAI costs** - Everything runs on your machine!

## 📋 Prerequisites

1. **Python 3.8+** installed
2. **Node.js 18+** installed
3. **PostgreSQL** running
4. **Redis** running
5. **FFmpeg** installed
6. **Ollama** installed (for local chat)

## 🚀 Step-by-Step Setup

### 1. **Install System Dependencies**

**macOS:**
```bash
# Install FFmpeg
brew install ffmpeg

# Install Ollama
brew install ollama

# Start Ollama service
brew services start ollama
# OR manually: ollama serve
```

**Ubuntu/Debian:**
```bash
# Install FFmpeg
sudo apt update && sudo apt install ffmpeg

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama
ollama serve &
```

**Windows:**
- Download FFmpeg from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
- Download Ollama from [https://ollama.ai/download](https://ollama.ai/download)

### 2. **Set up Python Environment**

```bash
cd python-whisper
./setup.sh
```

This installs:
- OpenAI Whisper (local transcription)
- Sentence Transformers (local embeddings)
- Flask servers for API endpoints

### 3. **Configure Environment**

Copy and update your environment file:
```bash
cp env.example .env
```

Your `.env` should look like this:
```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=ai_video_extractor

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Pinecone Configuration (Your actual values)
PINECONE_API_KEY=pcsk_2vDwe3_FJRrqVyTvsctJcSwZz5bgVbNcFs1uaqwLupm4GgyMVaxC5e1FeG4un4gnX4wx7u
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=ai-video-knowledge-extractor

# Local AI Services (All FREE!)
WHISPER_MODE=local
EMBEDDING_MODE=local
CHAT_MODE=local

# Service URLs
LOCAL_WHISPER_URL=http://127.0.0.1:5000
LOCAL_EMBEDDING_URL=http://127.0.0.1:5001
LOCAL_CHAT_URL=http://127.0.0.1:5002

# Model Configuration
WHISPER_MODEL_SIZE=base
EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2
OLLAMA_MODEL=llama2:7b

# Application Configuration
PORT=3000
NODE_ENV=development
```

### 4. **Start All Local AI Services**

```bash
cd python-whisper
./start_all_services.sh
```

This starts:
- **Whisper Server** (Port 5000) - Speech-to-text
- **Embedding Server** (Port 5001) - Text embeddings  
- **Chat Server** (Port 5002) - AI chat responses

### 5. **Set up Ollama Models**

```bash
# Pull the default model (this may take a while)
ollama pull llama2:7b

# Optional: Try other models
ollama pull mistral:7b     # Faster, good quality
ollama pull phi:2.7b       # Very fast, smaller
ollama pull codellama:7b   # Good for code-related queries
```

### 6. **Start the NestJS Application**

```bash
# Install dependencies (if not done)
npm install

# Start the application
npm run start:dev
```

## 🧪 Testing Your Setup

### **1. Test Individual Services**

```bash
# Test Whisper
curl http://127.0.0.1:5000/health

# Test Embeddings
curl http://127.0.0.1:5001/health

# Test Chat
curl http://127.0.0.1:5002/health

# Test NestJS
curl http://localhost:3000/api/health
```

### **2. Test Full Pipeline**

```bash
# Upload a video
curl -X POST http://localhost:3000/api/video/upload \
  -F "file=@test-video.mp4" \
  -F "title=Test Video"

# Check processing status
curl http://localhost:3000/api/video/status/VIDEO_ID

# Query the video content
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the main topic discussed?",
    "video_id": "VIDEO_ID"
  }'
```

## ⚡ Performance & Model Recommendations

### **For Development/Testing:**
```env
WHISPER_MODEL_SIZE=base
EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2
OLLAMA_MODEL=phi:2.7b
```
- Fast processing
- Good quality
- Low resource usage

### **For Production/Best Quality:**
```env
WHISPER_MODEL_SIZE=large
EMBEDDING_MODEL_NAME=all-mpnet-base-v2
OLLAMA_MODEL=llama2:13b
```
- Best quality
- Slower processing
- Higher resource usage

### **For Speed/Real-time:**
```env
WHISPER_MODEL_SIZE=tiny
EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2
OLLAMA_MODEL=phi:2.7b
```
- Very fast
- Lower quality
- Minimal resources

## 🔧 Service Management

### **Start All Services:**
```bash
cd python-whisper
./start_all_services.sh
```

### **Stop All Services:**
```bash
cd python-whisper
./stop_all_services.sh
```

### **Start Individual Services:**
```bash
# Whisper only
python whisper_server.py

# Embeddings only
python embedding_server.py

# Chat only
python chat_server.py
```

## 📊 Resource Usage

### **Minimum Requirements:**
- **RAM**: 4GB
- **Storage**: 5GB (for models)
- **CPU**: Any modern CPU

### **Recommended:**
- **RAM**: 8GB+
- **Storage**: 10GB+
- **GPU**: NVIDIA GPU with 4GB+ VRAM (optional, for speed)

### **Model Sizes:**
| Component | Model | Size | RAM Usage |
|-----------|-------|------|-----------|
| Whisper | tiny | 39MB | ~1GB |
| Whisper | base | 74MB | ~1GB |
| Whisper | large | 1.5GB | ~4GB |
| Embeddings | MiniLM-L6-v2 | 80MB | ~500MB |
| Chat | phi:2.7b | 1.6GB | ~3GB |
| Chat | llama2:7b | 3.8GB | ~8GB |

## 🚨 Troubleshooting

### **Common Issues:**

1. **"Ollama not running"**
   ```bash
   # Start Ollama
   ollama serve &
   
   # Check if running
   curl http://127.0.0.1:11434/api/tags
   ```

2. **"Model not found"**
   ```bash
   # Pull the model
   ollama pull llama2:7b
   
   # List available models
   ollama list
   ```

3. **"Port already in use"**
   ```bash
   # Find process using port
   lsof -i :5000
   
   # Kill process
   kill -9 PID
   ```

4. **"Out of memory"**
   - Use smaller models
   - Close other applications
   - Add swap space

5. **"Slow processing"**
   - Use GPU if available
   - Use smaller models
   - Process files in smaller batches

### **Performance Optimization:**

1. **Enable GPU (if available):**
   ```bash
   # Check CUDA availability
   python -c "import torch; print(torch.cuda.is_available())"
   
   # Install CUDA PyTorch
   pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```

2. **Optimize Ollama:**
   ```bash
   # Set memory limit
   export OLLAMA_MAX_LOADED_MODELS=1
   export OLLAMA_NUM_PARALLEL=1
   ```

## 💰 Cost Comparison

### **Local Setup (FREE!):**
- Transcription: FREE
- Embeddings: FREE  
- Chat: FREE
- Vector Storage: FREE (Pinecone free tier)
- **Total Monthly Cost: $0**

### **OpenAI API Setup:**
- Transcription: $0.006/minute
- Embeddings: $0.0001/1K tokens
- Chat: $0.002/1K tokens
- Vector Storage: FREE (Pinecone free tier)
- **Estimated Monthly Cost: $20-100+**

## 🎉 You're All Set!

Your AI Video Knowledge Extractor is now running completely locally and for FREE! 

### **What's Running:**
- ✅ NestJS API (Port 3000)
- ✅ Local Whisper (Port 5000)
- ✅ Local Embeddings (Port 5001)  
- ✅ Local Chat/Ollama (Port 5002)
- ✅ PostgreSQL Database
- ✅ Redis Queue
- ✅ Pinecone Vector DB

### **Next Steps:**
1. Upload your first video
2. Watch the magic happen locally
3. Query your video content
4. Enjoy unlimited, free AI processing!

For any issues, check the troubleshooting section or the individual service logs.
