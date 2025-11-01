import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TranscriptChunk } from './transcript-chunk.entity';
import { JobQueue } from './job-queue.entity';

export enum VideoStatus {
  UPLOADED = 'uploaded',
  DOWNLOADING = 'downloading',
  TRANSCRIBING = 'transcribing',
  CHUNKING = 'chunking',
  EMBEDDING = 'embedding',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  source_url: string;

  @Column({ nullable: true })
  blob_url: string;

  @Column({ nullable: true })
  original_filename: string;

  @Column({ type: 'int', nullable: true })
  duration_seconds: number;

  @Column({
    type: 'enum',
    enum: VideoStatus,
    default: VideoStatus.UPLOADED,
  })
  status: VideoStatus;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => TranscriptChunk, (chunk) => chunk.video)
  chunks: TranscriptChunk[];

  @OneToMany(() => JobQueue, (job) => job.video)
  jobs: JobQueue[];
}
