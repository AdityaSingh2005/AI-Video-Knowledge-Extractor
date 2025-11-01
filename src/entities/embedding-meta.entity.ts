import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { TranscriptChunk } from './transcript-chunk.entity';

@Entity('embedding_meta')
export class EmbeddingMeta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  chunk_id: string;

  @Column({ nullable: true })
  vector_id: string; // Pinecone vector ID

  @Column({ nullable: true })
  embedding_model: string;

  @Column('int', { nullable: true })
  embedding_dimensions: number;

  @CreateDateColumn()
  created_at: Date;

  @OneToOne(() => TranscriptChunk, (chunk) => chunk.embedding, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chunk_id' })
  chunk: TranscriptChunk;
}
