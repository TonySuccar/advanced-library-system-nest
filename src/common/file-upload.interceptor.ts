import { Injectable, BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import * as fs from 'fs';

@Injectable()
export class FileUploadInterceptor {
  static uploadFile(
    fieldName: string, // The field name in the form-data
    allowedFileTypes: RegExp, // Regular expression for allowed file types
    destination: string, // Destination folder for file storage
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
        fileSize: 10 * 1024 * 1024, // 10MB file size limit
      },
    });
  }
  static addTwoFiles(
    fieldName: string, // Field name for the file input
    destination: string, // Base destination folder for uploaded files
  ) {
    return FilesInterceptor(fieldName, 2, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Dynamically set the folder based on file type
          const folder = file.mimetype.startsWith('image/')
            ? `${destination}/cover-images`
            : `${destination}/book-pdfs`;

          // Ensure the folder exists, or create it
          if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
          }

          cb(null, folder);
        },
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 15)}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
          return cb(
            new BadRequestException(
              'Invalid file type. Only JPG, PNG, and PDF files are allowed.',
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
