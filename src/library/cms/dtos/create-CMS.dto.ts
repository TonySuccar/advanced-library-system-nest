import { IsString, IsEmail, IsNotEmpty, IsEnum } from 'class-validator';

export class CreateCMSUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['admin', 'intern'], {
    message: 'Role must be either admin or intern',
  })
  role: 'cms' | 'cmsintern';
}
