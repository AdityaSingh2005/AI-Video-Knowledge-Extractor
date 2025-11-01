# Architecture Overview

## System Components

### Core Modules

1. **Video Module** (`src/modules/video/`)
   - Handles file uploads and YouTube URL processing
   - Manages video metadata and processing status
   - Integrates with Azure Blob Storage for file storage
   - Triggers background processing jobs

2. **Transcription Module** (`src/modules/transcription/`)
   - Processes audio files using OpenAI Whisper API
   - Converts audio to text with timestamps
   - Saves transcript segments to PostgreSQL
   - Supports both OpenAI API and local Whisper.cpp (placeholder)

3. **Chunking Module** (`src/modules/chunking/`)
   - Splits transcripts into semantic chunks
   - Implements overlapping chunking strategy
   - Optimizes chunks for embedding generation
   - Maintains temporal relationships between chunks

4. **Embedding Module** (`src/modules/embedding/`)
   - Generates vector embeddings using OpenAI API
   - Stores vectors in Pinecone vector database
   - Manages embedding metadata in PostgreSQL
   - Supports batch processing for efficiency

5. **Retrieval Module** (`src/modules/retrieval/`)
   - Handles semantic search queries
   - Retrieves relevant chunks using vector similarity
   - Generates AI responses using GPT models
   - Provides context-aware answers with timestamps

6. **Health Module** (`src/modules/health/`)
   - Monitors system health and dependencies
   - Checks database, Redis, and API connections
   - Provides status endpoint for monitoring

### Data Flow

```
┌─────────────────┐
│   File Upload   │
│   YouTube URL   │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│  Azure Blob     │
│  Storage        │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐    ┌─────────────────┐
│  BullMQ Queue   │───▶│  Transcription  │
│  (Redis)        │    │  (Whisper API)  │
└─────────────────┘    └─────────┬───────┘
                                 │
                                 ▼
                       ┌─────────────────┐
                       │    Chunking     │
                       │   (Semantic)    │
                       └─────────┬───────┘
                                 │
                                 ▼
                       ┌─────────────────┐
                       │   Embeddings    │
                       │  (OpenAI API)   │
                       └─────────┬───────┘
                                 │
                                 ▼
┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │◀───│    Pinecone     │
│   (Metadata)    │    │   (Vectors)     │
└─────────────────┘    └─────────┬───────┘
                                 │
                                 ▼
                       ┌─────────────────┐
                       │   Query API     │
                       │   (GPT Chat)    │
                       └─────────────────┘
```

### Database Schema

#### PostgreSQL Tables

1. **videos**
   - `id` (UUID, Primary Key)
   - `title` (String)
   - `source_url` (String, nullable)
   - `blob_url` (String, nullable)
   - `status` (Enum: uploaded, downloading, transcribing, chunking, embedding, complete, failed)
   - `created_at`, `updated_at` (Timestamps)

2. **transcript_chunks**
   - `id` (UUID, Primary Key)
   - `video_id` (UUID, Foreign Key)
   - `text` (Text)
   - `start_time`, `end_time` (Float)
   - `chunk_index` (Integer)
   - `token_count` (Integer)

3. **embedding_meta**
   - `id` (UUID, Primary Key)
   - `chunk_id` (UUID, Foreign Key)
   - `vector_id` (String, Pinecone reference)
   - `embedding_model` (String)
   - `embedding_dimensions` (Integer)

4. **job_queue**
   - `id` (UUID, Primary Key)
   - `video_id` (UUID, Foreign Key)
   - `job_type` (Enum: download_audio, transcribe, chunk_transcript, embed_chunks)
   - `status` (Enum: pending, processing, completed, failed)
   - `progress` (Integer, 0-100)
   - `error_message` (Text, nullable)

#### Pinecone Index

- **Dimensions**: 1536 (OpenAI ada-002 embeddings)
- **Metric**: Cosine similarity
- **Metadata**: video_id, chunk_index, text, timestamps, token_count

### Background Processing

#### Job Queue (BullMQ + Redis)

1. **download-youtube-audio**
   - Downloads audio from YouTube URLs
   - Uploads to Azure Blob Storage
   - Triggers transcription job

2. **transcribe-audio**
   - Processes audio files with Whisper
   - Saves transcript segments
   - Triggers chunking process

3. **chunk-transcript**
   - Splits transcript into semantic chunks
   - Optimizes for embedding generation
   - Triggers embedding process

4. **embed-chunks**
   - Generates vector embeddings
   - Stores in Pinecone and PostgreSQL
   - Completes processing pipeline

### Event-Driven Architecture

The system uses NestJS EventEmitter for loose coupling:

- `audio.downloaded` → Triggers transcription
- `transcription.completed` → Triggers chunking
- `chunking.completed` → Triggers embedding
- `embedding.completed` → Marks video as complete

### API Endpoints

#### Video Processing
- `POST /api/video/upload` - Upload video or YouTube URL
- `GET /api/video/status/:id` - Check processing status
- `GET /api/video/transcript/:id` - Get transcript

#### Querying
- `POST /api/query` - Query video content with AI

#### System
- `GET /api/health` - System health check

### Configuration

#### Environment Variables

**Database & Cache**
- `DATABASE_*` - PostgreSQL connection
- `REDIS_*` - Redis connection for BullMQ

**External Services**
- `OPENAI_API_KEY` - OpenAI API access
- `PINECONE_*` - Pinecone vector database
- `AZURE_STORAGE_*` - Azure Blob Storage

**Processing Settings**
- `CHUNK_SIZE` - Target tokens per chunk (default: 500)
- `CHUNK_OVERLAP` - Overlap between chunks (default: 50)
- `EMBEDDING_MODEL` - OpenAI embedding model
- `CHAT_MODEL` - GPT model for responses

### Scalability Considerations

#### Horizontal Scaling
- Stateless application design
- Queue-based background processing
- External storage (Azure Blob, Pinecone)

#### Performance Optimizations
- Batch embedding generation
- Chunked file processing
- Connection pooling
- Redis caching

#### Monitoring
- Health check endpoints
- Job progress tracking
- Error logging and alerting
- Performance metrics

### Security

#### API Security
- Input validation with class-validator
- File type restrictions
- Size limits on uploads

#### Data Protection
- Secure API key management
- Encrypted storage connections
- No sensitive data in logs

### Deployment

#### Development
- Local PostgreSQL and Redis
- Environment-based configuration
- Hot reload with NestJS

#### Production
- Docker containerization
- Docker Compose for local development
- Health checks and restart policies
- Persistent volume storage

#### Cloud Deployment
- Container orchestration (Kubernetes)
- Managed databases (Azure PostgreSQL, Redis)
- Load balancing
- Auto-scaling based on queue depth
