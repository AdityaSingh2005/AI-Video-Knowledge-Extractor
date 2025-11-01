import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UploadVideoDto {
  @IsOptional()
  @IsUrl()
  youtube_url?: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class VideoUploadResponse {
  video_id: string;
  job_id: string;
  status: string;
  message: string;
}
