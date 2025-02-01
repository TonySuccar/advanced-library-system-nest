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
import { UpdateMemberDto } from './dtos/update-member.dto';
import * as bcrypt from 'bcryptjs';
import { MailerService } from 'src/common/mailer.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Book.name) private bookModel: Model<BookDocument>,
    private readonly mailerService: MailerService,
    @InjectModel(BranchInventory.name)
    private branchInventoryModel: Model<BranchInventoryDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Borrow.name) private borrowModel: Model<BorrowDocument>,
  ) {}

  async getUserById(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId).select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async borrowBook(branchInventoryId: string, memberId: string) {
    // Convert `branchInventoryId` and `memberId` to `ObjectId`
    let inventoryObjectId: Types.ObjectId;
    let memberObjectId: Types.ObjectId;

    try {
      inventoryObjectId = new Types.ObjectId(branchInventoryId);
      memberObjectId = new Types.ObjectId(memberId);
    } catch (error) {
      throw new BadRequestException('Invalid ID format.', error);
    }

    // Validate member existence
    const member = await this.userModel.findById(memberObjectId);
    if (!member) {
      throw new NotFoundException('Member not found.');
    }

    // Check if the member's return rate is greater than 30%
    if (member.returnRate < 30) {
      throw new ForbiddenException(
        'Your return rate is below 30%. Borrowing is not allowed.',
      );
    }

    // Fetch branch inventory and book details using aggregation
    const branchInventory = await this.branchInventoryModel.aggregate([
      { $match: { _id: inventoryObjectId } },
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
        $lookup: {
          from: 'authors',
          localField: 'bookDetails.authorId',
          foreignField: '_id',
          as: 'authorDetails',
        },
      },
      { $unwind: '$authorDetails' },
    ]);

    // Check if the branch inventory exists
    if (!branchInventory || branchInventory.length === 0) {
      throw new NotFoundException('Branch inventory not found.');
    }

    const inventory = branchInventory[0];
    const book = inventory.bookDetails;
    const author = inventory.authorDetails;

    // Check if there are available copies
    if (inventory.availableCopies <= 0) {
      throw new BadRequestException('No available copies to borrow.');
    }

    // Check if the member's age meets the book's minimum age requirement
    if (member.age < book.minAge) {
      throw new ForbiddenException(
        `You must be at least ${book.minAge} years old to borrow this book.`,
      );
    }

    // Calculate return date based on borrowable days
    const borrowedAt = new Date();
    const returnBy = new Date();
    returnBy.setDate(borrowedAt.getDate() + inventory.borrowableDays);

    // Create a new borrow record
    const borrowRecord = new this.borrowModel({
      memberId: memberObjectId,
      bookId: book._id,
      branchId: inventory.branchId,
      borrowedAt,
      returnBy,
    });

    const savedBorrow = await borrowRecord.save();

    // Update branch inventory to decrement available copies
    await this.branchInventoryModel.findByIdAndUpdate(inventoryObjectId, {
      $inc: { availableCopies: -1 },
    });

    // Add borrow record ID to the member's borrow history array
    await this.userModel.findByIdAndUpdate(memberObjectId, {
      $push: { borrowHistory: savedBorrow._id },
    });

    // Notify the author via email
    const subject = `Your Book Has Been Borrowed: ${book.title.en}`;
    const text = `Dear ${author.name.en}, 
  
  Your book titled "${book.title.en}" has been borrowed by a member. 
  
  Best regards, 
  Your Library Team`;

    const html = `
      <p>Dear <strong>${author.name.en}</strong>,</p>
      <p>Your book titled "<strong>${book.title.en}</strong>" has been borrowed by a member.</p>
      <p>Best regards,</p>
      <p>Your Library Team</p>
    `;

    await this.mailerService.sendEmail(author.email, subject, text, html);

    return {
      message: 'Book borrowed successfully! The author has been notified.',
      borrowRecord: savedBorrow,
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

  async getAverageMembersReturnRate(): Promise<number> {
    const members = await this.userModel
      .find({ role: 'member' })
      .select('returnRate');
    if (members.length === 0) {
      return 0;
    }

    const totalReturnRate = members.reduce(
      (sum, member) => sum + member.returnRate,
      0,
    );
    return totalReturnRate / members.length;
  }

  async updateMember(memberId: string, updateMemberDto: UpdateMemberDto) {
    const objectIdMemberId = new Types.ObjectId(memberId);

    const member = await this.userModel.findOne({ _id: objectIdMemberId });
    if (!member) {
      throw new NotFoundException('Member not found.');
    }

    if (updateMemberDto.password) {
      updateMemberDto.password = await bcrypt.hash(
        updateMemberDto.password,
        10,
      );
    }

    Object.assign(member, updateMemberDto);

    return member.save();
  }

  async deleteMember(memberId: string): Promise<{ message: string }> {
    // 1️⃣ Validate `memberId`
    if (!Types.ObjectId.isValid(memberId)) {
      throw new BadRequestException('Invalid Member ID.');
    }
    const memberObjectId = new Types.ObjectId(memberId);

    // 2️⃣ Check if the member exists
    const member = await this.userModel.findById(memberObjectId);
    if (!member) {
      throw new NotFoundException('Member not found.');
    }

    // 3️⃣ Delete all related borrow & review records
    await Promise.all([
      this.borrowModel.deleteMany({ memberId: memberObjectId }), // Delete borrow records
      this.reviewModel.deleteMany({ memberId: memberObjectId }), // Delete reviews
    ]);

    // 4️⃣ Remove deleted reviews from other users' likedReviews
    await this.userModel.updateMany(
      { likedReviews: memberObjectId },
      { $pull: { likedReviews: memberObjectId } },
    );

    // 5️⃣ Finally, delete the member
    await this.userModel.findByIdAndDelete(memberObjectId);

    return {
      message: 'Member deleted successfully, along with related records.',
    };
  }

  async getMembers(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    data: Array<{
      name: string;
      memberId: string;
      email: string;
      numberOfBorrowedBooks: number;
      returnRate: number;
    }>;
  }> {
    // Validate pagination inputs
    const pageNumber = Math.max(1, page); // Ensure page is at least 1
    const limitNumber = Math.max(1, limit); // Ensure limit is at least 1
    const skip = (pageNumber - 1) * limitNumber;

    // Build search filter
    const searchFilter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } }, // Case-insensitive search for name
            { memberId: { $regex: search, $options: 'i' } }, // Case-insensitive search for memberId
            { email: { $regex: search, $options: 'i' } }, // Case-insensitive search for email
          ],
        }
      : {};

    // Query to fetch paginated and sorted results
    const members = await this.userModel
      .find(searchFilter)
      .sort({ returnRate: -1 }) // Sort by return rate descending
      .skip(skip)
      .limit(limitNumber)
      .select('name memberId email returnRate borrowHistory') // Return only specific fields
      .lean();

    // Transform data to include the number of borrowed books
    const data = members.map((member) => ({
      name: member.name,
      memberId: member.memberId,
      email: member.email,
      numberOfBorrowedBooks: member.borrowHistory.length,
      returnRate: member.returnRate,
    }));

    // Total number of members
    const total = await this.userModel.countDocuments(searchFilter);

    return {
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      data,
    };
  }
}
