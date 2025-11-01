import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EmbeddingService } from '../embedding.service';

@Injectable()
export class EmbeddingListener {
  private readonly logger = new Logger(EmbeddingListener.name);

  constructor(private embeddingService: EmbeddingService) {}

  @OnEvent('chunking.completed')
  async handleChunkingCompleted(payload: {
    videoId: string;
    chunkCount: number;
  }) {
    this.logger.log(`Chunking completed for video ${payload.videoId}, starting embedding`);
    
    try {
      await this.embeddingService.processEmbeddings(payload.videoId);
    } catch (error) {
      this.logger.error(`Embedding failed for video ${payload.videoId}: ${error.message}`);
    }
  }
}
