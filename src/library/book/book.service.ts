import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Book, BookDocument } from './schemas/book.schema';

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
}
