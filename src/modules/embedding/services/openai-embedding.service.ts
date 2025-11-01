import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LocalEmbeddingService } from './local-embedding.service';

@Injectable()
export class OpenAIEmbeddingService {
  private readonly logger = new Logger(OpenAIEmbeddingService.name);
  private openai: OpenAI;
  private embeddingModel: string;
  private embeddingMode: string;

  constructor(
    private configService: ConfigService,
    private localEmbeddingService: LocalEmbeddingService,
  ) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    this.embeddingModel = this.configService.get('EMBEDDING_MODEL', 'text-embedding-ada-002');
    this.embeddingMode = this.configService.get('EMBEDDING_MODE', 'local');

    if (this.embeddingMode === 'openai') {
      if (!apiKey) {
        this.logger.warn('OpenAI API key not configured but EMBEDDING_MODE is set to openai. Falling back to local embeddings.');
        this.embeddingMode = 'local';
      } else {
        this.openai = new OpenAI({ apiKey });
        this.logger.log('Using OpenAI embeddings');
      }
    } else {
      this.logger.log('Using local embeddings');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (this.embeddingMode === 'local') {
      return this.localEmbeddingService.generateEmbedding(text);
    }

    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      this.logger.log(`Generating embedding for text of length ${text.length}`);
      
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      const embedding = response.data[0].embedding;
      
      this.logger.log(`Generated embedding with ${embedding.length} dimensions`);
      
      return embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (this.embeddingMode === 'local') {
      return this.localEmbeddingService.generateEmbeddings(texts);
    }

    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      this.logger.log(`Generating embeddings for ${texts.length} texts`);
      
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: texts,
      });

      const embeddings = response.data.map(item => item.embedding);
      
      this.logger.log(`Generated ${embeddings.length} embeddings`);
      
      return embeddings;
    } catch (error) {
      this.logger.error(`Failed to generate embeddings: ${error.message}`);
      throw new Error(`Batch embedding generation failed: ${error.message}`);
    }
  }

  async generateEmbeddingsBatched(texts: string[], batchSize: number = 100): Promise<number[][]> {
    if (this.embeddingMode === 'local') {
      return this.localEmbeddingService.generateEmbeddingsBatched(texts, batchSize);
    }

    const allEmbeddings: number[][] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await this.generateEmbeddings(batch);
      allEmbeddings.push(...batchEmbeddings);
      
      // Add small delay to avoid rate limiting
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return allEmbeddings;
  }
}
