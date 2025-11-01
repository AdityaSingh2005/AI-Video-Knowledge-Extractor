import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Video } from '../../entities/video.entity';
import { TranscriptChunk } from '../../entities/transcript-chunk.entity';

import { EmbeddingService } from '../embedding/embedding.service';
import { ChatService } from './services/chat.service';
import { QueryResponse, QuerySource } from './dto/query.dto';

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(TranscriptChunk)
    private chunkRepository: Repository<TranscriptChunk>,
    private embeddingService: EmbeddingService,
    private chatService: ChatService,
  ) {}

  async queryVideoContent(
    query: string,
    videoId?: string,
    maxChunks: number = 5,
  ): Promise<QueryResponse> {
    this.logger.log(`Processing query: "${query}" for video: ${videoId || 'all'}`);

    try {
      // Validate video exists if specified
      if (videoId) {
        const video = await this.videoRepository.findOne({
          where: { id: videoId },
        });

        if (!video) {
          throw new NotFoundException('Video not found');
        }

        if (video.status !== 'complete') {
          throw new Error('Video processing not complete. Please wait for processing to finish.');
        }
      }

      // Search for similar chunks
      const similarChunks = await this.embeddingService.searchSimilarChunks(
        query,
        videoId,
        maxChunks,
      );

      if (similarChunks.length === 0) {
        return {
          answer: 'No relevant content found for your query.',
          sources: [],
          query,
          video_id: videoId,
        };
      }

      // Get full chunk details from database
      const chunkIds = similarChunks.map(chunk => chunk.id);
      const chunks = await this.chunkRepository.find({
        where: chunkIds.map(id => ({ id })),
        relations: ['video'],
      });

      // Create sources with similarity scores
      const sources: QuerySource[] = similarChunks.map(similarChunk => {
        const chunk = chunks.find(c => c.id === similarChunk.id);
        return {
          chunk_id: similarChunk.id,
          text: similarChunk.metadata?.text || chunk?.text || '',
          start_time: similarChunk.metadata?.start_time || chunk?.start_time || 0,
          end_time: similarChunk.metadata?.end_time || chunk?.end_time || 0,
          similarity_score: similarChunk.score || 0,
          video_id: similarChunk.metadata?.video_id || chunk?.video_id || '',
        };
      });

      // Generate answer using chat service
      const answer = await this.chatService.generateAnswer(query, sources);

      return {
        answer,
        sources,
        query,
        video_id: videoId,
      };
    } catch (error) {
      this.logger.error(`Query processing failed: ${error.message}`);
      throw error;
    }
  }

  async getVideoSummary(videoId: string): Promise<string> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Get first few chunks to create a summary
    const chunks = await this.chunkRepository.find({
      where: { video_id: videoId },
      order: { chunk_index: 'ASC' },
      take: 5,
    });

    if (chunks.length === 0) {
      return 'No transcript available for this video.';
    }

    const combinedText = chunks.map(chunk => chunk.text).join(' ');
    
    return this.chatService.generateSummary(combinedText, video.title);
  }
}
