import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class changeAuthorpassDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
