import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Book, BookDocument } from './schemas/book.schema';
import { UpdateBookDto } from './dtos/update-book.dto';
import {
  BookRequest,
  BookRequestDocument,
} from '../author/schemas/bookrequest.schema';
import { Review, ReviewDocument } from '../user/schemas/review.schema';
import { Borrow, BorrowDocument } from '../user/schemas/borrow.schema';
import {
  BranchInventory,
  BranchInventoryDocument,
} from '../cms/schemas/branchInventory.schema';

interface FetchBooksFilters {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
  genre?: string;
  authorId?: string;
  search?: string;
}

@Injectable()
export class BookService {
  constructor(
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>,
    @InjectModel(BookRequest.name)
    private readonly bookRequestModel: Model<BookRequestDocument>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Borrow.name)
    private readonly borrowModel: Model<BorrowDocument>,
    @InjectModel(BranchInventory.name)
    private readonly branchInventoryModel: Model<BranchInventoryDocument>,
  ) {}

  async fetchAllBooks(filters: FetchBooksFilters) {
    const { page, limit, sort, order, genre, authorId, search } = filters;

    const query: any = {};

    if (genre) {
      query.genre = genre;
    }

    if (authorId) {
      query.authorId = authorId;
    }

    if (search) {
      query.$or = [
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'title.ar': { $regex: search, $options: 'i' } },
        { isbn: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNumber = Math.max(1, page);
    const pageSize = Math.max(1, limit);
    const skip = (pageNumber - 1) * pageSize;

    const books = await this.bookModel
      .find(query)
      .skip(skip)
      .limit(pageSize)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .select('-updatedAt -coverImageUrl')
      .exec();

    const totalBooks = await this.bookModel.countDocuments(query);

    return {
      total: totalBooks,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(totalBooks / pageSize),
      data: books,
    };
  }

  async fetchBookById(id: string) {
    const book = await this.bookModel
      .findById(id)
      .select('-updatedAt -publishedDate')
      .exec();
    if (!book) {
      throw new NotFoundException('Book not found.');
    }
    return book;
  }

  async updateBook(
    bookId: string,
    updateBookDto: UpdateBookDto,
    fileUrls: { coverImageUrl?: string; pdfLink?: string },
  ) {
    const book = await this.bookModel.findById(bookId);
    if (!book) {
      throw new NotFoundException('Book not found.');
    }

    Object.assign(book, updateBookDto);

    if (fileUrls.coverImageUrl) {
      book.coverImageUrl = fileUrls.coverImageUrl;
    }
    if (fileUrls.pdfLink) {
      book.pdfLink = fileUrls.pdfLink;
    }

    return book.save();
  }

  async deleteBookById(bookId: string): Promise<boolean> {
    const bookObjectId = new Types.ObjectId(bookId); // Ensure bookId is an ObjectId

    // Step 1: Delete the book
    const book = await this.bookModel.findByIdAndDelete(bookObjectId);
    if (!book) {
      throw new NotFoundException('Book not found.');
    }

    // Step 2: Delete all book requests related to this book
    await this.bookRequestModel.deleteMany({ bookId: bookObjectId });

    // Step 3: Delete all reviews related to this book
    await this.reviewModel.deleteMany({ bookId: bookObjectId });

    // Step 4: Delete all borrow records related to this book
    await this.borrowModel.deleteMany({ bookId: bookObjectId });

    // Step 5: Delete all branch inventories related to this book
    await this.branchInventoryModel.deleteMany({ bookId: bookObjectId });

    return true; // Return success response
  }

  async getBooksPublishRate(): Promise<number> {
    const totalBooks = await this.bookModel.countDocuments();
    if (totalBooks === 0) {
      return 0; // Avoid division by zero
    }

    const publishedBooks = await this.bookModel.countDocuments({
      isPublished: true,
    });

    return (publishedBooks / totalBooks) * 100;
  }
}
