import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as FormData from 'form-data';
import * as http from 'http';

import { TranscriptionSegment } from '../transcription.service';

@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name);
  private openai: OpenAI;
  private whisperMode: string;

  constructor(private configService: ConfigService) {
    this.whisperMode = this.configService.get('WHISPER_MODE', 'openai');
    
    if (this.whisperMode === 'openai') {
      const apiKey = this.configService.get('OPENAI_API_KEY');
      if (apiKey) {
        this.openai = new OpenAI({ apiKey });
      } else {
        this.logger.warn('OpenAI API key not configured. Whisper transcription will fail.');
      }
    }
  }

  async transcribe(audioUrl: string): Promise<TranscriptionSegment[]> {
    this.logger.log(`Starting transcription with mode: ${this.whisperMode}`);

    if (this.whisperMode === 'openai') {
      return this.transcribeWithOpenAI(audioUrl);
    } else {
      return this.transcribeWithLocal(audioUrl);
    }
  }

  private async transcribeWithOpenAI(audioUrl: string): Promise<TranscriptionSegment[]> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      this.logger.log('Downloading audio file for OpenAI transcription');
      
      // Download audio file temporarily
      const audioBuffer = await this.downloadAudioFile(audioUrl);
      const tempFilePath = path.join(process.cwd(), 'temp', `${uuidv4()}.mp3`);
      
      // Ensure temp directory exists
      const tempDir = path.dirname(tempFilePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      fs.writeFileSync(tempFilePath, audioBuffer);

      this.logger.log('Sending audio to OpenAI Whisper API');
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });

      // Clean up temp file
      fs.unlinkSync(tempFilePath);

      // Convert OpenAI response to our format
      const segments: TranscriptionSegment[] = transcription.segments?.map(segment => ({
        text: segment.text,
        start: segment.start,
        end: segment.end,
      })) || [];

      this.logger.log(`OpenAI transcription completed with ${segments.length} segments`);
      return segments;
    } catch (error) {
      this.logger.error(`OpenAI transcription failed: ${error.message}`);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  private async transcribeWithLocal(audioUrl: string): Promise<TranscriptionSegment[]> {
    const localWhisperUrl = this.configService.get('LOCAL_WHISPER_URL', 'http://127.0.0.1:5000');
    
    try {
      this.logger.log('Sending audio to local Whisper server');
      
      // Handle local file URLs by reading the file and sending it directly
      if (audioUrl.startsWith('file://')) {
        const filePath = audioUrl.replace('file://', '');
        this.logger.log(`Reading local file: ${filePath}`);
        
        const fileBuffer = fs.readFileSync(filePath);
        const formData = new FormData();
        formData.append('audio_file', fileBuffer, {
          filename: 'audio.mp3',
          contentType: 'audio/mpeg',
        });
        
        // Use a Promise-based approach with http module
        const result = await new Promise<any>((resolve, reject) => {
          const url = new URL(`${localWhisperUrl}/transcribe`);
          
          const req = http.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: formData.getHeaders(),
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              try {
                const jsonResult = JSON.parse(data);
                if (res.statusCode !== 200) {
                  reject(new Error(`Local Whisper server responded with status: ${res.statusCode}`));
                } else {
                  resolve(jsonResult);
                }
              } catch (error) {
                reject(new Error(`Failed to parse response: ${error.message}`));
              }
            });
          });
          
          req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
          });
          
          formData.pipe(req);
        });
        
        if (!result.success) {
          throw new Error(`Local Whisper transcription failed: ${result.error}`);
        }
        
        // Convert local Whisper response to our format
        const segments: TranscriptionSegment[] = result.result.segments?.map(segment => ({
          text: segment.text,
          start: segment.start,
          end: segment.end,
        })) || [];
        
        this.logger.log(`Local Whisper transcription completed with ${segments.length} segments`);
        return segments;
      }
      
      // Handle HTTP URLs (original logic)
      const response = await fetch(`${localWhisperUrl}/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`Local Whisper server responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`Local Whisper transcription failed: ${result.error}`);
      }

      // Convert local Whisper response to our format
      const segments: TranscriptionSegment[] = result.result.segments?.map(segment => ({
        text: segment.text,
        start: segment.start,
        end: segment.end,
      })) || [];

      this.logger.log(`Local Whisper transcription completed with ${segments.length} segments`);
      return segments;
      
    } catch (error) {
      this.logger.error(`Local Whisper transcription failed: ${error.message}`);
      
      // Check if local server is running
      try {
        const healthResponse = await fetch(`${localWhisperUrl}/health`);
        if (!healthResponse.ok) {
          throw new Error('Local Whisper server is not responding');
        }
      } catch (healthError) {
        throw new Error(`Local Whisper server is not running. Please start it with: cd python-whisper && ./start_whisper.sh`);
      }
      
      throw new Error(`Local Whisper transcription failed: ${error.message}`);
    }
  }

  private async downloadAudioFile(url: string): Promise<Buffer> {
    try {
      // If it's an Azure Blob URL, we can fetch it directly
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error(`Failed to download audio file: ${error.message}`);
      throw new Error(`Audio download failed: ${error.message}`);
    }
  }
}
