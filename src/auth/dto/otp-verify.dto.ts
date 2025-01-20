import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Max,
  Min,
  IsNumber,
} from 'class-validator';

export class OtpVerifyDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsNumber()
  @IsNotEmpty()
  @Max(120)
  @Min(3)
  age: number;
}
