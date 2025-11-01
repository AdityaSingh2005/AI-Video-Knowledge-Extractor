import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(private configService: ConfigService) {}

  async getHealthStatus() {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      openai: this.checkOpenAI(),
      pinecone: this.checkPinecone(),
      azure: this.checkAzure(),
    };

    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: this.configService.get('NODE_ENV', 'development'),
      checks,
    };
  }

  private async checkDatabase(): Promise<{ status: string; message: string }> {
    try {
      // In a real implementation, you would check database connectivity
      const host = this.configService.get('DATABASE_HOST');
      const port = this.configService.get('DATABASE_PORT');
      
      if (!host || !port) {
        return { status: 'unhealthy', message: 'Database configuration missing' };
      }

      return { status: 'healthy', message: 'Database connection configured' };
    } catch (error) {
      return { status: 'unhealthy', message: `Database error: ${error.message}` };
    }
  }

  private async checkRedis(): Promise<{ status: string; message: string }> {
    try {
      const host = this.configService.get('REDIS_HOST');
      const port = this.configService.get('REDIS_PORT');
      
      if (!host || !port) {
        return { status: 'unhealthy', message: 'Redis configuration missing' };
      }

      return { status: 'healthy', message: 'Redis connection configured' };
    } catch (error) {
      return { status: 'unhealthy', message: `Redis error: ${error.message}` };
    }
  }

  private checkOpenAI(): { status: string; message: string } {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    
    if (!apiKey) {
      return { status: 'unhealthy', message: 'OpenAI API key not configured' };
    }

    return { status: 'healthy', message: 'OpenAI API key configured' };
  }

  private checkPinecone(): { status: string; message: string } {
    const apiKey = this.configService.get('PINECONE_API_KEY');
    const indexName = this.configService.get('PINECONE_INDEX_NAME');
    
    if (!apiKey || !indexName) {
      return { status: 'unhealthy', message: 'Pinecone configuration incomplete' };
    }

    return { status: 'healthy', message: 'Pinecone configuration complete' };
  }

  private checkAzure(): { status: string; message: string } {
    const connectionString = this.configService.get('AZURE_STORAGE_CONNECTION_STRING');
    const containerName = this.configService.get('AZURE_STORAGE_CONTAINER_NAME');
    
    if (!connectionString || !containerName) {
      return { status: 'unhealthy', message: 'Azure Blob Storage configuration incomplete' };
    }

    return { status: 'healthy', message: 'Azure Blob Storage configuration complete' };
  }
}
