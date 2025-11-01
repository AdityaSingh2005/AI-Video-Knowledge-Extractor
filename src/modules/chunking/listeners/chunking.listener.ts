import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { ChunkingService } from '../chunking.service';

@Injectable()
export class ChunkingListener {
  private readonly logger = new Logger(ChunkingListener.name);

  constructor(private chunkingService: ChunkingService) {}

  @OnEvent('transcription.completed')
  async handleTranscriptionCompleted(payload: {
    videoId: string;
    segmentCount: number;
  }) {
    this.logger.log(`Transcription completed for video ${payload.videoId}, starting chunking`);
    
    try {
      await this.chunkingService.processTranscriptChunking(payload.videoId);
    } catch (error) {
      this.logger.error(`Chunking failed for video ${payload.videoId}: ${error.message}`);
    }
  }
}
