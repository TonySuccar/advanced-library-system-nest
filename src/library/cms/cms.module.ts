// src/cms/cms.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CMS, CMSSchema } from './schemas/cms.schema';
import { CMSService } from './cms.service';
import { CMSController } from './cms.controller';
import { MailerService } from 'src/common/mailer.service';
import { Author, AuthorSchema } from '../author/schemas/author.schema';
import {
  BookRequest,
  BookRequestSchema,
} from '../author/schemas/bookrequest.schema';
import { Book, BookSchema } from '../book/schemas/book.schema';
import {
  BranchInventory,
  BranchInventorySchema,
} from './schemas/branchInventory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BranchInventory.name, schema: BranchInventorySchema },
    ]),
    MongooseModule.forFeature([{ name: Book.name, schema: BookSchema }]),
    MongooseModule.forFeature([{ name: CMS.name, schema: CMSSchema }]),
    MongooseModule.forFeature([{ name: Author.name, schema: AuthorSchema }]),
    MongooseModule.forFeature([
      { name: BookRequest.name, schema: BookRequestSchema },
    ]),
  ],
  controllers: [CMSController],
  providers: [CMSService, MailerService],
  exports: [CMSService],
})
export class CMSModule {}
