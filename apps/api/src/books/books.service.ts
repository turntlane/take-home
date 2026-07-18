import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { Book, BookListPage, BookRow, mapBookRow } from './book.types';
import { CreateBookDto } from './dto/create-book.dto';
import { ListBooksQueryDto } from './dto/list-books-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';

/** Escape LIKE wildcards so user input matches literally inside the pattern. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // Signed-in callers see the shared anonymous pool plus their own books.
  // The UUID check guards the `.or()` filter string: nothing may be embedded
  // in a PostgREST filter expression without a validated shape.
  private callerScopeFilter(user: AuthUser): string {
    if (!UUID_PATTERN.test(user.id)) {
      this.logger.error(`Rejected non-UUID user id from auth: ${user.id}`);
      throw new InternalServerErrorException('Failed to resolve caller');
    }
    return `user_id.eq.${user.id},user_id.is.null`;
  }

  async list(
    user: AuthUser | null,
    query: ListBooksQueryDto,
  ): Promise<BookListPage> {
    // Secondary sort on id keeps page boundaries stable when created_at ties.
    const { data, error, count } = await this.listQuery(user, query)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);

    // PostgREST rejects a range starting past the last row; a valid offset
    // beyond the data is an empty page, not an error.
    if (error?.code === 'PGRST103') {
      const { count: total, error: countError } = await this.listQuery(
        user,
        query,
        { head: true },
      );
      if (countError) {
        this.logger.error(`Failed to count books: ${countError.message}`);
        throw new InternalServerErrorException('Failed to fetch books');
      }
      return { items: [], total: total ?? 0 };
    }

    if (error) {
      this.logger.error(`Failed to list books: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch books');
    }

    return {
      items: (data as BookRow[]).map(mapBookRow),
      total: count ?? 0,
    };
  }

  private listQuery(
    user: AuthUser | null,
    query: ListBooksQueryDto,
    options: { head?: boolean } = {},
  ) {
    let builder = this.supabase
      .getClient()
      .from('books')
      .select(options.head ? 'id' : '*', {
        count: 'exact',
        head: options.head ?? false,
      });
    builder = user
      ? builder.or(this.callerScopeFilter(user))
      : builder.is('user_id', null);

    if (query.search) {
      builder = builder.ilike('title', `%${escapeLikePattern(query.search)}%`);
    }
    if (query.status) {
      builder = builder.eq('status', query.status);
    }
    return builder;
  }

  async getById(user: AuthUser | null, id: string): Promise<Book> {
    let builder = this.supabase
      .getClient()
      .from('books')
      .select('*')
      .eq('id', id);
    builder = user
      ? builder.or(this.callerScopeFilter(user))
      : builder.is('user_id', null);

    const { data, error } = await builder.maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch book: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch book');
    }
    if (!data) {
      throw new NotFoundException('Book not found');
    }

    return mapBookRow(data as BookRow);
  }

  async create(user: AuthUser | null, dto: CreateBookDto): Promise<Book> {
    const { data, error } = await this.supabase
      .getClient()
      .from('books')
      .insert({ ...toRowPatch(dto), user_id: user?.id ?? null })
      .select('*')
      .single();

    if (error || !data) {
      this.logger.error(`Failed to create book: ${error?.message}`);
      throw new InternalServerErrorException('Failed to create book');
    }

    return mapBookRow(data as BookRow);
  }

  async update(
    user: AuthUser | null,
    id: string,
    dto: UpdateBookDto,
  ): Promise<Book> {
    const patch = toRowPatch(dto);
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException(
        'Request body must contain at least one field',
      );
    }

    let builder = this.supabase
      .getClient()
      .from('books')
      .update(patch)
      .eq('id', id);
    builder = user
      ? builder.or(this.callerScopeFilter(user))
      : builder.is('user_id', null);

    const { data, error } = await builder.select('*').maybeSingle();

    if (error) {
      this.logger.error(`Failed to update book: ${error.message}`);
      throw new InternalServerErrorException('Failed to update book');
    }
    if (!data) {
      throw new NotFoundException('Book not found');
    }

    return mapBookRow(data as BookRow);
  }

  async remove(user: AuthUser | null, id: string): Promise<void> {
    let builder = this.supabase
      .getClient()
      .from('books')
      .delete()
      .eq('id', id);
    builder = user
      ? builder.or(this.callerScopeFilter(user))
      : builder.is('user_id', null);

    const { data, error } = await builder.select('id');

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
