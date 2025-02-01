import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookController } from './book.controller';
import { BookService } from './book.service';
import { Book, BookSchema } from './schemas/book.schema';
import {
  BookRequest,
  BookRequestSchema,
} from '../author/schemas/bookrequest.schema';
import { Review, ReviewSchema } from '../user/schemas/review.schema';
import { Borrow, BorrowSchema } from '../user/schemas/borrow.schema';
import {
  BranchInventory,
  BranchInventorySchema,
} from '../cms/schemas/branchInventory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Book.name, schema: BookSchema }]),
    MongooseModule.forFeature([
      { name: BookRequest.name, schema: BookRequestSchema },
    ]),
    MongooseModule.forFeature([{ name: Review.name, schema: ReviewSchema }]),
    MongooseModule.forFeature([{ name: Borrow.name, schema: BorrowSchema }]),
    MongooseModule.forFeature([
      { name: BranchInventory.name, schema: BranchInventorySchema },
    ]),
  ],
  controllers: [BookController],
  providers: [BookService],
  exports: [BookService],
})
export class BookModule {}
