import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Video, VideoStatus } from '../../entities/video.entity';
import { TranscriptChunk } from '../../entities/transcript-chunk.entity';
import { JobQueue, JobType, JobStatus } from '../../entities/job-queue.entity';

export interface ChunkData {
  text: string;
  start_time: number;
  end_time: number;
  chunk_index: number;
  token_count: number;
}

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(TranscriptChunk)
    private chunkRepository: Repository<TranscriptChunk>,
    @InjectRepository(JobQueue)
    private jobRepository: Repository<JobQueue>,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.chunkSize = parseInt(this.configService.get('CHUNK_SIZE', '500'));
    this.chunkOverlap = parseInt(this.configService.get('CHUNK_OVERLAP', '50'));
  }

  async processTranscriptChunking(videoId: string): Promise<void> {
    this.logger.log(`Starting chunking process for video ${videoId}`);

    try {
      // Create chunking job
      const job = await this.createChunkingJob(videoId);
      await this.updateJobProgress(job.id, 10, JobStatus.PROCESSING);

      // Get existing transcript segments
      const segments = await this.chunkRepository.find({
        where: { video_id: videoId },
        order: { chunk_index: 'ASC' },
      });

      if (segments.length === 0) {
        throw new Error('No transcript segments found for chunking');
      }

      await this.updateJobProgress(job.id, 30);

      // Clear existing chunks (we'll recreate them with proper chunking)
      await this.chunkRepository.delete({ video_id: videoId });
      await this.updateJobProgress(job.id, 40);

      // Create semantic chunks
      const chunks = await this.createSemanticChunks(segments, videoId);
      await this.updateJobProgress(job.id, 80);

      // Save new chunks
      await this.chunkRepository.save(chunks);
      await this.updateJobProgress(job.id, 95);

      // Update video status
      await this.videoRepository.update(videoId, {
        status: VideoStatus.EMBEDDING,
      });

      // Complete job
      await this.updateJobProgress(job.id, 100, JobStatus.COMPLETED);

      // Emit event to trigger embedding
      this.eventEmitter.emit('chunking.completed', {
        videoId,
        chunkCount: chunks.length,
      });

      this.logger.log(`Chunking completed for video ${videoId} with ${chunks.length} chunks`);
    } catch (error) {
      this.logger.error(`Chunking failed for video ${videoId}: ${error.message}`);
      
      const job = await this.getActiveChunkingJob(videoId);
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

  private async createSemanticChunks(segments: TranscriptChunk[], videoId: string): Promise<TranscriptChunk[]> {
    const chunks: ChunkData[] = [];
    let currentChunk = '';
    let currentTokenCount = 0;
    let chunkStartTime = 0;
    let chunkEndTime = 0;
    let chunkIndex = 0;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentTokenCount = this.estimateTokenCount(segment.text);

      // If adding this segment would exceed chunk size, finalize current chunk
      if (currentTokenCount + segmentTokenCount > this.chunkSize && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          start_time: chunkStartTime,
          end_time: chunkEndTime,
          chunk_index: chunkIndex,
          token_count: currentTokenCount,
        });

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, this.chunkOverlap);
        currentChunk = overlapText + ' ' + segment.text;
        currentTokenCount = this.estimateTokenCount(overlapText) + segmentTokenCount;
        chunkStartTime = segment.start_time || 0;
        chunkEndTime = segment.end_time || 0;
        chunkIndex++;
      } else {
        // Add segment to current chunk
        if (currentChunk.length === 0) {
          chunkStartTime = segment.start_time || 0;
        }
        
        currentChunk += (currentChunk.length > 0 ? ' ' : '') + segment.text;
        currentTokenCount += segmentTokenCount;
        chunkEndTime = segment.end_time || 0;
      }
    }

    // Add final chunk if it has content
    if (currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        start_time: chunkStartTime,
        end_time: chunkEndTime,
        chunk_index: chunkIndex,
        token_count: currentTokenCount,
      });
    }

    // Convert to entities
    return chunks.map(chunk => 
      this.chunkRepository.create({
        video_id: videoId,
        text: chunk.text,
        start_time: chunk.start_time,
        end_time: chunk.end_time,
        chunk_index: chunk.chunk_index,
        token_count: chunk.token_count,
      })
    );
  }

  private getOverlapText(text: string, overlapTokens: number): string {
    const words = text.split(' ');
    const overlapWords = Math.min(overlapTokens, words.length);
    return words.slice(-overlapWords).join(' ');
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  private async createChunkingJob(videoId: string): Promise<JobQueue> {
    const job = this.jobRepository.create({
      video_id: videoId,
      job_type: JobType.CHUNK_TRANSCRIPT,
      status: JobStatus.PENDING,
    });

    return this.jobRepository.save(job);
  }

  private async getActiveChunkingJob(videoId: string): Promise<JobQueue | null> {
    return this.jobRepository.findOne({
      where: {
        video_id: videoId,
        job_type: JobType.CHUNK_TRANSCRIPT,
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
