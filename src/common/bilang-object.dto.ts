import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class BiLangObject {
  @IsNotEmpty()
  @IsString()
  en: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[\u0600-\u06FF\s]+$/, {
    message: 'Arabic text must contain only Arabic characters.',
  })
  ar: string; // Ensures only Arabic characters are allowed
}
