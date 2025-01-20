import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { RequestBookDto } from './dtos/request-book.dto';
import { AuthorService } from './author.service';
import { AuthenticatedRequest } from 'src/types/auth.types';

@Controller('author')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthorController {
  constructor(private readonly authorService: AuthorService) {}

  @Post('request-book')
  @Roles('author')
  @UseInterceptors(
    FilesInterceptor('files', 2, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const folder = file.mimetype.startsWith('image/')
            ? './uploads/cover-images'
            : './uploads/book-pdfs';

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
    }),
  )
  async requestBook(
    @Body() requestBookDto: RequestBookDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: AuthenticatedRequest,
  ) {
    const authorId = req.user.userId;

    const coverImage = files.find((file) => file.mimetype.startsWith('image/'));
    const pdfFile = files.find((file) => file.mimetype === 'application/pdf');

    if (!coverImage) {
      throw new BadRequestException('Cover image is required.');
    }
    if (!pdfFile) {
      throw new BadRequestException('Book PDF is required.');
    }

    const coverImageUrl = `/uploads/cover-images/${coverImage.filename}`;
    const pdfLink = `/uploads/book-pdfs/${pdfFile.filename}`;

    return this.authorService.requestBook(
      requestBookDto,
      coverImageUrl,
      pdfLink,
      authorId,
    );
  }

  @Get(':authorId/total-copies')
  @Roles('admin', 'author')
  async getTotalCopiesDistributedPerBranch(
    @Param('authorId') authorId: string,
  ) {
    return this.authorService.getTotalCopiesDistributedPerBranch(authorId);
  }
}
