import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BiLangObject {
  @IsOptional()
  @IsString()
  en: string;

  @IsOptional()
  @IsString()
  ar: string;
}

export class UpdateBookDto {
  @ValidateNested()
  @Type(() => BiLangObject)
  @IsOptional()
  title?: BiLangObject;

  @IsString()
  @IsOptional()
  genre?: string;

  @ValidateNested()
  @Type(() => BiLangObject)
  @IsOptional()
  description?: BiLangObject;

  @IsBoolean()
  @IsOptional()
  isOpenToReviews?: boolean;

  @IsNumber()
  @IsOptional()
  minAge?: number;
}
