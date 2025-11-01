import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RetrievalController } from './retrieval.controller';
import { RetrievalService } from './retrieval.service';
import { ChatService } from './services/chat.service';
import { LocalChatService } from './services/local-chat.service';

import { EmbeddingModule } from '../embedding/embedding.module';

import { Video } from '../../entities/video.entity';
import { TranscriptChunk } from '../../entities/transcript-chunk.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Video, TranscriptChunk]),
    EmbeddingModule,
  ],
  controllers: [RetrievalController],
  providers: [RetrievalService, ChatService, LocalChatService],
  exports: [RetrievalService],
})
export class RetrievalModule {}
