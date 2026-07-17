import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Book, BookRow, mapBookRow } from './book.types';
import { CreateBookDto } from './dto/create-book.dto';
import { ListBooksQueryDto } from './dto/list-books-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';

/** Escape LIKE wildcards so user input matches literally inside the pattern. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async list(query: ListBooksQueryDto): Promise<Book[]> {
    let builder = this.supabase.getClient().from('books').select('*');

    if (query.search) {
      builder = builder.ilike('title', `%${escapeLikePattern(query.search)}%`);
    }
    if (query.status) {
      builder = builder.eq('status', query.status);
    }

    const { data, error } = await builder.order('created_at', {
      ascending: false,
    });

    if (error) {
      this.logger.error(`Failed to list books: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch books');
    }

    return (data as BookRow[]).map(mapBookRow);
  }

  async getById(id: string): Promise<Book> {
    const { data, error } = await this.supabase
      .getClient()
      .from('books')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch book: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch book');
    }
    if (!data) {
      throw new NotFoundException('Book not found');
    }

    return mapBookRow(data as BookRow);
  }

  async create(dto: CreateBookDto): Promise<Book> {
    const { data, error } = await this.supabase
      .getClient()
      .from('books')
      .insert(toRowPatch(dto))
      .select('*')
      .single();

    if (error || !data) {
      this.logger.error(`Failed to create book: ${error?.message}`);
      throw new InternalServerErrorException('Failed to create book');
    }

    return mapBookRow(data as BookRow);
  }

  async update(id: string, dto: UpdateBookDto): Promise<Book> {
    const patch = toRowPatch(dto);
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException(
        'Request body must contain at least one field',
      );
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('books')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to update book: ${error.message}`);
      throw new InternalServerErrorException('Failed to update book');
    }
    if (!data) {
      throw new NotFoundException('Book not found');
    }

    return mapBookRow(data as BookRow);
  }

  async remove(id: string): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .from('books')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      this.logger.error(`Failed to delete book: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete book');
    }
    if (!data || data.length === 0) {
      throw new NotFoundException('Book not found');
    }
  }
}

/** Keep only fields the client actually sent, in DB column names. */
function toRowPatch(dto: CreateBookDto | UpdateBookDto): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (dto.title !== undefined) patch.title = dto.title;
  if (dto.author !== undefined) patch.author = dto.author;
  if (dto.status !== undefined) patch.status = dto.status;
  if (dto.rating !== undefined) patch.rating = dto.rating;
  return patch;
}
