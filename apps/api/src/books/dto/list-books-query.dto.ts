import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BOOK_STATUSES } from '../book.types';
import type { BookStatus } from '../book.types';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
export const MAX_OFFSET = 10_000;

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

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_OFFSET)
  offset: number = 0;
}
