import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';

export interface PineconeVector {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

@Injectable()
export class PineconeService {
  private readonly logger = new Logger(PineconeService.name);
  private pinecone: Pinecone;
  private indexName: string;
  private indexHost?: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('PINECONE_API_KEY');
    this.indexName = this.configService.get<string>('PINECONE_INDEX_NAME');

    // Optional: Provide host to skip controller "whoami" and avoid network/DNS issues
    const hostFromEnv =
      this.configService.get<string>('PINECONE_INDEX_HOST') ||
      this.configService.get<string>('PINECONE_HOST');
    this.indexHost = hostFromEnv ? this.normalizeHost(hostFromEnv) : undefined;

    if (!apiKey || !this.indexName) {
      this.logger.warn('Pinecone not configured. Vector operations will fail.');
      return;
    }

    this.pinecone = new Pinecone({ apiKey });
    this.logger.log(
      `Pinecone client configured${this.indexHost ? ' with explicit host' : ''}`,
    );
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.pinecone) {
      throw new Error('Pinecone not configured');
    }
  }

  private normalizeHost(host: string): string {
    try {
      // Allow either protocol form; SDK expects the hostname
      if (host.startsWith('http://') || host.startsWith('https://')) {
        const url = new URL(host);
        return url.host;
      }
      return host;
    } catch {
      return host;
    }
  }

  private getIndex() {
    // v2 SDK supports passing host to bypass controller whoami
    return this.indexHost
      ? this.pinecone.Index(this.indexName, this.indexHost)
      : this.pinecone.Index(this.indexName);
  }

  async upsertVectors(vectors: PineconeVector[]): Promise<void> {
    try {
      await this.ensureInitialized();
      
      const index = this.getIndex();

      this.logger.log(`Upserting ${vectors.length} vectors to Pinecone`);

      await index.upsert(vectors);
      
      this.logger.log(`Successfully upserted ${vectors.length} vectors`);
    } catch (error) {
      this.logger.error(`Failed to upsert vectors: ${error.message}`);
      throw new Error(`Pinecone upsert failed: ${error.message}`);
    }
  }

  async query(
    vector: number[],
    topK: number = 5,
    filter?: Record<string, any>,
    includeMetadata: boolean = true,
  ): Promise<any> {
    try {
      await this.ensureInitialized();
      
      const index = this.getIndex();
      
      this.logger.log(`Querying Pinecone for top ${topK} similar vectors`);
      
      const result = await index.query({
        vector,
        topK,
        includeMetadata,
        filter,
      });
      
      this.logger.log(`Found ${result.matches?.length || 0} similar vectors`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to query vectors: ${error.message}`);
      throw new Error(`Pinecone query failed: ${error.message}`);
    }
  }

  async deleteVectors(ids: string[]): Promise<void> {
    try {
      await this.ensureInitialized();
      
      const index = this.getIndex();
      
      this.logger.log(`Deleting ${ids.length} vectors from Pinecone`);
      
      await index.deleteMany(ids);
      
      this.logger.log(`Successfully deleted ${ids.length} vectors`);
    } catch (error) {
      this.logger.error(`Failed to delete vectors: ${error.message}`);
      throw new Error(`Pinecone delete failed: ${error.message}`);
    }
  }

  async deleteByFilter(filter: Record<string, any>): Promise<void> {
    try {
      await this.ensureInitialized();
      
      const index = this.getIndex();
      
      this.logger.log(`Deleting vectors by filter from Pinecone`);
      
      if (filter && Object.keys(filter).length > 0) {
        await index.deleteByFilter(filter);
      } else {
        await index.deleteAll();
      }
      
      this.logger.log(`Successfully deleted vectors by filter`);
    } catch (error) {
      this.logger.error(`Failed to delete vectors by filter: ${error.message}`);
      throw new Error(`Pinecone delete by filter failed: ${error.message}`);
    }
  }

  async getIndexStats(): Promise<any> {
    try {
      await this.ensureInitialized();
      
      const index = this.getIndex();
      const stats = await index.describeIndexStats();
      
      this.logger.log(`Index stats: ${JSON.stringify(stats)}`);
      
      return stats;
    } catch (error) {
      this.logger.error(`Failed to get index stats: ${error.message}`);
      throw new Error(`Pinecone stats failed: ${error.message}`);
    }
  }
}