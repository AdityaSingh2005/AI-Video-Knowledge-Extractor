import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs';

import { VideoService } from '../video.service';
import { YoutubeService } from '../services/youtube.service';
import { AzureBlobService } from '../services/azure-blob.service';
import { VideoStatus } from '../../../entities/video.entity';
import { JobStatus } from '../../../entities/job-queue.entity';

@Processor('video-processing')
export class VideoProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoProcessingProcessor.name);

  constructor(
    private videoService: VideoService,
    private youtubeService: YoutubeService,
    private azureBlobService: AzureBlobService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'download-youtube-audio':
        return this.handleYouTubeDownload(job);
      case 'transcribe-audio':
        return this.handleTranscription(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async handleYouTubeDownload(job: Job) {
    const { videoId, jobId, youtubeUrl } = job.data;
    
    this.logger.log(`🎬 [STEP 1/6] Processing YouTube download for video ${videoId}`);
    this.logger.log(`📋 Job details: ID=${jobId}, URL=${youtubeUrl}`);

    try {
      // Update job status
      this.logger.log(`🔄 [STEP 2/6] Updating job status to PROCESSING...`);
      await this.videoService.updateJobProgress(jobId, 10, JobStatus.PROCESSING);
      await this.videoService.updateVideoStatus(videoId, VideoStatus.DOWNLOADING);
      this.logger.log(`✅ Job status updated successfully`);

      // Download audio from YouTube
      this.logger.log(`🎵 [STEP 3/6] Starting YouTube audio download...`);
      const audioFilePath = await this.youtubeService.downloadAudio(youtubeUrl);
      this.logger.log(`✅ Audio download completed: ${audioFilePath}`);
      
      await this.videoService.updateJobProgress(jobId, 50);
      this.logger.log(`📊 Progress updated to 50%`);

      // Upload to Azure Blob Storage
      this.logger.log(`☁️ [STEP 4/6] Preparing file for blob storage upload...`);
      const audioBuffer = fs.readFileSync(audioFilePath);
      this.logger.log(`📁 File read into buffer: ${audioBuffer.length} bytes`);
      
      const mockFile = {
        buffer: audioBuffer,
        originalname: `${videoId}.mp3`,
        mimetype: 'audio/mpeg',
      } as Express.Multer.File;

      this.logger.log(`🚀 Uploading to blob storage...`);
      const blobUrl = await this.azureBlobService.uploadFile(mockFile, videoId);
      this.logger.log(`✅ File uploaded successfully to: ${blobUrl}`);
      
      await this.videoService.updateJobProgress(jobId, 90);
      this.logger.log(`📊 Progress updated to 90%`);

      // Update video record with blob URL
      this.logger.log(`💾 [STEP 5/6] Updating video record with blob URL...`);
      await this.videoService.updateVideoWithBlobUrl(videoId, blobUrl);
      await this.videoService.updateVideoStatus(videoId, VideoStatus.TRANSCRIBING);
      this.logger.log(`✅ Video record updated with blob URL: ${blobUrl}`);

      // Clean up local file
      this.logger.log(`🗑️ Cleaning up local file: ${audioFilePath}`);
      fs.unlinkSync(audioFilePath);
      this.logger.log(`✅ Local file cleaned up successfully`);

      // Complete job
      this.logger.log(`🏁 [STEP 6/6] Completing job...`);
      await this.videoService.updateJobProgress(jobId, 100, JobStatus.COMPLETED);
      this.logger.log(`✅ Job marked as completed`);

      // Emit event to trigger transcription
      this.logger.log(`📡 Emitting transcription event...`);
      this.eventEmitter.emit('audio.downloaded', {
        videoId,
        blobUrl,
      });

      this.logger.log(`🎉 YouTube download completed successfully for video ${videoId}`);
    } catch (error) {
      this.logger.error(`❌ YouTube download failed for video ${videoId}: ${error.message}`);
      this.logger.error(`Error stack:`, error.stack);
      
      this.logger.log(`🔄 Updating job status to FAILED...`);
      await this.videoService.updateJobProgress(jobId, 0, JobStatus.FAILED, error.message);
      await this.videoService.updateVideoStatus(videoId, VideoStatus.FAILED, error.message);
      this.logger.log(`✅ Job status updated to FAILED`);
      
      throw error;
    }
  }

  private async handleTranscription(job: Job) {
    const { videoId, jobId, blobUrl } = job.data;
    
    this.logger.log(`🎤 [TRANSCRIPTION] Processing transcription for video ${videoId}`);
    this.logger.log(`📋 Transcription job details: ID=${jobId}, BlobURL=${blobUrl}`);

    try {
      // Update job status
      this.logger.log(`🔄 Updating transcription job status to PROCESSING...`);
      await this.videoService.updateJobProgress(jobId, 10, JobStatus.PROCESSING);
      await this.videoService.updateVideoStatus(videoId, VideoStatus.TRANSCRIBING);
      this.logger.log(`✅ Transcription job status updated successfully`);

      // Emit event to trigger actual transcription (handled by TranscriptionModule)
      this.logger.log(`📡 Emitting transcription.requested event...`);
      this.eventEmitter.emit('transcription.requested', {
        videoId,
        jobId,
        blobUrl,
      });

      this.logger.log(`🎉 Transcription job queued successfully for video ${videoId}`);
    } catch (error) {
      this.logger.error(`❌ Transcription setup failed for video ${videoId}: ${error.message}`);
      this.logger.error(`Error stack:`, error.stack);
      
      this.logger.log(`🔄 Updating transcription job status to FAILED...`);
      await this.videoService.updateJobProgress(jobId, 0, JobStatus.FAILED, error.message);
      await this.videoService.updateVideoStatus(videoId, VideoStatus.FAILED, error.message);
      this.logger.log(`✅ Transcription job status updated to FAILED`);
      
      throw error;
    }
  }
}
