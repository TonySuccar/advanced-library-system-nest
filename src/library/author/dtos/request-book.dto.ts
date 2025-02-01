import { IsNotEmpty, IsString, IsDate, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BiLangObject } from 'src/common/bilang-object.dto';

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
