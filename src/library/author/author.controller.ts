import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
import { RequestBookDto } from './dtos/request-book.dto';
import { AuthorService } from './author.service';
import { AuthenticatedRequest } from 'src/types/auth.types';
import { FileUploadInterceptor } from 'src/common/file-upload.interceptor';
import { Headers } from '@nestjs/common';

@Controller('author')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthorController {
  constructor(private readonly authorService: AuthorService) {}

  @Post('request-book')
  @Roles('author')
  @UseInterceptors(FileUploadInterceptor.addTwoFiles('files', './uploads'))
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

  @Delete(':id')
  @Roles('admin')
  async deleteAuthor(@Param('id') id: string) {
    const result = await this.authorService.deleteAuthor(id);
    if (!result) {
      throw new NotFoundException('Author not found or already deleted.');
    }
    return {
      message: 'Author deleted successfully.',
    };
  }

  @Get('profile/:id')
  @Roles('admin', 'member', 'author')
  async getAuthorProfileById(
    @Param('id') authorId: string,
    @Headers('accept-language') acceptLanguage: string,
  ) {
    const profile = await this.authorService.getAuthorProfileById(
      authorId,
      acceptLanguage,
    );

    if (!profile) {
      throw new NotFoundException('Author not found.');
    }

    return profile;
  }
}
