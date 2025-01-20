import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { BookService } from './book.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { FileUploadInterceptor } from 'src/common/file-upload.interceptor';
import { UpdateBookDto } from './dtos/update-book.dto';

@Controller('books')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Get()
  @Roles('member', 'admin')
  async getBooks(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sort') sort: string = 'createdAt',
    @Query('order') order: 'asc' | 'desc' = 'desc',
    @Query('genre') genre?: string,
    @Query('authorId') authorId?: string,
    @Query('search') search?: string,
  ) {
    return this.bookService.fetchAllBooks({
      page,
      limit,
      sort,
      order,
      genre,
      authorId,
      search,
    });
  }

  @Get('books-publish-rate')
  async getBooksPublishRate() {
    const rate = await this.bookService.getBooksPublishRate();
    return {
      message: 'Books publish rate retrieved successfully.',
      booksPublishRate: `${rate.toFixed(2)}%`, // Round to 2 decimal places
    };
  }

  @Get(':id')
  @Roles('admin', 'member')
  async getBookById(@Param('id') id: string) {
    return this.bookService.fetchBookById(id);
  }

  @Patch(':id')
  @Roles('admin')
  @UseInterceptors(FileUploadInterceptor.addTwoFiles('files', './uploads'))
  async updateBook(
    @Param('id') bookId: string,
    @Body() updateBookDto: UpdateBookDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const coverImage = files.find((file) => file.mimetype.startsWith('image/'));
    const pdfFile = files.find((file) => file.mimetype === 'application/pdf');

    const coverImageUrl = coverImage
      ? `/uploads/cover-images/${coverImage.filename}`
      : null;
    const pdfLink = pdfFile ? `/uploads/book-pdfs/${pdfFile.filename}` : null;

    return this.bookService.updateBook(bookId, updateBookDto, {
      coverImageUrl,
      pdfLink,
    });
  }

  @Delete(':id')
  @Roles('admin') // Restrict access to admins only
  async deleteBook(@Param('id') id: string) {
    const deleted = await this.bookService.deleteBookById(id);
    if (!deleted) {
      throw new NotFoundException(`Book with ID ${id} not found.`);
    }
    return {
      message: `Book deleted successfully.`,
    };
  }
}
