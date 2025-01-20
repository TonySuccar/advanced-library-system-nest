import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BranchInventoryDocument = BranchInventory & Document;

@Schema({ timestamps: true })
export class BranchInventory {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Branch' })
  branchId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Book' })
  bookId: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  totalCopies: number;

  @Prop({ required: true, default: 7 })
  borrowableDays: number;

  @Prop({ required: true })
  availableCopies: number;
}

export const BranchInventorySchema =
  SchemaFactory.createForClass(BranchInventory);
