import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BranchDocument = Branch & Document;

@Schema({ timestamps: true })
export class Branch {
  @Prop({ required: true, unique: true })
  branchName: string;

  @Prop({
    required: true,
  })
  location: string;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);
