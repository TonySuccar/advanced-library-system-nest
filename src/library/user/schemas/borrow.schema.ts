import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BorrowDocument = Borrow & Document;

@Schema({ timestamps: true })
export class Borrow {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Book', required: true })
  bookId: Types.ObjectId;

  @Prop({ required: true })
  branchId: string;

  @Prop({ required: true })
  borrowedAt: Date;

  @Prop({ required: true })
  returnBy: Date;

  @Prop({ required: true, default: null })
  feedback: string;

  @Prop({ default: null })
  returnedAt: Date;

  @Prop({ default: false })
  isOverdue: boolean;
}

export const BorrowSchema = SchemaFactory.createForClass(Borrow);
