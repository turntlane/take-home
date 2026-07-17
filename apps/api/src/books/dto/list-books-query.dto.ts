import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { BOOK_STATUSES } from '../book.types';
import type { BookStatus } from '../book.types';

export class ListBooksQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsIn(BOOK_STATUSES)
  status?: BookStatus;
}
