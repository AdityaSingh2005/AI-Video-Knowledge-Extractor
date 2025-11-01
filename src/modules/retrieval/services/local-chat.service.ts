import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { QuerySource } from '../dto/query.dto';

@Injectable()
export class LocalChatService {
  private readonly logger = new Logger(LocalChatService.name);
  private chatServerUrl: string;

  constructor(private configService: ConfigService) {
    this.chatServerUrl = this.configService.get('LOCAL_CHAT_URL', 'http://127.0.0.1:5002');
  }

  async generateAnswer(query: string, sources: QuerySource[]): Promise<string> {
    try {
      const context = this.buildContext(sources);
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that answers questions based on video transcripts. Use only the provided context to answer questions. If the context doesn\'t contain relevant information, say so clearly.',
        },
        {
          role: 'user',
          content: this.buildPrompt(query, context),
        },
      ];

      this.logger.log(`Generating answer for query: "${query}"`);

      const response = await fetch(`${this.chatServerUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          max_tokens: 500,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`Local chat server responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`Local chat generation failed: ${result.error}`);
      }

      const answer = result.choices?.[0]?.message?.content || 'I apologize, but I couldn\'t generate an answer for your query.';

      this.logger.log(`Generated answer of length ${answer.length}`);

      return answer;
    } catch (error) {
      this.logger.error(`Failed to generate answer: ${error.message}`);
      
      // Check if local server is running
      try {
        const healthResponse = await fetch(`${this.chatServerUrl}/health`);
        if (!healthResponse.ok) {
          throw new Error('Local chat server is not responding');
        }
      } catch (healthError) {
        throw new Error(`Local chat server is not running. Please start it with: cd python-whisper && python chat_server.py`);
      }
      
      throw new Error(`Local answer generation failed: ${error.message}`);
    }
  }

  async generateSummary(text: string, title?: string): Promise<string> {
    try {
      this.logger.log(`Generating summary for text of length ${text.length}`);

      const messages = [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that creates concise summaries of video content.',
        },
        {
          role: 'user',
          content: `Please provide a concise summary of the following video transcript${title ? ` titled "${title}"` : ''}:\n\n${text}`,
        },
      ];

      const response = await fetch(`${this.chatServerUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          max_tokens: 300,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`Local chat server responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`Local summary generation failed: ${result.error}`);
      }

      const summary = result.choices?.[0]?.message?.content || 'Unable to generate summary.';

      this.logger.log(`Generated summary of length ${summary.length}`);

      return summary;
    } catch (error) {
      this.logger.error(`Failed to generate summary: ${error.message}`);
      throw new Error(`Local summary generation failed: ${error.message}`);
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

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.chatServerUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
