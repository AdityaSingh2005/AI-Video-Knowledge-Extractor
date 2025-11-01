import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as multer from 'multer';

@Injectable()
export class OptionalFileInterceptor implements NestInterceptor {
  private multerInstance: any;

  constructor() {
    const storage = multer.memoryStorage();
    
    // Default allowed file types (can be overridden via env)
    const defaultAllowedTypes = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'mp3', 'wav', 'm4a'];
    
    this.multerInstance = multer({
      storage,
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
      },
      fileFilter: (req: any, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
        // Get allowed types from env or use defaults
        const allowedTypesEnv = process.env.ALLOWED_FILE_TYPES;
        const allowedTypes = allowedTypesEnv 
          ? allowedTypesEnv.split(',').map(t => t.trim().toLowerCase())
          : defaultAllowedTypes;
        
        const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
        
        if (fileExtension && allowedTypes.includes(fileExtension)) {
          callback(null, true);
        } else {
          callback(new Error(`File type .${fileExtension} not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
        }
      },
    }).single('file');
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const contentType = request.headers['content-type'] || '';

    // Only apply multer if it's multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      return new Observable(subscriber => {
        this.multerInstance(request, {}, (err: any) => {
          if (err) {
            subscriber.error(err);
            return;
          }
          next.handle().subscribe(subscriber);
        });
      });
    }

    // For JSON requests, just pass through
    return next.handle();
  }
}

