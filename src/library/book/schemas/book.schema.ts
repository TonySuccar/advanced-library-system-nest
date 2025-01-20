import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookDocument = Book & Document;

@Schema({ timestamps: true })
export class Book {
  @Prop({ required: true, type: Object })
  title: { en: string; ar: string };

  @Prop({ required: true, unique: true })
  isbn: string;

  @Prop({ required: true })
  genre: string;

  @Prop({ type: Object })
  description: { en: string; ar: string };

  @Prop({ required: true, default: true })
  isOpenToReviews: boolean;

  @Prop({ required: true, default: true })
  isPublished: boolean;

  @Prop({ required: true })
  minAge: number;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Author' })
  authorId: Types.ObjectId;

  @Prop()
  coverImageUrl: string;
  @Prop()
  publishedDate: Date;

  @Prop()
  pdfLink: string;
}

export const BookSchema = SchemaFactory.createForClass(Book);
