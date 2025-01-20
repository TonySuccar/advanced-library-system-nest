import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookRequestDocument = BookRequest & Document;

@Schema({ timestamps: true })
export class BookRequest {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Author' })
  authorId: Types.ObjectId;

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

  @Prop({ required: true })
  minAge: number;
  @Prop()
  coverImageUrl: string;

  @Prop()
  publishedDate: Date;

  @Prop()
  pdfLink: string;

  @Prop({ enum: ['pending', 'accepted', 'rejected'], default: 'pending' })
  status: string;

  @Prop()
  approvalTime: number;

  @Prop({ default: null })
  responseTime: Date;

  @Prop({ required: true })
  requestTime: Date;
}

export const BookRequestSchema = SchemaFactory.createForClass(BookRequest);
