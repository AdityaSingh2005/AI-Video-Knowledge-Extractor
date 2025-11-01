import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { TranscriptionService } from '../transcription.service';

@Injectable()
export class TranscriptionListener {
  private readonly logger = new Logger(TranscriptionListener.name);

  constructor(private transcriptionService: TranscriptionService) {}

  @OnEvent('audio.downloaded')
  async handleAudioDownloaded(payload: {
    videoId: string;
    blobUrl: string;
  }) {
    this.logger.log(`🎤 Audio downloaded for video ${payload.videoId}, starting transcription`);
    this.logger.log(`📋 Audio URL: ${payload.blobUrl}`);
    
    try {
      // Create transcription job and start transcription directly
      await this.transcriptionService.processTranscription(
        payload.videoId,
        payload.blobUrl,
      );
    } catch (error) {
      this.logger.error(`❌ Transcription failed for video ${payload.videoId}: ${error.message}`);
      this.logger.error(`Error stack:`, error.stack);
    }
  }

  @OnEvent('transcription.requested')
  async handleTranscriptionRequested(payload: {
    videoId: string;
    jobId: string;
    blobUrl: string;
  }) {
    this.logger.log(`Transcription requested for video ${payload.videoId}`);
    
    try {
      await this.transcriptionService.transcribeAudio(
        payload.videoId,
        payload.jobId,
        payload.blobUrl,
      );
    } catch (error) {
      this.logger.error(`Transcription failed for video ${payload.videoId}: ${error.message}`);
    }
  }
}
