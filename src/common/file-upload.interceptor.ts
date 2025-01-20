import { Injectable, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

@Injectable()
export class FileUploadInterceptor {
  static uploadFile(
    fieldName: string,
    allowedFileTypes: RegExp,
    destination: string,
  ) {
    return FileInterceptor(fieldName, {
      storage: diskStorage({
        destination,
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(allowedFileTypes)) {
          return cb(
            new BadRequestException(
              `Invalid file type. Allowed file types are: ${allowedFileTypes}`,
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    });
  }
}
