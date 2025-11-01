import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AzureBlobService {
  private readonly logger = new Logger(AzureBlobService.name);
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get('AZURE_STORAGE_CONNECTION_STRING');
    const containerName = this.configService.get('AZURE_STORAGE_CONTAINER_NAME');

    if (!connectionString || !containerName || connectionString === 'your_azure_connection_string') {
      this.logger.warn('Azure Blob Storage not configured. File uploads will be stored locally in temp directory.');
      return;
    }

    try {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      this.containerClient = this.blobServiceClient.getContainerClient(containerName);
      this.logger.log('Azure Blob Storage configured successfully');
    } catch (error) {
      this.logger.warn(`Azure Blob Storage configuration failed: ${error.message}. File uploads will be stored locally.`);
    }
  }

  async uploadFile(file: Express.Multer.File, videoId: string): Promise<string> {
    if (!this.containerClient) {
      // Fallback to local storage
      return this.uploadFileLocally(file, videoId);
    }

    const fileExtension = file.originalname.split('.').pop();
    const blobName = `${videoId}/${uuidv4()}.${fileExtension}`;

    this.logger.log(`Uploading file to Azure Blob: ${blobName}`);

    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.upload(file.buffer, file.buffer.length, {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
        },
      });

      const blobUrl = blockBlobClient.url;
      this.logger.log(`File uploaded successfully: ${blobUrl}`);
      
      return blobUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file to Azure Blob: ${error.message}`);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  async downloadFile(blobUrl: string): Promise<Buffer> {
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Storage not configured');
    }

    try {
      // Extract blob name from URL
      const blobName = this.getBlobNameFromUrl(blobUrl);
      const blobClient = this.containerClient.getBlobClient(blobName);
      const downloadResponse = await blobClient.download();
      
      const chunks: Buffer[] = [];
      const readable = downloadResponse.readableStreamBody;
      
      return new Promise((resolve, reject) => {
        readable.on('data', (chunk) => chunks.push(chunk));
        readable.on('end', () => resolve(Buffer.concat(chunks)));
        readable.on('error', reject);
      });
    } catch (error) {
      this.logger.error(`Failed to download file from Azure Blob: ${error.message}`);
      throw new Error(`File download failed: ${error.message}`);
    }
  }

  async deleteFile(blobUrl: string): Promise<void> {
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Storage not configured');
    }

    try {
      const blobName = this.getBlobNameFromUrl(blobUrl);
      const blobClient = this.containerClient.getBlobClient(blobName);
      await blobClient.delete();
      this.logger.log(`File deleted successfully: ${blobUrl}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from Azure Blob: ${error.message}`);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  private async uploadFileLocally(file: Express.Multer.File, videoId: string): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp', 'uploads');
    
    // Ensure directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${videoId}_${uuidv4()}.${fileExtension}`;
    const filePath = path.join(tempDir, fileName);

    this.logger.log(`Storing file locally: ${filePath}`);

    // Write file to local storage
    fs.writeFileSync(filePath, file.buffer);

    // Return local file URL
    const localUrl = `file://${filePath}`;
    this.logger.log(`File stored locally: ${localUrl}`);
    
    return localUrl;
  }

  private getBlobNameFromUrl(blobUrl: string): string {
    // Extract blob name from full URL
    // Example: https://account.blob.core.windows.net/container/path/file.ext -> path/file.ext
    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/');
    // Remove the first empty part and container name
    return pathParts.slice(2).join('/');
  }
}