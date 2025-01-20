import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class DistributeBooksDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  bookId: string;

  @IsNumber()
  @IsNotEmpty()
  totalCopies: number;
}
