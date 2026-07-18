import type {
  Book,
  BookStatus,
  CreateBookInput,
  UpdateBookInput,
} from '../types/book';
import { getApiBaseUrl } from './config';
import { clearSession, getSession, type Session } from './session';

const REQUEST_TIMEOUT_MS = 10_000;

/** An HTTP error response from the API (4xx/5xx). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    /** Individual validation messages when the API returns an array (Nest 400s). */
    readonly messages: string[],
  ) {
    super(messages.join('\n'));
    this.name = 'ApiError';
  }
}

/** The request never got a response: offline, DNS failure, or timeout. */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

function parseErrorMessages(body: unknown, status: number): string[] {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === 'string') return [message];
    if (Array.isArray(message) && message.every((m) => typeof m === 'string')) {
      return message as string[];
    }
  }
  return [`Request failed (${status})`];
}

async function request<T>(
  path: string,
  init?: { method?: string; body?: unknown; attachSession?: boolean },
): Promise<T> {
  const session = init?.attachSession === false ? null : await getSession();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(init?.body !== undefined
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(session !== null
          ? { Authorization: `Bearer ${session.accessToken}` }
          : {}),
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError(
      controller.signal.aborted
        ? 'The request timed out.'
        : 'Could not reach the server. Check your connection.',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // An expired/revoked stored token means we are signed out; no silent
    // refresh by design. The next request proceeds against the anonymous pool.
    if (response.status === 401 && session !== null) {
      await clearSession();
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    throw new ApiError(
      response.status,
      parseErrorMessages(body, response.status),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(response.status, ['Unexpected response from server.']);
  }
}

export function listBooks(
  search?: string,
  status?: BookStatus,
): Promise<Book[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  const query = params.toString();
  return request<Book[]>(`/books${query ? `?${query}` : ''}`);
}

export function getBook(id: string): Promise<Book> {
  return request<Book>(`/books/${encodeURIComponent(id)}`);
}

export function createBook(input: CreateBookInput): Promise<Book> {
  return request<Book>('/books', { method: 'POST', body: input });
}

export function updateBook(id: string, input: UpdateBookInput): Promise<Book> {
  return request<Book>(`/books/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteBook(id: string): Promise<void> {
  return request<void>(`/books/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function register(email: string, password: string): Promise<Session> {
  return request<Session>('/auth/register', {
    method: 'POST',
    body: { email, password },
    attachSession: false,
  });
}

export function login(email: string, password: string): Promise<Session> {
  return request<Session>('/auth/login', {
    method: 'POST',
    body: { email, password },
    attachSession: false,
  });
}

export function logout(): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST' });
}
