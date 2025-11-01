# 🎙️ Local Whisper Setup Guide

This guide will help you set up OpenAI Whisper locally to run transcription without using the OpenAI API, saving costs and providing more control.

## 📋 Prerequisites

- Python 3.8+ installed
- FFmpeg installed
- At least 4GB RAM (8GB+ recommended for larger models)
- Optional: NVIDIA GPU with CUDA for faster processing

## 🚀 Quick Setup

### 1. **Install FFmpeg** (Required)

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg
```

**Windows:**
Download from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)

### 2. **Set up Python Environment**

```bash
cd python-whisper
./setup.sh
```

This will:
- Create a Python virtual environment
- Install all required dependencies
- Download the Whisper model on first use

### 3. **Start Whisper Server**

```bash
cd python-whisper
./start_whisper.sh
```

The server will start on `http://127.0.0.1:5000`

### 4. **Configure NestJS App**

Update your `.env` file:
```env
WHISPER_MODE=local
LOCAL_WHISPER_URL=http://127.0.0.1:5000
WHISPER_MODEL_SIZE=base
```

## 🎛️ Configuration Options

### **Whisper Model Sizes**

| Model  | Size    | VRAM   | Speed | Quality |
|--------|---------|--------|-------|---------|
| tiny   | ~39 MB  | ~1 GB  | ~32x  | Lower   |
| base   | ~74 MB  | ~1 GB  | ~16x  | Good    |
| small  | ~244 MB | ~2 GB  | ~6x   | Better  |
| medium | ~769 MB | ~5 GB  | ~2x   | Great   |
| large  | ~1550 MB| ~10 GB | ~1x   | Best    |

### **Environment Variables**

```bash
# Model size (tiny, base, small, medium, large)
export WHISPER_MODEL_SIZE=base

# Server configuration
export WHISPER_HOST=127.0.0.1
export WHISPER_PORT=5000

# For NestJS integration
export WHISPER_MODE=local
export LOCAL_WHISPER_URL=http://127.0.0.1:5000
```

## 🔧 Manual Setup (Alternative)

If the automatic setup doesn't work:

### 1. **Create Virtual Environment**
```bash
cd python-whisper
python3 -m venv whisper_env
source whisper_env/bin/activate  # On Windows: whisper_env\Scripts\activate
```

### 2. **Install Dependencies**
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. **Start Server**
```bash
python whisper_server.py
```

## 🐳 Docker Setup

### **Using Docker Compose** (Recommended)

```bash
# Start all services including Whisper
docker-compose up -d

# Check Whisper service logs
docker-compose logs whisper
```

### **Standalone Docker**

```bash
cd python-whisper

# Build image
docker build -t whisper-server .

# Run container
docker run -p 5000:5000 -e WHISPER_MODEL_SIZE=base whisper-server
```

## 🧪 Testing the Setup

### **Test Whisper Server**

```bash
# Health check
curl http://127.0.0.1:5000/health

# List available models
curl http://127.0.0.1:5000/models

# Test transcription with a URL
curl -X POST http://127.0.0.1:5000/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audio_url": "https://example.com/audio.mp3"}'
```

### **Test NestJS Integration**

1. Start both servers:
   ```bash
   # Terminal 1: Start Whisper
   cd python-whisper && ./start_whisper.sh
   
   # Terminal 2: Start NestJS
   npm run start:dev
   ```

2. Upload a video through the API:
   ```bash
   curl -X POST http://localhost:3000/api/video/upload \
     -F "file=@test-video.mp4"
   ```

## 🚨 Troubleshooting

### **Common Issues**

1. **"FFmpeg not found"**
   - Install FFmpeg using the instructions above
   - Ensure it's in your system PATH

2. **"CUDA out of memory"**
   - Use a smaller model size (tiny or base)
   - Set `CUDA_VISIBLE_DEVICES=""` to force CPU usage

3. **"Module not found" errors**
   - Ensure virtual environment is activated
   - Reinstall requirements: `pip install -r requirements.txt`

4. **Slow transcription**
   - Use GPU if available
   - Use smaller model for faster processing
   - Consider using `tiny` model for real-time applications

5. **Server not starting**
   - Check if port 5000 is already in use: `lsof -i :5000`
   - Change port: `export WHISPER_PORT=5001`

### **Performance Optimization**

1. **GPU Acceleration**
   ```bash
   # Check if CUDA is available
   python -c "import torch; print(torch.cuda.is_available())"
   
   # Install CUDA-enabled PyTorch if needed
   pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```

2. **Model Caching**
   - Models are cached in `~/.cache/whisper/`
   - First run downloads the model (can take time)
   - Subsequent runs are faster

3. **Memory Management**
   - Monitor memory usage: `htop` or `nvidia-smi`
   - Use smaller models if memory is limited
   - Process files in batches for large volumes

## 📊 Performance Comparison

### **Local vs OpenAI API**

| Aspect           | Local Whisper | OpenAI API |
|------------------|---------------|------------|
| **Cost**         | Free          | $0.006/min |
| **Privacy**      | Complete      | Shared     |
| **Speed**        | Depends on HW | Fast       |
| **Quality**      | Same models   | Same       |
| **Reliability**  | Local control | High       |
| **Setup**        | Required      | None       |

### **Recommended Configurations**

**Development:**
- Model: `base` or `small`
- Good balance of speed and quality

**Production (High Volume):**
- Model: `tiny` for speed, `base` for quality
- Use GPU acceleration
- Consider multiple instances

**Production (High Quality):**
- Model: `large`
- GPU required
- More processing time

## 🔄 Switching Between Local and API

You can easily switch between local Whisper and OpenAI API:

```bash
# Use local Whisper
export WHISPER_MODE=local

# Use OpenAI API
export WHISPER_MODE=openai
```

No code changes required - the system automatically detects the mode!

## 📝 API Reference

### **Whisper Server Endpoints**

#### **GET /health**
Returns server health status and configuration.

#### **GET /models**
Lists available Whisper models and current configuration.

#### **POST /transcribe**
Transcribes audio from URL or uploaded file.

**Request (URL):**
```json
{
  "audio_url": "https://example.com/audio.mp3"
}
```

**Request (File Upload):**
```bash
curl -X POST http://127.0.0.1:5000/transcribe \
  -F "audio_file=@audio.mp3"
```

**Response:**
```json
{
  "success": true,
  "result": {
    "text": "Full transcription text...",
    "language": "en",
    "segments": [
      {
        "text": "Segment text...",
        "start": 0.0,
        "end": 5.2
      }
    ]
  }
}
```

## 🎯 Next Steps

1. **Start with `base` model** for good quality/speed balance
2. **Monitor performance** and adjust model size as needed
3. **Set up monitoring** for production deployments
4. **Consider GPU acceleration** for high-volume processing
5. **Implement caching** for frequently processed content

For production deployments, consider:
- Load balancing multiple Whisper instances
- Implementing request queuing
- Adding authentication and rate limiting
- Monitoring and alerting setup
