import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TranscriptionService } from './transcription.service';
import { WhisperService } from './services/whisper.service';
import { TranscriptionListener } from './listeners/transcription.listener';

import { Video } from '../../entities/video.entity';
import { TranscriptChunk } from '../../entities/transcript-chunk.entity';
import { JobQueue } from '../../entities/job-queue.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Video, TranscriptChunk, JobQueue]),
  ],
  providers: [TranscriptionService, WhisperService, TranscriptionListener],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}
