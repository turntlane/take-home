import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { BOOK_STATUSES } from '../book.types';
import type { BookStatus } from '../book.types';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateBookDto {
  @IsString()
  @Transform(trim)
  @Length(1, 200)
  title!: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(200)
  author?: string | null;

  // Not @IsOptional: the column is non-nullable, so an explicit null must fail
  // validation (400) rather than reach the database.
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(BOOK_STATUSES)
  status?: BookStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;
}
