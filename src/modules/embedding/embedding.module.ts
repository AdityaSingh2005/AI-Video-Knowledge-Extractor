import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmbeddingService } from './embedding.service';
import { PineconeService } from './services/pinecone.service';
import { OpenAIEmbeddingService } from './services/openai-embedding.service';
import { LocalEmbeddingService } from './services/local-embedding.service';
import { EmbeddingListener } from './listeners/embedding.listener';

import { Video } from '../../entities/video.entity';
import { TranscriptChunk } from '../../entities/transcript-chunk.entity';
import { EmbeddingMeta } from '../../entities/embedding-meta.entity';
import { JobQueue } from '../../entities/job-queue.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Video, TranscriptChunk, EmbeddingMeta, JobQueue]),
  ],
  providers: [
    EmbeddingService,
    PineconeService,
    OpenAIEmbeddingService,
    LocalEmbeddingService,
    EmbeddingListener,
  ],
  exports: [EmbeddingService, PineconeService],
})
export class EmbeddingModule {}
