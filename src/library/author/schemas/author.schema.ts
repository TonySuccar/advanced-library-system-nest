import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuthorDocument = Author & Document;

@Schema({ timestamps: true })
export class Author {
  @Prop({
    required: true,
    type: Object,
  })
  name: {
    en: string;
    ar: string;
  };

  @Prop({
    required: true,
    unique: true,
  })
  email: string;

  @Prop({
    required: true,
  })
  password: string;

  @Prop({
    required: true,
    type: Object,
  })
  biography: {
    en: string;
    ar: string;
  };

  @Prop({
    required: true,
  })
  profileImageUrl: string;

  @Prop({
    required: true,
    type: Date,
  })
  birthDate: Date;

  @Prop({ required: true, default: 'author' })
  role: string;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'BookRequest' }],
    default: [],
  })
  bookRequestIds: Types.ObjectId[];
  @Prop({
    type: Number,
    default: 0,
  })
  averageApprovalTime: number;
}

export const AuthorSchema = SchemaFactory.createForClass(Author);
