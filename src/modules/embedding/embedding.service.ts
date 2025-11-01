import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Video, VideoStatus } from '../../entities/video.entity';
import { TranscriptChunk } from '../../entities/transcript-chunk.entity';
import { EmbeddingMeta } from '../../entities/embedding-meta.entity';
import { JobQueue, JobType, JobStatus } from '../../entities/job-queue.entity';

import { PineconeService } from './services/pinecone.service';
import { OpenAIEmbeddingService } from './services/openai-embedding.service';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly embeddingModel: string;

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(TranscriptChunk)
    private chunkRepository: Repository<TranscriptChunk>,
    @InjectRepository(EmbeddingMeta)
    private embeddingRepository: Repository<EmbeddingMeta>,
    @InjectRepository(JobQueue)
    private jobRepository: Repository<JobQueue>,
    private configService: ConfigService,
    private pineconeService: PineconeService,
    private openaiEmbeddingService: OpenAIEmbeddingService,
    private eventEmitter: EventEmitter2,
  ) {
    this.embeddingModel = this.configService.get('EMBEDDING_MODEL', 'text-embedding-ada-002');
  }

  async processEmbeddings(videoId: string): Promise<void> {
    this.logger.log(`Starting embedding process for video ${videoId}`);

    try {
      // Create embedding job
      const job = await this.createEmbeddingJob(videoId);
      await this.updateJobProgress(job.id, 10, JobStatus.PROCESSING);

      // Get chunks to embed
      const chunks = await this.chunkRepository.find({
        where: { video_id: videoId },
        order: { chunk_index: 'ASC' },
      });

      if (chunks.length === 0) {
        throw new Error('No chunks found for embedding');
      }

      await this.updateJobProgress(job.id, 20);

      // Process embeddings in batches
      const batchSize = 10;
      const totalBatches = Math.ceil(chunks.length / batchSize);
      
      for (let i = 0; i < totalBatches; i++) {
        const batch = chunks.slice(i * batchSize, (i + 1) * batchSize);
        await this.processBatch(batch, videoId);
        
        const progress = 20 + Math.round((i + 1) / totalBatches * 70);
        await this.updateJobProgress(job.id, progress);
      }

      // Update video status
      await this.videoRepository.update(videoId, {
        status: VideoStatus.COMPLETE,
      });

      // Complete job
      await this.updateJobProgress(job.id, 100, JobStatus.COMPLETED);

      this.logger.log(`Embedding completed for video ${videoId} with ${chunks.length} chunks`);
    } catch (error) {
      this.logger.error(`Embedding failed for video ${videoId}: ${error.message}`);
      
      const job = await this.getActiveEmbeddingJob(videoId);
      if (job) {
        await this.updateJobProgress(job.id, 0, JobStatus.FAILED, error.message);
      }
      
      await this.videoRepository.update(videoId, {
        status: VideoStatus.FAILED,
        error_message: error.message,
      });
      
      throw error;
    }
  }

  private async processBatch(chunks: TranscriptChunk[], videoId: string): Promise<void> {
    const texts = chunks.map(chunk => chunk.text);
    
    // Generate embeddings
    const embeddings = await this.openaiEmbeddingService.generateEmbeddings(texts);
    
    // Store in Pinecone
    const vectors = chunks.map((chunk, index) => ({
      id: chunk.id,
      values: embeddings[index],
      metadata: {
        video_id: videoId,
        chunk_index: chunk.chunk_index,
        text: chunk.text,
        start_time: chunk.start_time,
        end_time: chunk.end_time,
        token_count: chunk.token_count,
      },
    }));

    await this.pineconeService.upsertVectors(vectors);

    // Save embedding metadata
    const embeddingMetas = chunks.map((chunk, index) => 
      this.embeddingRepository.create({
        chunk_id: chunk.id,
        vector_id: chunk.id, // Using chunk ID as vector ID
        embedding_model: this.embeddingModel,
        embedding_dimensions: embeddings[index].length,
      })
    );

    await this.embeddingRepository.save(embeddingMetas);
  }

  async searchSimilarChunks(query: string, videoId?: string, topK: number = 5): Promise<any[]> {
    // Generate embedding for query
    const queryEmbedding = await this.openaiEmbeddingService.generateEmbedding(query);
    
    // Search in Pinecone
    const filter = videoId ? { video_id: videoId } : undefined;
    const results = await this.pineconeService.query(queryEmbedding, topK, filter);
    
    return results.matches || [];
  }

  private async createEmbeddingJob(videoId: string): Promise<JobQueue> {
    const job = this.jobRepository.create({
      video_id: videoId,
      job_type: JobType.EMBED_CHUNKS,
      status: JobStatus.PENDING,
    });

    return this.jobRepository.save(job);
  }

  private async getActiveEmbeddingJob(videoId: string): Promise<JobQueue | null> {
    return this.jobRepository.findOne({
      where: {
        video_id: videoId,
        job_type: JobType.EMBED_CHUNKS,
        status: JobStatus.PROCESSING,
      },
    });
  }

  private async updateJobProgress(jobId: string, progress: number, status?: JobStatus, errorMessage?: string): Promise<void> {
    const updateData: any = { progress };
    
    if (status) updateData.status = status;
    if (errorMessage) updateData.error_message = errorMessage;

    await this.jobRepository.update(jobId, updateData);
  }
}
