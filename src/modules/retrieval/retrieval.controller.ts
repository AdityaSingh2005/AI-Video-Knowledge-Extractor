import {
  Controller,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';

import { RetrievalService } from './retrieval.service';
import { QueryDto, QueryResponse } from './dto/query.dto';

@Controller('api/query')
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}

  @Post()
  async queryVideo(@Body() queryDto: QueryDto): Promise<QueryResponse> {
    if (!queryDto.query || queryDto.query.trim().length === 0) {
      throw new BadRequestException('Query cannot be empty');
    }

    return this.retrievalService.queryVideoContent(
      queryDto.query,
      queryDto.video_id,
      queryDto.max_chunks,
    );
  }
}
