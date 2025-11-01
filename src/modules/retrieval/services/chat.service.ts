import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { QuerySource } from '../dto/query.dto';
import { LocalChatService } from './local-chat.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private openai: OpenAI;
  private chatModel: string;
  private chatMode: string;

  constructor(
    private configService: ConfigService,
    private localChatService: LocalChatService,
  ) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    this.chatModel = this.configService.get('CHAT_MODEL', 'gpt-3.5-turbo');
    this.chatMode = this.configService.get('CHAT_MODE', 'local');

    if (this.chatMode === 'openai') {
      if (!apiKey) {
        this.logger.warn('OpenAI API key not configured but CHAT_MODE is set to openai. Falling back to local chat.');
        this.chatMode = 'local';
      } else {
        this.openai = new OpenAI({ apiKey });
        this.logger.log('Using OpenAI chat');
      }
    } else {
      this.logger.log('Using local chat');
    }
  }

  async generateAnswer(query: string, sources: QuerySource[]): Promise<string> {
    if (this.chatMode === 'local') {
      return this.localChatService.generateAnswer(query, sources);
    }

    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      const context = this.buildContext(sources);
      const prompt = this.buildPrompt(query, context);

      this.logger.log(`Generating answer for query: "${query}"`);

      const response = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant that answers questions based on video transcripts. Use only the provided context to answer questions. If the context doesn\'t contain relevant information, say so clearly.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const answer = response.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate an answer for your query.';

      this.logger.log(`Generated answer of length ${answer.length}`);

      return answer;
    } catch (error) {
      this.logger.error(`Failed to generate answer: ${error.message}`);
      throw new Error(`Answer generation failed: ${error.message}`);
    }
  }

  async generateSummary(text: string, title?: string): Promise<string> {
    if (this.chatMode === 'local') {
      return this.localChatService.generateSummary(text, title);
    }

    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      this.logger.log(`Generating summary for text of length ${text.length}`);

      const prompt = `Please provide a concise summary of the following video transcript${title ? ` titled "${title}"` : ''}:\n\n${text}`;

      const response = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant that creates concise summaries of video content.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      const summary = response.choices[0]?.message?.content || 'Unable to generate summary.';

      this.logger.log(`Generated summary of length ${summary.length}`);

      return summary;
    } catch (error) {
      this.logger.error(`Failed to generate summary: ${error.message}`);
      throw new Error(`Summary generation failed: ${error.message}`);
    }
  }

  private buildContext(sources: QuerySource[]): string {
    return sources
      .map((source, index) => {
        const timeRange = `[${this.formatTime(source.start_time)} - ${this.formatTime(source.end_time)}]`;
        return `Context ${index + 1} ${timeRange}:\n${source.text}`;
      })
      .join('\n\n');
  }

  private buildPrompt(query: string, context: string): string {
    return `Based on the following video transcript excerpts, please answer this question: "${query}"

Context from video transcript:
${context}

Please provide a comprehensive answer based on the context above. If the context doesn't contain enough information to answer the question, please state that clearly. Include relevant timestamps when referencing specific parts of the content.`;
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
