import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Book, BookDocument } from 'src/library/book/schemas/book.schema';
import { Borrow, BorrowDocument } from 'src/library/user/schemas/borrow.schema';
import {
  Author,
  AuthorDocument,
} from 'src/library/author/schemas/author.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>,
    @InjectModel(Borrow.name)
    private readonly borrowModel: Model<BorrowDocument>,
    @InjectModel(Author.name)
    private readonly authorModel: Model<AuthorDocument>,
  ) {}

  async getDashboardInsights(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const totalBooksPromise = this.bookModel.countDocuments();

    const totalOverdueBooksPromise = this.borrowModel.countDocuments({
      isOverdue: true,
    });

    const mostPopularAuthorsPromise = this.borrowModel.aggregate([
      {
        $lookup: {
          from: 'books',
          localField: 'bookId',
          foreignField: '_id',
          as: 'book',
        },
      },
      { $unwind: '$book' },
      {
        $lookup: {
          from: 'authors',
          localField: 'book.authorId',
          foreignField: '_id',
          as: 'author',
        },
      },
      { $unwind: '$author' },
      {
        $group: {
          _id: '$author._id',
          name: { $first: '$author.name' },
          borrowCount: { $sum: 1 },
        },
      },
      { $sort: { borrowCount: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const totalAuthorsCountPromise = this.borrowModel.aggregate([
      {
        $lookup: {
          from: 'books',
          localField: 'bookId',
          foreignField: '_id',
          as: 'book',
        },
      },
      { $unwind: '$book' },
      {
        $lookup: {
          from: 'authors',
          localField: 'book.authorId',
          foreignField: '_id',
          as: 'author',
        },
      },
      { $unwind: '$author' },
      {
        $group: {
          _id: '$author._id',
        },
      },
      { $count: 'total' },
    ]);

    const mostPopularBooksPromise = this.borrowModel.aggregate([
      {
        $lookup: {
          from: 'books',
          localField: 'bookId',
          foreignField: '_id',
          as: 'book',
        },
      },
      { $unwind: '$book' },
      {
        $group: {
          _id: '$book._id',
          title: { $first: '$book.title' },
          borrowCount: { $sum: 1 },
        },
      },
      { $sort: { borrowCount: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const totalBooksCountPromise = this.borrowModel.aggregate([
      {
        $lookup: {
          from: 'books',
          localField: 'bookId',
          foreignField: '_id',
          as: 'book',
        },
      },
      { $unwind: '$book' },
      {
        $group: {
          _id: '$book._id',
        },
      },
      { $count: 'total' },
    ]);

    const [
      totalBooks,
      totalOverdueBooks,
      mostPopularAuthors,
      totalAuthorsCount,
      mostPopularBooks,
      totalBooksCount,
    ] = await Promise.all([
      totalBooksPromise,
      totalOverdueBooksPromise,
      mostPopularAuthorsPromise,
      totalAuthorsCountPromise,
      mostPopularBooksPromise,
      totalBooksCountPromise,
    ]);

    return {
      totalBooks,
      totalOverdueBooks,
      authors: {
        total: totalAuthorsCount[0]?.total || 0,
        data: mostPopularAuthors,
      },
      books: {
        total: totalBooksCount[0]?.total || 0,
        data: mostPopularBooks,
      },
    };
  }
  async getBranchAnalytics(
    branchId: string,
    timeFilter: 'day' | 'month',
    startDate?: Date,
    endDate?: Date,
  ) {
    const matchStage: any = {
      branchId,
    };

    if (startDate) {
      matchStage.borrowedAt = { $gte: startDate };
    }

    if (endDate) {
      matchStage.borrowedAt = {
        ...(matchStage.borrowedAt || {}),
        $lte: endDate,
      };
    }

    const mostPopularAuthors = await this.borrowModel.aggregate([
      {
        $match: matchStage,
      },
      {
        $lookup: {
          from: 'books',
          localField: 'bookId',
          foreignField: '_id',
          as: 'book',
        },
      },
      { $unwind: '$book' },
      {
        $lookup: {
          from: 'authors',
          localField: 'book.authorId',
          foreignField: '_id',
          as: 'author',
        },
      },
      { $unwind: '$author' },
      {
        $group: {
          _id: '$author._id',
          name: { $first: '$author.name' },
          borrowCount: { $sum: 1 },
        },
      },
      { $sort: { borrowCount: -1 } },
      { $limit: 5 },
    ]);

    const dateFormat =
      timeFilter === 'month'
        ? { $dateToString: { format: '%Y-%m', date: '$borrowedAt' } }
        : { $dateToString: { format: '%Y-%m-%d', date: '$borrowedAt' } };

    const borrowedBooksOverTime = await this.borrowModel.aggregate([
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: dateFormat,
          numberOfBooks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      mostPopularAuthors,
      borrowedBooksOverTime: borrowedBooksOverTime.map((entry) => ({
        date: entry._id,
        numberOfBooks: entry.numberOfBooks,
      })),
    };
  }
}
