import { IsString, IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';

export class QueryDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsUUID()
  video_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  max_chunks?: number = 5;
}

export class QueryResponse {
  answer: string;
  sources: QuerySource[];
  query: string;
  video_id?: string;
}

export class QuerySource {
  chunk_id: string;
  text: string;
  start_time: number;
  end_time: number;
  similarity_score: number;
  video_id: string;
}
