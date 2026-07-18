import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthUser, CurrentUser, OptionalAuthGuard } from '../auth/auth.guard';
import { Book, BookListPage } from './book.types';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { ListBooksQueryDto } from './dto/list-books-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Controller('books')
@UseGuards(OptionalAuthGuard)
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser | null,
    @Query() query: ListBooksQueryDto,
  ): Promise<BookListPage> {
    return this.booksService.list(user, query);
  }

  @Get(':id')
  getById(
    @CurrentUser() user: AuthUser | null,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Book> {
    return this.booksService.getById(user, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser | null,
    @Body() dto: CreateBookDto,
  ): Promise<Book> {
    return this.booksService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser | null,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookDto,
  ): Promise<Book> {
    return this.booksService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser | null,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.booksService.remove(user, id);
  }
}
