import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Book, BookSchema } from 'src/library/book/schemas/book.schema';
import { Borrow, BorrowSchema } from 'src/library/user/schemas/borrow.schema';
import { Author, AuthorSchema } from 'src/library/author/schemas/author.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Book.name, schema: BookSchema },
      { name: Borrow.name, schema: BorrowSchema },
      { name: Author.name, schema: AuthorSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
