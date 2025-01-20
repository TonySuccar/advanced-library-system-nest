import { IsNotEmpty, IsString, IsDate, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BiLangObject {
  @IsNotEmpty()
  @IsString()
  en: string; // English

  @IsNotEmpty()
  @IsString()
  ar: string; // Arabic
}

export class RequestBookDto {
  @ValidateNested()
  @Type(() => BiLangObject)
  @IsNotEmpty()
  title: BiLangObject;

  @ValidateNested()
  @Type(() => BiLangObject)
  @IsNotEmpty()
  description: BiLangObject;

  @IsString()
  @IsNotEmpty()
  isbn: string;

  @IsString()
  @IsNotEmpty()
  genre: string;

  @IsNotEmpty()
  isOpenToReviews: boolean;
  @IsNotEmpty()
  minAge: number;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  publishedDate: Date;
}
