import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LocalEmbeddingService {
  private readonly logger = new Logger(LocalEmbeddingService.name);
  private embeddingServerUrl: string;

  constructor(private configService: ConfigService) {
    this.embeddingServerUrl = this.configService.get('LOCAL_EMBEDDING_URL', 'http://127.0.0.1:5001');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      this.logger.log(`Generating embedding for text of length ${text.length}`);
      
      const response = await fetch(`${this.embeddingServerUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Local embedding server responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`Local embedding generation failed: ${result.error}`);
      }

      this.logger.log(`Generated embedding with ${result.dimensions} dimensions`);
      
      return result.embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      
      // Check if local server is running
      try {
        const healthResponse = await fetch(`${this.embeddingServerUrl}/health`);
        if (!healthResponse.ok) {
          throw new Error('Local embedding server is not responding');
        }
      } catch (healthError) {
        throw new Error(`Local embedding server is not running. Please start it with: cd python-whisper && python embedding_server.py`);
      }
      
      throw new Error(`Local embedding generation failed: ${error.message}`);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      this.logger.log(`Generating embeddings for ${texts.length} texts`);
      
      const response = await fetch(`${this.embeddingServerUrl}/embed/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ texts }),
      });

      if (!response.ok) {
        throw new Error(`Local embedding server responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`Local batch embedding generation failed: ${result.error}`);
      }

      this.logger.log(`Generated ${result.count} embeddings`);
      
      return result.embeddings;
    } catch (error) {
      this.logger.error(`Failed to generate batch embeddings: ${error.message}`);
      throw new Error(`Local batch embedding generation failed: ${error.message}`);
    }
  }

  async generateEmbeddingsBatched(texts: string[], batchSize: number = 32): Promise<number[][]> {
    const allEmbeddings: number[][] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await this.generateEmbeddings(batch);
      allEmbeddings.push(...batchEmbeddings);
      
      // Add small delay to avoid overwhelming the server
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return allEmbeddings;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.embeddingServerUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
