import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BookService } from './book.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

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

  @Get(':id')
  @Roles('admin', 'member')
  async getBookById(@Param('id') id: string) {
    return this.bookService.fetchBookById(id);
  }
}
