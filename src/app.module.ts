import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Modules
import { VideoModule } from './modules/video/video.module';
import { TranscriptionModule } from './modules/transcription/transcription.module';
import { ChunkingModule } from './modules/chunking/chunking.module';
import { EmbeddingModule } from './modules/embedding/embedding.module';
import { RetrievalModule } from './modules/retrieval/retrieval.module';
import { HealthModule } from './modules/health/health.module';

// Entities
import { Video } from './entities/video.entity';
import { TranscriptChunk } from './entities/transcript-chunk.entity';
import { EmbeddingMeta } from './entities/embedding-meta.entity';
import { JobQueue } from './entities/job-queue.entity';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [Video, TranscriptChunk, EmbeddingMeta, JobQueue],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Redis/BullMQ
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),

    // Event Emitter
    EventEmitterModule.forRoot(),

    // Feature Modules
    VideoModule,
    TranscriptionModule,
    ChunkingModule,
    EmbeddingModule,
    RetrievalModule,
    HealthModule,
  ],
})
export class AppModule {}
