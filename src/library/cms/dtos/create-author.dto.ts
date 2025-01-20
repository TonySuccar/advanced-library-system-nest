import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsEmail,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

class biLangObject {
  @IsNotEmpty()
  @IsString()
  en: string;

  @IsNotEmpty()
  @IsString()
  ar: string;
}

export class CreateAuthorDto {
  @ValidateNested()
  @Type(() => biLangObject)
  @IsNotEmpty()
  name: biLangObject;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ValidateNested()
  @Type(() => biLangObject)
  @IsNotEmpty()
  biography: biLangObject;

  @IsNotEmpty()
  birthDate: Date;
}
