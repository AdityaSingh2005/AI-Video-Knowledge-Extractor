import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChunkingService } from './chunking.service';
import { ChunkingListener } from './listeners/chunking.listener';

import { Video } from '../../entities/video.entity';
import { TranscriptChunk } from '../../entities/transcript-chunk.entity';
import { JobQueue } from '../../entities/job-queue.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Video, TranscriptChunk, JobQueue]),
  ],
  providers: [ChunkingService, ChunkingListener],
  exports: [ChunkingService],
})
export class ChunkingModule {}
