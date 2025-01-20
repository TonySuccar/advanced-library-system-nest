import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BookRequest, BookRequestDocument } from './schemas/bookrequest.schema';
import { Model, Types } from 'mongoose';
import { MailerService } from 'src/common/mailer.service';
import { RequestBookDto } from './dtos/request-book.dto';
import { Author, AuthorDocument } from './schemas/author.schema';
import {
  BranchInventory,
  BranchInventoryDocument,
} from '../cms/schemas/branchInventory.schema';

@Injectable()
export class AuthorService {
  constructor(
    @InjectModel(BranchInventory.name)
    private readonly branchInventoryModel: Model<BranchInventoryDocument>,
    @InjectModel(Author.name)
    private readonly authorModel: Model<AuthorDocument>,
    @InjectModel(BookRequest.name)
    private readonly bookRequestModel: Model<BookRequestDocument>,
    private readonly mailerService: MailerService,
  ) {}

  async requestBook(
    requestBookDto: RequestBookDto,
    coverImageUrl: string,
    pdfLink: string,
    authorId: string,
  ) {
    const { isbn, title } = requestBookDto;

    const existingRequest = await this.bookRequestModel.findOne({ isbn });
    if (existingRequest) {
      throw new BadRequestException(
        'A book request with this ISBN already exists.',
      );
    }

    const newRequest = new this.bookRequestModel({
      ...requestBookDto,
      coverImageUrl,
      pdfLink,
      authorId,
      status: 'pending',
      requestTime: new Date(),
    });

    const savedRequest = await newRequest.save();

    const updatedAuthor = await this.authorModel.findByIdAndUpdate(
      authorId,
      {
        $push: { bookRequestIds: savedRequest._id },
      },
      { new: true },
    );

    if (!updatedAuthor) {
      throw new BadRequestException('Author not found.');
    }

    const subject = `New Book Request: ${title.en}`;
    const text = `A new book request has been submitted for approval. ISBN: ${isbn}.`;
    const html = `<p>A new book request has been submitted for approval. <strong>ISBN:</strong> ${isbn}.</p>`;

    await this.mailerService.sendEmail(
      process.env.CMS_EMAIL || 'admin@admin.com',
      subject,
      text,
      html,
    );

    return savedRequest;
  }

  async getTotalCopiesDistributedPerBranch(authorId: string) {
    const validAuthorId = new Types.ObjectId(authorId);

    const results = await this.branchInventoryModel.aggregate([
      {
        $lookup: {
          from: 'books',
          localField: 'bookId',
          foreignField: '_id',
          as: 'bookDetails',
        },
      },

      { $unwind: '$bookDetails' },

      {
        $match: {
          'bookDetails.authorId': validAuthorId,
        },
      },

      {
        $group: {
          _id: '$branchId',
          totalCopies: { $sum: '$totalCopies' },
        },
      },

      {
        $lookup: {
          from: 'branches',
          localField: '_id',
          foreignField: '_id',
          as: 'branchDetails',
        },
      },

      {
        $project: {
          branchId: '$_id',
          totalCopies: 1,
          branchName: { $arrayElemAt: ['$branchDetails.branchName', 0] },
          _id: 0,
        },
      },
    ]);

    if (!results || results.length === 0) {
      throw new NotFoundException(
        'No distributed books found for this author.',
      );
    }

    return results;
  }

  async deleteAuthor(authorId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(authorId)) {
      throw new NotFoundException('Invalid author ID.');
    }

    const author = await this.authorModel.findById(authorId);
    if (!author) {
      throw new NotFoundException('Author not found.');
    }

    const result = await this.authorModel.findByIdAndDelete(authorId);

    return result !== null;
  }

  async getAuthorProfileById(authorId: string, language: string) {
    // Fetch the author from the database
    const author = await this.authorModel
      .findById(authorId)
      .select('-password -updatedAt -averageApprovalTime -bookRequestIds') // Exclude sensitive/unnecessary fields
      .exec();

    // Throw an exception if the author is not found
    if (!author) {
      throw new NotFoundException('Author not found.');
    }

    // Validate the language and default to 'en' if invalid
    const selectedLanguage = ['en', 'ar'].includes(language) ? language : 'en';

    // Return only the requested language fields
    return {
      _id: author._id,
      name: author.name[selectedLanguage],
      biography: author.biography[selectedLanguage],
      profileImageUrl: author.profileImageUrl,
      birthDate: author.birthDate,
      role: author.role,
    };
  }
}
