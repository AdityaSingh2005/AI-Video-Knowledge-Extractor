import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { AzureBlobService } from './services/azure-blob.service';
import { YoutubeService } from './services/youtube.service';
import { VideoProcessingProcessor } from './processors/video-processing.processor';

import { Video } from '../../entities/video.entity';
import { JobQueue } from '../../entities/job-queue.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Video, JobQueue]),
    BullModule.registerQueue({
      name: 'video-processing',
    }),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        limits: {
          fileSize: 500 * 1024 * 1024, // 500MB
        },
        fileFilter: (req, file, callback) => {
          const allowedTypes = configService.get('ALLOWED_FILE_TYPES', 'mp4,avi,mov,mkv,webm,mp3,wav,m4a').split(',');
          const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
          
          if (allowedTypes.includes(fileExtension)) {
            callback(null, true);
          } else {
            callback(new Error(`File type .${fileExtension} not allowed`), false);
          }
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [VideoController],
  providers: [VideoService, AzureBlobService, YoutubeService, VideoProcessingProcessor],
  exports: [VideoService],
})
export class VideoModule {}
