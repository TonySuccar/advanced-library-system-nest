import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  memberId: string;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: 100 })
  returnRate: number;

  @Prop({ default: [] })
  borrowHistory: Types.ObjectId[];

  @Prop({ required: true })
  age: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: 'member' })
  role: string;

  @Prop({ default: [] })
  likedReviews: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
