// Duplicated from apps/api/src/books on purpose — a shared package isn't worth
// the workspace config for one entity. Keep in sync with the API DTOs.

export const BOOK_STATUSES = ['to_read', 'reading', 'finished'] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

export interface Book {
  id: string;
  title: string;
  author: string | null;
  status: BookStatus;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookInput {
  title: string;
  author?: string | null;
  status?: BookStatus;
  rating?: number | null;
}

export type UpdateBookInput = Partial<CreateBookInput>;
