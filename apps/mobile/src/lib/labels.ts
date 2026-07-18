import type { BookStatus } from '../types/book';

// Shared UI labels for the status enum (list rows, detail screen, filters).
export const STATUS_LABELS: Record<BookStatus, string> = {
  to_read: 'To read',
  reading: 'Reading',
  finished: 'Finished',
};
