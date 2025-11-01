# AI Video Knowledge Extractor

A monolithic NestJS application that extracts knowledge from videos through automated transcription, semantic chunking, and AI-powered querying.

## 🚀 Features

- **Video Processing**: Upload files or provide YouTube URLs
- **Audio Extraction**: Automatic audio extraction from video files
- **Transcription**: AI-powered transcription using OpenAI Whisper
- **Semantic Chunking**: Intelligent text segmentation for better context
- **Vector Embeddings**: Generate embeddings for semantic search
- **AI Chat**: Query video content using natural language
- **Background Processing**: Asynchronous job processing with BullMQ

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Video Upload  │───▶│  Transcription  │───▶│    Chunking     │
│   (File/YouTube)│    │   (Whisper AI)  │    │   (Semantic)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Chat/Query │◀───│   Vector Search │◀───│   Embeddings    │
│     (GPT)       │    │   (Pinecone)    │    │   (OpenAI)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL (metadata), Pinecone (vectors)
- **Queue**: BullMQ with Redis
- **Storage**: Azure Blob Storage
- **AI Services**: OpenAI (Whisper, Embeddings, GPT)
- **Video Processing**: ytdl-core, FFmpeg

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- OpenAI API Key
- Pinecone Account
- Azure Blob Storage Account

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd AI-Video-Knowledge-Extractor
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp env.example .env
```

Configure your `.env` file with the following:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=ai_video_extractor

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=your_azure_connection_string
AZURE_STORAGE_CONTAINER_NAME=video-files

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=video-embeddings

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Application Configuration
PORT=3000
NODE_ENV=development
```

### 3. Database Setup

Create PostgreSQL database:

```sql
CREATE DATABASE ai_video_extractor;
```

The application will automatically create tables on first run (development mode).

### 4. Pinecone Setup

1. Create a Pinecone account at [pinecone.io](https://pinecone.io)
2. Create an index with:
   - **Dimensions**: 1536 (for OpenAI ada-002 embeddings)
   - **Metric**: Cosine
   - **Name**: video-embeddings (or your chosen name)

### 5. Azure Blob Storage Setup

1. Create an Azure Storage Account
2. Create a container named `video-files`
3. Get your connection string from Azure Portal

### 6. Start the Complete Application

**🚀 One Command to Rule Them All:**
```bash
./start-project.sh
```

This single command will:
- ✅ Check all prerequisites
- ✅ Set up Python environment
- ✅ Start Ollama and pull models
- ✅ Start all AI services (Whisper, Embeddings, Chat)
- ✅ Build and start the NestJS application
- ✅ Run health checks on all services

**🛑 To Stop Everything:**
```bash
./stop-project.sh
```

**🧪 To Test Everything:**
```bash
./test-project.sh
```

The API will be available at `http://localhost:3000`

## 📚 API Endpoints

### Upload Video

**POST** `/api/video/upload`

Upload a video file or provide YouTube URL:

```bash
# File upload
curl -X POST http://localhost:3000/api/video/upload \
  -F "file=@video.mp4" \
  -F "title=My Video"

# YouTube URL
curl -X POST http://localhost:3000/api/video/upload \
  -H "Content-Type: application/json" \
  -d '{"youtube_url": "https://youtube.com/watch?v=...", "title": "YouTube Video"}'
```

### Check Processing Status

**GET** `/api/video/status/:videoId`

```bash
curl http://localhost:3000/api/video/status/video-uuid
```

### Get Transcript

**GET** `/api/video/transcript/:videoId`

```bash
curl http://localhost:3000/api/video/transcript/video-uuid
```

### Query Video Content

**POST** `/api/query`

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the main topic discussed?",
    "video_id": "video-uuid",
    "max_chunks": 5
  }'
```

### Health Check

**GET** `/api/health`

```bash
curl http://localhost:3000/api/health
```

## 🔄 Processing Pipeline

1. **Upload**: Video file or YouTube URL received
2. **Download**: YouTube videos downloaded as audio
3. **Storage**: Files uploaded to Azure Blob Storage
4. **Transcription**: Audio transcribed using OpenAI Whisper
5. **Chunking**: Transcript split into semantic chunks
6. **Embedding**: Chunks converted to vector embeddings
7. **Storage**: Vectors stored in Pinecone, metadata in PostgreSQL
8. **Ready**: Video available for querying

## 🔧 Configuration Options

### Chunking Settings

```env
CHUNK_SIZE=500          # Target tokens per chunk
CHUNK_OVERLAP=50        # Overlap tokens between chunks
```

### Embedding Settings

```env
EMBEDDING_MODEL=text-embedding-ada-002
EMBEDDING_DIMENSIONS=1536
```

### Chat Settings

```env
CHAT_MODEL=gpt-3.5-turbo
MAX_CONTEXT_CHUNKS=5
```

### File Upload Settings

```env
MAX_FILE_SIZE=500MB
ALLOWED_FILE_TYPES=mp4,avi,mov,mkv,webm,mp3,wav,m4a
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify PostgreSQL is running
   - Check connection credentials in `.env`

2. **Redis Connection Failed**
   - Ensure Redis server is running
   - Verify Redis host/port configuration

3. **OpenAI API Errors**
   - Check API key validity
   - Verify sufficient API credits

4. **Pinecone Connection Issues**
   - Confirm API key and index name
   - Ensure index dimensions match (1536)

5. **Azure Blob Upload Fails**
   - Verify connection string format
   - Check container exists and permissions

### Logs

Check application logs for detailed error information:

```bash
# Development
npm run start:dev

# Production logs
pm2 logs ai-video-extractor
```

## 🚀 Production Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

### Environment Variables

Ensure all production environment variables are set:

- Database connection with connection pooling
- Redis cluster configuration
- Production API keys
- Proper logging configuration

### Scaling Considerations

- Use Redis Cluster for high availability
- Consider read replicas for PostgreSQL
- Implement rate limiting for API endpoints
- Use CDN for static assets
- Monitor queue processing performance

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:

1. Check the troubleshooting section
2. Review application logs
3. Create an issue on GitHub