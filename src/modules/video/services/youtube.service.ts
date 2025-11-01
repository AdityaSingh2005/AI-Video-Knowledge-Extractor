import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
const youtubedl = require('youtube-dl-exec');

export interface VideoInfo {
  title: string;
  duration: number;
  thumbnail: string;
}

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);

  async getVideoInfo(url: string): Promise<VideoInfo> {
    try {
      this.logger.log(`🔍 Getting video info for: ${url}`);
      
      const info = await youtubedl(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: [
          'referer:youtube.com',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ]
      }) as any; // Type assertion since youtube-dl-exec doesn't have proper types
      
      this.logger.log(`✅ Successfully retrieved video info: "${info.title}" (${info.duration}s)`);

      return {
        title: info.title || 'Unknown Title',
        duration: info.duration || 0,
        thumbnail: info.thumbnail || '',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get video info: ${error.message}`);
      this.logger.error(`Error details:`, error);
      throw new Error(`Invalid YouTube URL or video not accessible: ${error.message}`);
    }
  }

  async downloadAudio(url: string, outputPath?: string): Promise<string> {
    try {
      this.logger.log(`🎵 Starting audio download from: ${url}`);

      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        this.logger.log(`📁 Creating temp directory: ${tempDir}`);
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const baseFilename = outputPath || path.join(tempDir, `${uuidv4()}`);
      this.logger.log(`📝 Audio will be saved to: ${baseFilename}.%(ext)s`);

      this.logger.log(`🚀 Starting download with youtube-dl-exec...`);
      
      const result = await youtubedl(url, {
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: 0, // best quality
        output: `${baseFilename}.%(ext)s`,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: [
          'referer:youtube.com',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ]
      });

      // The actual filename will have the .mp3 extension
      const actualFilename = `${baseFilename}.mp3`;
      
      if (fs.existsSync(actualFilename)) {
        const stats = fs.statSync(actualFilename);
        this.logger.log(`✅ Audio downloaded successfully: ${actualFilename} (${stats.size} bytes)`);
        return actualFilename;
      } else {
        // Sometimes the file might have a different extension, let's check
        const files = fs.readdirSync(tempDir).filter(f => f.startsWith(path.basename(baseFilename)));
        if (files.length > 0) {
          const foundFile = path.join(tempDir, files[0]);
          const stats = fs.statSync(foundFile);
          this.logger.log(`✅ Audio downloaded successfully: ${foundFile} (${stats.size} bytes)`);
          return foundFile;
        } else {
          throw new Error('Downloaded file not found');
        }
      }
    } catch (error) {
      this.logger.error(`❌ Failed to download audio: ${error.message}`);
      this.logger.error(`Error details:`, error);
      throw new Error(`Audio download failed: ${error.message}`);
    }
  }

  validateYouTubeUrl(url: string): boolean {
    // Simple YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
    return youtubeRegex.test(url);
  }
}
