import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Video } from './video.entity';

export enum JobType {
  DOWNLOAD_AUDIO = 'download_audio',
  TRANSCRIBE = 'transcribe',
  CHUNK_TRANSCRIPT = 'chunk_transcript',
  EMBED_CHUNKS = 'embed_chunks',
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('job_queue')
export class JobQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  video_id: string;

  @Column({
    type: 'enum',
    enum: JobType,
  })
  job_type: JobType;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  @Column('int', { default: 0 })
  progress: number; // 0-100

  @Column('text', { nullable: true })
  error_message: string;

  @Column('jsonb', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Video, (video) => video.jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id' })
  video: Video;
}
