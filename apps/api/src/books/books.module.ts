import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  imports: [SupabaseModule],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
