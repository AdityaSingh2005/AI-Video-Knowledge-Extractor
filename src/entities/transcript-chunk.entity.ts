import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  CreateDateColumn,
} from 'typeorm';
import { Video } from './video.entity';
import { EmbeddingMeta } from './embedding-meta.entity';

@Entity('transcript_chunks')
export class TranscriptChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  video_id: string;

  @Column('text')
  text: string;

  @Column('float', { nullable: true })
  start_time: number;

  @Column('float', { nullable: true })
  end_time: number;

  @Column('int')
  chunk_index: number;

  @Column('int', { nullable: true })
  token_count: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Video, (video) => video.chunks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id' })
  video: Video;

  @OneToOne(() => EmbeddingMeta, (embedding) => embedding.chunk)
  embedding: EmbeddingMeta;
}
