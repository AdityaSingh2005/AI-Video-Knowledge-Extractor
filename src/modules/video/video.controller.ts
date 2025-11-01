import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { VideoService } from './video.service';
import { UploadVideoDto, VideoUploadResponse } from './dto/upload-video.dto';

@Controller('api/video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload')
  async uploadVideo(
    @Body() uploadVideoDto: UploadVideoDto,
  ): Promise<VideoUploadResponse> {
    if (!uploadVideoDto.youtube_url) {
      throw new BadRequestException('YouTube URL is required');
    }

    return this.videoService.processYoutubeUrl(uploadVideoDto.youtube_url, uploadVideoDto.title);
  }

  @Post('upload/youtube')
  async uploadYoutubeVideo(
    @Body() uploadVideoDto: UploadVideoDto,
  ): Promise<VideoUploadResponse> {
    if (!uploadVideoDto.youtube_url) {
      throw new BadRequestException('YouTube URL is required');
    }

    return this.videoService.processYoutubeUrl(uploadVideoDto.youtube_url, uploadVideoDto.title);
  }

  @Get('status/:videoId')
  async getVideoStatus(@Param('videoId') videoId: string) {
    const video = await this.videoService.getVideoWithJobs(videoId);
    
    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return {
      video_id: video.id,
      title: video.title,
      status: video.status,
      progress: this.calculateOverallProgress(video.jobs),
      jobs: video.jobs.map(job => ({
        job_type: job.job_type,
        status: job.status,
        progress: job.progress,
        error_message: job.error_message,
      })),
      created_at: video.created_at,
      updated_at: video.updated_at,
    };
  }

  @Get('transcript/:videoId')
  async getTranscript(@Param('videoId') videoId: string) {
    const transcript = await this.videoService.getVideoTranscript(videoId);
    
    if (!transcript) {
      throw new NotFoundException('Video or transcript not found');
    }

    return transcript;
  }

  private calculateOverallProgress(jobs: any[]): number {
    if (!jobs || jobs.length === 0) return 0;
    
    const totalProgress = jobs.reduce((sum, job) => sum + job.progress, 0);
    return Math.round(totalProgress / jobs.length);
  }
}
