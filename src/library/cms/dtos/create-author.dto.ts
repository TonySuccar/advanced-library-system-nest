import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsEmail,
  IsString,
  MinLength,
  ValidateNested,
  IsDate,
} from 'class-validator';
import { BiLangObject } from 'src/common/bilang-object.dto'; // Import BiLangObject

export class CreateAuthorDto {
  @ValidateNested()
  @Type(() => BiLangObject)
  @IsNotEmpty()
  name: BiLangObject;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ValidateNested()
  @Type(() => BiLangObject)
  @IsNotEmpty()
  biography: BiLangObject;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  birthDate: Date;
}
