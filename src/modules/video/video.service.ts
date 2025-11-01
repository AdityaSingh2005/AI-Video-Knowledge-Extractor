import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';

import { Video, VideoStatus } from '../../entities/video.entity';
import { JobQueue, JobType, JobStatus } from '../../entities/job-queue.entity';
import { TranscriptChunk } from '../../entities/transcript-chunk.entity';

import { AzureBlobService } from './services/azure-blob.service';
import { YoutubeService } from './services/youtube.service';
import { VideoUploadResponse } from './dto/upload-video.dto';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(JobQueue)
    private jobRepository: Repository<JobQueue>,
    @InjectQueue('video-processing')
    private videoQueue: Queue,
    private azureBlobService: AzureBlobService,
    private youtubeService: YoutubeService,
  ) {}

  async processFileUpload(file: Express.Multer.File, title?: string): Promise<VideoUploadResponse> {
    this.logger.log(`Processing file upload: ${file.originalname}`);

    // Create video record
    const video = this.videoRepository.create({
      title: title || file.originalname,
      original_filename: file.originalname,
      status: VideoStatus.UPLOADED,
    });

    const savedVideo = await this.videoRepository.save(video);

    // Upload file to Azure Blob Storage
    try {
      const blobUrl = await this.azureBlobService.uploadFile(file, savedVideo.id);
      savedVideo.blob_url = blobUrl;
      await this.videoRepository.save(savedVideo);

      // Create and queue transcription job
      const job = await this.createJob(savedVideo.id, JobType.TRANSCRIBE);
      await this.videoQueue.add('transcribe-audio', {
        videoId: savedVideo.id,
        jobId: job.id,
        blobUrl,
      });

      return {
        video_id: savedVideo.id,
        job_id: job.id,
        status: 'uploaded',
        message: 'File uploaded successfully, transcription queued',
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      savedVideo.status = VideoStatus.FAILED;
      savedVideo.error_message = error.message;
      await this.videoRepository.save(savedVideo);

      throw error;
    }
  }

  async processYoutubeUrl(youtubeUrl: string, title?: string): Promise<VideoUploadResponse> {
    this.logger.log(`🎬 Processing YouTube URL: ${youtubeUrl}`);
    this.logger.log(`📝 Custom title provided: ${title || 'None - will use video title'}`);

    try {
      // Extract video info
      this.logger.log(`🔍 Extracting video information...`);
      const videoInfo = await this.youtubeService.getVideoInfo(youtubeUrl);
      this.logger.log(`✅ Video info extracted: "${videoInfo.title}" (${videoInfo.duration}s)`);

      // Create video record
      this.logger.log(`💾 Creating video record in database...`);
      const video = this.videoRepository.create({
        title: title || videoInfo.title,
        source_url: youtubeUrl,
        status: VideoStatus.DOWNLOADING,
        duration_seconds: videoInfo.duration,
      });

      const savedVideo = await this.videoRepository.save(video);
      this.logger.log(`✅ Video record created with ID: ${savedVideo.id}`);

      // Create and queue download job
      this.logger.log(`📋 Creating download job...`);
      const downloadJob = await this.createJob(savedVideo.id, JobType.DOWNLOAD_AUDIO);
      this.logger.log(`✅ Download job created with ID: ${downloadJob.id}`);

      this.logger.log(`🚀 Adding job to processing queue...`);
      await this.videoQueue.add('download-youtube-audio', {
        videoId: savedVideo.id,
        jobId: downloadJob.id,
        youtubeUrl,
      });
      this.logger.log(`✅ Job added to queue successfully`);

      const response = {
        video_id: savedVideo.id,
        job_id: downloadJob.id,
        status: 'downloading',
        message: 'YouTube video queued for download and processing',
      };

      this.logger.log(`🎉 YouTube processing initiated successfully:`, response);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to process YouTube URL: ${error.message}`);
      this.logger.error(`Error details:`, error);
      throw error;
    }
  }

  async getVideoWithJobs(videoId: string): Promise<Video | null> {
    return this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['jobs'],
      order: {
        jobs: {
          created_at: 'ASC',
        },
      },
    });
  }

  async getVideoTranscript(videoId: string) {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['chunks'],
    });

    if (!video) {
      return null;
    }

    return {
      video_id: video.id,
      title: video.title,
      status: video.status,
      chunks: video.chunks?.map(chunk => ({
        id: chunk.id,
        text: chunk.text,
        start_time: chunk.start_time,
        end_time: chunk.end_time,
        chunk_index: chunk.chunk_index,
      })) || [],
    };
  }

  async updateVideoStatus(videoId: string, status: VideoStatus, errorMessage?: string): Promise<void> {
    await this.videoRepository.update(videoId, {
      status,
      error_message: errorMessage,
    });
  }

  async updateVideoWithBlobUrl(videoId: string, blobUrl: string): Promise<void> {
    this.logger.log(`💾 Updating video blob URL: ID=${videoId}, URL=${blobUrl}`);
    await this.videoRepository.update(videoId, { blob_url: blobUrl });
  }

  async createJob(videoId: string, jobType: JobType, metadata?: any): Promise<JobQueue> {
    this.logger.log(`📋 Creating job: type=${jobType}, videoId=${videoId}`);
    
    const job = this.jobRepository.create({
      video_id: videoId,
      job_type: jobType,
      status: JobStatus.PENDING,
      metadata,
    });

    const savedJob = await this.jobRepository.save(job);
    this.logger.log(`✅ Job created successfully: ID=${savedJob.id}`);
    return savedJob;
  }

  async updateJobProgress(jobId: string, progress: number, status?: JobStatus, errorMessage?: string): Promise<void> {
    this.logger.log(`📊 Updating job progress: ID=${jobId}, progress=${progress}%, status=${status || 'unchanged'}`);
    
    const updateData: any = { progress };
    
    if (status) updateData.status = status;
    if (errorMessage) {
      updateData.error_message = errorMessage;
      this.logger.error(`❌ Job error: ${errorMessage}`);
    }

    await this.jobRepository.update(jobId, updateData);
    this.logger.log(`✅ Job progress updated successfully`);
  }
}
