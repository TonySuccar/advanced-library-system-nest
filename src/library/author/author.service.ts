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
import { Book, BookDocument } from '../book/schemas/book.schema';
import { Review, ReviewDocument } from '../user/schemas/review.schema';
import { Borrow, BorrowDocument } from '../user/schemas/borrow.schema';
import { User, UserDocument } from '../user/schemas/user.schema';

@Injectable()
export class AuthorService {
  constructor(
    @InjectModel(BranchInventory.name)
    private readonly branchInventoryModel: Model<BranchInventoryDocument>,
    @InjectModel(Author.name)
    private readonly authorModel: Model<AuthorDocument>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Borrow.name)
    private readonly borrowModel: Model<BorrowDocument>,
    @InjectModel(BookRequest.name)
    private readonly bookRequestModel: Model<BookRequestDocument>,
    @InjectModel(Book.name)
    private readonly bookModel: Model<BookDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
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
    // 1️⃣ Ensure `authorId` is a valid ObjectId
    if (!Types.ObjectId.isValid(authorId)) {
      throw new BadRequestException('Invalid author ID.');
    }
    const authorObjectId = new Types.ObjectId(authorId);

    // 2️⃣ Check if the author exists
    const author = await this.authorModel.findById(authorObjectId);
    if (!author) {
      throw new NotFoundException('Author not found.');
    }

    // 3️⃣ Delete related book requests
    await this.bookRequestModel.deleteMany({ authorId: authorObjectId });

    // 4️⃣ Find all books written by this author
    const books = await this.bookModel.find({ authorId: authorObjectId });

    if (books.length > 0) {
      const bookIds = books
        .map((book) =>
          book._id instanceof Types.ObjectId
            ? book._id
            : new Types.ObjectId(book._id.toString()),
        ) // ✅ Fix: Ensure _id is ObjectId
        .filter((id) => Types.ObjectId.isValid(id.toString())); // ✅ Convert to string before checking validity

      // 5️⃣ Find all reviews and borrows related to these books
      const reviewIds = await this.reviewModel
        .find({ bookId: { $in: bookIds } })
        .distinct('_id');
      const borrowIds = await this.borrowModel
        .find({ bookId: { $in: bookIds } })
        .distinct('_id');

      const reviewObjectIds = reviewIds
        .map((id) =>
          id instanceof Types.ObjectId ? id : new Types.ObjectId(id.toString()),
        ) // ✅ Fix: Convert to ObjectId
        .filter((id) => Types.ObjectId.isValid(id.toString())); // ✅ Convert to string before checking validity

      const borrowObjectIds = borrowIds
        .map((id) =>
          id instanceof Types.ObjectId ? id : new Types.ObjectId(id.toString()),
        ) // ✅ Fix: Convert to ObjectId
        .filter((id) => Types.ObjectId.isValid(id.toString())); // ✅ Convert to string before checking validity

      // 6️⃣ Remove reviews & borrows from user records
      await Promise.all([
        this.userModel.updateMany(
          { likedReviews: { $in: reviewObjectIds } },
          { $pull: { likedReviews: { $in: reviewObjectIds } } },
        ),
        this.userModel.updateMany(
          { borrowHistory: { $in: borrowObjectIds } },
          { $pull: { borrowHistory: { $in: borrowObjectIds } } },
        ),
      ]);

      // 7️⃣ Delete related records
      await Promise.all([
        this.reviewModel.deleteMany({ bookId: { $in: bookIds } }), // Delete reviews
        this.borrowModel.deleteMany({ bookId: { $in: bookIds } }), // Delete borrow records
        this.branchInventoryModel.deleteMany({ bookId: { $in: bookIds } }), // Remove from branch inventory
        this.bookModel.deleteMany({ authorId: authorObjectId }), // Delete books last
      ]);
    }

    // 8️⃣ Finally, delete the author
    await this.authorModel.findByIdAndDelete(authorObjectId);

    return true; // Return success
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
