import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from './schemas/user.schema';
import { Book, BookSchema } from '../book/schemas/book.schema';
import {
  BranchInventory,
  BranchInventorySchema,
} from '../cms/schemas/branchInventory.schema';
import { Borrow, BorrowSchema } from './schemas/borrow.schema';
import { TaskService } from './task.service';
import { Review, ReviewSchema } from './schemas/review.schema';
import { MailerService } from 'src/common/mailer.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: User.name, schema: UserSchema },
      { name: Book.name, schema: BookSchema },
      { name: BranchInventory.name, schema: BranchInventorySchema },
      { name: Borrow.name, schema: BorrowSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, TaskService, MailerService],
  exports: [UserService, MongooseModule],
})
export class UserModule {}
