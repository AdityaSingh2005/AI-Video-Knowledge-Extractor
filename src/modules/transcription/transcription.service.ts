import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Video, VideoStatus } from '../../entities/video.entity';
import { TranscriptChunk } from '../../entities/transcript-chunk.entity';
import { JobQueue, JobStatus, JobType } from '../../entities/job-queue.entity';

import { WhisperService } from './services/whisper.service';

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
}

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(TranscriptChunk)
    private chunkRepository: Repository<TranscriptChunk>,
    @InjectRepository(JobQueue)
    private jobRepository: Repository<JobQueue>,
    private whisperService: WhisperService,
    private eventEmitter: EventEmitter2,
  ) {}

  async processTranscription(videoId: string, blobUrl: string): Promise<void> {
    this.logger.log(`🎤 [TRANSCRIPTION] Starting transcription process for video ${videoId}`);
    this.logger.log(`📋 Audio URL: ${blobUrl}`);

    try {
      // Create transcription job
      this.logger.log(`📋 Creating transcription job...`);
      const transcriptionJob = await this.createTranscriptionJob(videoId);
      this.logger.log(`✅ Transcription job created with ID: ${transcriptionJob.id}`);

      // Start transcription
      await this.transcribeAudio(videoId, transcriptionJob.id, blobUrl);
    } catch (error) {
      this.logger.error(`❌ Transcription process failed for video ${videoId}: ${error.message}`);
      this.logger.error(`Error stack:`, error.stack);
      
      // Update video status to failed
      await this.videoRepository.update(videoId, {
        status: VideoStatus.FAILED,
        error_message: error.message,
      });
      
      throw error;
    }
  }

  private async createTranscriptionJob(videoId: string): Promise<JobQueue> {
    this.logger.log(`📋 Creating job: type=transcribe, videoId=${videoId}`);
    
    const job = this.jobRepository.create({
      video_id: videoId,
      job_type: JobType.TRANSCRIBE,
      status: JobStatus.PENDING,
    });

    const savedJob = await this.jobRepository.save(job);
    this.logger.log(`✅ Job created successfully with ID: ${savedJob.id}`);
    
    return savedJob;
  }

  async transcribeAudio(videoId: string, jobId: string, audioUrl: string): Promise<void> {
    this.logger.log(`Starting transcription for video ${videoId}`);

    try {
      // Update job progress
      await this.updateJobProgress(jobId, 20, JobStatus.PROCESSING);

      // Perform transcription
      const segments = await this.whisperService.transcribe(audioUrl);
      await this.updateJobProgress(jobId, 80);

      // Save transcript segments to database
      await this.saveTranscriptSegments(videoId, segments);
      await this.updateJobProgress(jobId, 95);

      // Update video status
      await this.videoRepository.update(videoId, {
        status: VideoStatus.CHUNKING,
      });

      // Complete job
      await this.updateJobProgress(jobId, 100, JobStatus.COMPLETED);

      // Emit event to trigger chunking
      this.eventEmitter.emit('transcription.completed', {
        videoId,
        segmentCount: segments.length,
      });

      this.logger.log(`Transcription completed for video ${videoId} with ${segments.length} segments`);
    } catch (error) {
      this.logger.error(`Transcription failed for video ${videoId}: ${error.message}`);
      
      await this.updateJobProgress(jobId, 0, JobStatus.FAILED, error.message);
      await this.videoRepository.update(videoId, {
        status: VideoStatus.FAILED,
        error_message: error.message,
      });
      
      throw error;
    }
  }

  private async saveTranscriptSegments(videoId: string, segments: TranscriptionSegment[]): Promise<void> {
    const chunks = segments.map((segment, index) => {
      return this.chunkRepository.create({
        video_id: videoId,
        text: segment.text.trim(),
        start_time: segment.start,
        end_time: segment.end,
        chunk_index: index,
        token_count: this.estimateTokenCount(segment.text),
      });
    });

    await this.chunkRepository.save(chunks);
    this.logger.log(`Saved ${chunks.length} transcript segments for video ${videoId}`);
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  private async updateJobProgress(jobId: string, progress: number, status?: JobStatus, errorMessage?: string): Promise<void> {
    const updateData: any = { progress };
    
    if (status) updateData.status = status;
    if (errorMessage) updateData.error_message = errorMessage;

    await this.jobRepository.update(jobId, updateData);
  }

  async getTranscriptByVideoId(videoId: string): Promise<TranscriptChunk[]> {
    return this.chunkRepository.find({
      where: { video_id: videoId },
      order: { chunk_index: 'ASC' },
    });
  }
}
