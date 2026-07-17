export const BOOK_STATUSES = ['to_read', 'reading', 'finished'] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

/** Row shape as stored in Postgres (snake_case). */
export interface BookRow {
  id: string;
  title: string;
  author: string | null;
  status: BookStatus;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

/** API response shape (camelCase). */
export interface Book {
  id: string;
  title: string;
  author: string | null;
  status: BookStatus;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

export function mapBookRow(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    status: row.status,
    rating: row.rating,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
