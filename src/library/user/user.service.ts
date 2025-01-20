import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Borrow, BorrowDocument } from './schemas/borrow.schema';
import {
  BranchInventory,
  BranchInventoryDocument,
} from '../cms/schemas/branchInventory.schema';
import { Book, BookDocument } from '../book/schemas/book.schema';
import { Review, ReviewDocument } from './schemas/review.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Book.name) private bookModel: Model<BookDocument>,
    @InjectModel(BranchInventory.name)
    private branchInventoryModel: Model<BranchInventoryDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Borrow.name) private borrowModel: Model<BorrowDocument>, // Inject User model
  ) {}

  async getUserById(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId).select('-password'); // Exclude password
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async borrowBook(branchInventoryId: string, memberId: string) {
    const member = await this.userModel.findById(memberId);
    if (!member) {
      throw new NotFoundException('Member not found.');
    }

    if (member.returnRate < 30) {
      throw new ForbiddenException(
        'Your return rate is below 30%. Borrowing is not allowed.',
      );
    }

    const branchInventory = await this.branchInventoryModel.aggregate([
      {
        $match: { _id: new Types.ObjectId(branchInventoryId) },
      },
      {
        $lookup: {
          from: 'books',
          localField: 'bookId',
          foreignField: '_id',
          as: 'bookDetails',
        },
      },
      {
        $unwind: '$bookDetails',
      },
    ]);

    if (!branchInventory || branchInventory.length === 0) {
      throw new NotFoundException('Branch inventory not found.');
    }

    const inventory = branchInventory[0];
    const book = inventory.bookDetails;

    if (inventory.availableCopies <= 0) {
      throw new BadRequestException('No available copies to borrow.');
    }

    if (member.age < book.minAge) {
      throw new ForbiddenException(
        `You must be at least ${book.minAge} years old to borrow this book.`,
      );
    }

    const borrowedAt = new Date();
    const returnBy = new Date();
    returnBy.setDate(borrowedAt.getDate() + inventory.borrowableDays);

    const borrowRecord = new this.borrowModel({
      memberId,
      bookId: book._id,
      branchId: inventory.branchId.toString(),
      borrowedAt,
      returnBy,
    });
    await borrowRecord.save();

    await this.branchInventoryModel.findByIdAndUpdate(branchInventoryId, {
      $inc: { availableCopies: -1 },
    });

    return {
      message: 'Book borrowed successfully!',
      borrowRecord,
    };
  }

  async handleOverdueBooks(): Promise<void> {
    const overdueBooks = await this.borrowModel.find({
      isOverdue: false,
      returnedAt: null,
      returnBy: { $lt: new Date() },
    });

    for (const borrow of overdueBooks) {
      borrow.isOverdue = true;
      await borrow.save();

      const member = await this.userModel.findById(borrow.memberId);
      if (member) {
        const totalBorrows = await this.borrowModel.countDocuments({
          memberId: member._id,
        });
        const overdueCount = await this.borrowModel.countDocuments({
          memberId: member._id,
          isOverdue: true,
        });

        const newReturnRate = Math.max(
          0,
          100 - (overdueCount / totalBorrows) * 100,
        );
        member.returnRate = newReturnRate;
        await member.save();
      }
    }
  }

  async returnBook(borrowId: string, feedback: string): Promise<Borrow> {
    const borrow = await this.borrowModel.findById(borrowId);
    if (!borrow) {
      throw new NotFoundException('Borrow record not found.');
    }

    if (borrow.returnedAt) {
      throw new BadRequestException('Book has already been returned.');
    }

    const returnedAt = new Date();
    borrow.returnedAt = returnedAt;
    borrow.feedback = feedback;

    if (returnedAt > borrow.returnBy) {
      borrow.isOverdue = true;
    }

    await borrow.save();

    await this.branchInventoryModel.findByIdAndUpdate(borrow.branchId, {
      $inc: { availableCopies: 1 },
    });

    return borrow;
  }

  async addReview(
    bookId: string,
    memberId: string,
    review: string,
    rating: number,
  ): Promise<Review> {
    const book = await this.bookModel.findById(bookId);
    if (!book) {
      throw new NotFoundException('Book not found.');
    }

    const user = await this.userModel.findById(memberId);
    if (!user) {
      throw new NotFoundException('Member not found.');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5.');
    }

    const existingReview = await this.reviewModel.findOne({
      bookId: new Types.ObjectId(bookId),
      memberId: new Types.ObjectId(memberId),
    });
    if (existingReview) {
      throw new BadRequestException('You have already reviewed this book.');
    }

    const newReview = new this.reviewModel({
      bookId: new Types.ObjectId(bookId),
      memberId: new Types.ObjectId(memberId),
      review,
      rating,
      likes: 0,
    });

    return newReview.save();
  }

  async toggleLike(reviewId: string, userId: string) {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new BadRequestException('Invalid review ID.');
    }

    const review = await this.reviewModel.findById(reviewId);

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    const userObjectId = new Types.ObjectId(userId);

    const userIndex = review.likedBy.findIndex(
      (id) => id.toString() === userObjectId.toString(),
    );

    if (userIndex === -1) {
      review.likedBy.push(userObjectId);
      review.likes += 1;

      await review.save();
      return {
        message: 'Review liked successfully.',
        likes: review.likes,
      };
    } else {
      review.likedBy.splice(userIndex, 1);
      review.likes -= 1;

      await review.save();
      return {
        message: 'Review unliked successfully.',
        likes: review.likes,
      };
    }
  }
}
