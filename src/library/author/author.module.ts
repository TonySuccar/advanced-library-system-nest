import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthorController } from './author.controller';
import { AuthorService } from './author.service';
import { BookRequest, BookRequestSchema } from './schemas/bookrequest.schema';
import { MailerService } from 'src/common/mailer.service';
import { Author, AuthorSchema } from './schemas/author.schema';
import {
  BranchInventory,
  BranchInventorySchema,
} from '../cms/schemas/branchInventory.schema';
import { BookService } from '../book/book.service';
import { Book, BookSchema } from '../book/schemas/book.schema';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BookRequest.name, schema: BookRequestSchema },
      { name: Author.name, schema: AuthorSchema },
      { name: BranchInventory.name, schema: BranchInventorySchema },
      { name: Book.name, schema: BookSchema },
    ]),
    UserModule,
  ],
  controllers: [AuthorController],
  providers: [AuthorService, MailerService, BookService],
})
export class AuthorModule {}
