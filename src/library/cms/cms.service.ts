// src/cms/cms.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { CMS, CMSDocument } from './schemas/cms.schema';
import { Author, AuthorDocument } from '../author/schemas/author.schema';
import { MailerService } from 'src/common/mailer.service';
import * as bcrypt from 'bcryptjs';
import { CreateAuthorDto } from './dtos/create-author.dto';
import { changeAuthorpassDto } from './dtos/change-password.dto';
import {
  BookRequest,
  BookRequestDocument,
} from '../author/schemas/bookrequest.schema';
import { Book, BookDocument } from '../book/schemas/book.schema';
import { DistributeBooksDto } from './dtos/distribute-books.dto';
import {
  BranchInventory,
  BranchInventoryDocument,
} from './schemas/branchInventory.schema';

@Injectable()
export class CMSService {
  constructor(
    @InjectModel(BranchInventory.name)
    private readonly branchInventoryModel: Model<BranchInventoryDocument>,
    @InjectModel(Book.name)
    private readonly bookModel: Model<BookDocument>,
    @InjectModel(BookRequest.name)
    private readonly bookRequestModel: Model<BookRequestDocument>,
    @InjectModel(Author.name)
    private readonly authorModel: Model<AuthorDocument>,
    @InjectModel(CMS.name)
    private readonly cmsUserModel: Model<CMSDocument>,
    private readonly mailerService: MailerService,
  ) {}

  async createCMSUser(
    email: string,
    password: string,
    role: string,
    name: string,
  ) {
    const existingUser = await this.cmsUserModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('Email already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new this.cmsUserModel({
      email,
      password: hashedPassword,
      role,
      name,
    });
    const subject = 'Your New Account';
    const text = `Dear ${name}, your ${role} account has been created. You can now log in using email: ${email}, and password: ${password}.`;
    const html = `<p>Dear ${name}, your ${role} account has been created. You can now log in using email: ${email}, and password: ${password}.</strong></p>`;

    await this.mailerService.sendEmail(email, subject, text, html);

    return newUser.save();
  }

  async createAuthor(
    createAuthorDto: CreateAuthorDto,
    profileImageUrl: string,
  ) {
    const { name, email, password, biography, birthDate } = createAuthorDto;

    const existingAuthor = await this.authorModel.findOne({ email });
    if (existingAuthor) {
      throw new BadRequestException('Author with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAuthor = new this.authorModel({
      name,
      email,
      password: hashedPassword,
      biography,
      profileImageUrl,
      birthDate,
      bookRequestIds: [],
      averageApprovalTime: 0,
      role: 'author',
    });

    const subject = 'Your New Account';
    const text = `Dear ${name}, your Author account has been created. You can now log in using email: ${email}, and password: ${password}.`;
    const html = `<p>Dear ${name}, your account Author has been created. You can now log in using email: ${email}, and password: ${password}.</strong></p>`;

    await this.mailerService.sendEmail(email, subject, text, html);

    return newAuthor.save();
  }
  async changeAuthorPass(changePassDto: changeAuthorpassDto) {
    const { email, password } = changePassDto;

    const existingAuthor = await this.authorModel.findOne({ email });
    if (!existingAuthor) {
      throw new BadRequestException('Author not found.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    existingAuthor.password = hashedPassword;

    await existingAuthor.save();

    const subject = 'Your New Password';
    const text = `Your Author account has been created. You can now log in using email: ${email}, and password: ${password}.`;
    const html = `<p>Your account Author has been created. You can now log in using email: ${email}, and password: ${password}.</strong></p>`;

    await this.mailerService.sendEmail(email, subject, text, html);

    return {
      message: 'Password updated successfully.',
      author: {
        email: existingAuthor.email,
        name: existingAuthor.name,
      },
    };
  }

  async getAllRequests(filters: { page: number; limit: number }) {
    const { page, limit } = filters;

    const query = { status: 'pending' };

    const pageNumber = Math.max(1, parseInt(page as any, 10) || 1);
    const limitNumber = Math.max(1, parseInt(limit as any, 10) || 10);

    const skip = (pageNumber - 1) * limitNumber;

    const requests = await this.bookRequestModel
      .find(query)
      .skip(skip)
      .limit(limitNumber)
      .sort({ createdAt: -1 })
      .exec();

    const total = await this.bookRequestModel.countDocuments(query);

    return {
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      data: requests,
    };
  }

  async acceptBookRequest(requestId: string) {
    const bookRequest = await this.bookRequestModel.findById(requestId);

    if (!bookRequest) {
      throw new NotFoundException('Book request not found.');
    }

    if (bookRequest.status !== 'pending') {
      throw new BadRequestException('Book request has already been processed.');
    }

    bookRequest.status = 'accepted';
    bookRequest.responseTime = new Date();
    const approvalTime =
      (bookRequest.responseTime.getTime() - bookRequest.requestTime.getTime()) /
      1000;
    bookRequest.approvalTime = approvalTime;

    await bookRequest.save();

    const newBook = new this.bookModel({
      title: bookRequest.title,
      isbn: bookRequest.isbn,
      genre: bookRequest.genre,
      description: bookRequest.description,
      isOpenToReviews: bookRequest.isOpenToReviews,
      minAge: bookRequest.minAge,
      coverImageUrl: bookRequest.coverImageUrl,
      publishedDate: bookRequest.publishedDate,
      pdfLink: bookRequest.pdfLink,
      authorId: bookRequest.authorId,
      isPublished: true,
    });

    await newBook.save();

    const authorId = bookRequest.authorId;

    const author = await this.authorModel.findById(authorId);
    if (!author) {
      throw new NotFoundException('Author not found.');
    }

    const aggregatedData = await this.bookRequestModel.aggregate([
      {
        $match: {
          authorId: authorId,
          status: 'accepted',
        },
      },
      {
        $group: {
          _id: '$authorId',
          averageApprovalTime: { $avg: '$approvalTime' },
        },
      },
    ]);

    const averageApprovalTime = aggregatedData[0]?.averageApprovalTime || 0;
    author.averageApprovalTime = averageApprovalTime;

    await author.save();

    return {
      message: 'Book request accepted successfully.',
      bookRequest: bookRequest,
      book: newBook,
      author: {
        id: author._id,
        averageApprovalTime: author.averageApprovalTime,
      },
    };
  }

  async rejectBookRequestById(requestId: string) {
    const bookRequest = await this.bookRequestModel.findById(requestId);
    if (!bookRequest) {
      throw new NotFoundException(
        `Book request with ID ${requestId} not found.`,
      );
    }
    if (bookRequest.status !== 'pending') {
      throw new BadRequestException('Book request has already been processed.');
    }

    bookRequest.status = 'rejected';
    bookRequest.responseTime = new Date();

    return bookRequest.save();
  }

  async distributeBooks(distributeBooksDto: DistributeBooksDto) {
    const { branchId, bookId, totalCopies } = distributeBooksDto;

    const existingInventory = await this.branchInventoryModel.findOne({
      branchId: branchId,
      bookId: bookId,
    });

    if (existingInventory) {
      existingInventory.totalCopies = totalCopies;
      existingInventory.availableCopies = totalCopies;
      return existingInventory.save();
    }

    const newInventory = new this.branchInventoryModel({
      branchId: new mongoose.Types.ObjectId(branchId),
      bookId: new mongoose.Types.ObjectId(bookId),
      totalCopies,
      availableCopies: totalCopies,
    });

    return newInventory.save();
  }
}
