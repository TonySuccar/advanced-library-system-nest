import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CMSDocument = CMS & Document;

@Schema({ timestamps: true })
export class CMS {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;
  @Prop({ required: true })
  name: string;
  @Prop({ required: true, enum: ['admin', 'intern'] })
  role: string;
}

export const CMSSchema = SchemaFactory.createForClass(CMS);
