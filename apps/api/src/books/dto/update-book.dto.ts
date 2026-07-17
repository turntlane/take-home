import { PartialType } from '@nestjs/mapped-types';
import { CreateBookDto } from './create-book.dto';

// skipNullProperties: false → explicit nulls are validated, not skipped.
// Nullable fields (author, rating) still accept null via their own @IsOptional;
// title/status reject null with a 400 instead of hitting the DB not-null constraint.
export class UpdateBookDto extends PartialType(CreateBookDto, {
  skipNullProperties: false,
}) {}
