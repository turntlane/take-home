import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { listBooks, logout } from '../lib/api';
import { STATUS_LABELS } from '../lib/labels';
import { clearSession, getSession, type Session } from '../lib/session';
import type { RootStackParamList } from '../navigation/types';
import { BOOK_STATUSES, type Book, type BookStatus } from '../types/book';

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export default function BookListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'BookList'>>();
  // `null` = never loaded successfully; keeps the first-load spinner distinct
  // from background refetches (filter changes, refocus) that keep stale rows.
  const [books, setBooks] = useState<Book[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSessionState] = useState<Session | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookStatus | undefined>();

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [search]);

  // Guards against out-of-order responses: only the latest request may write state.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadingMore(false);
    setLoadMoreError(false);
    setError(null);
    try {
      const page = await listBooks({
        search: debouncedSearch || undefined,
        status: statusFilter,
        limit: PAGE_SIZE,
        offset: 0,
      });
      if (requestIdRef.current !== requestId) return;
      setBooks(page.items);
      setTotal(page.total);
    } catch (e) {
      if (requestIdRef.current !== requestId) return;
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      // Re-read after the request: a 401 response clears the stored session,
      // and this keeps the signed-in header in sync with it.
      const stored = await getSession();
      if (requestIdRef.current === requestId) {
        setSessionState(stored);
        setLoading(false);
      }
    }
  }, [debouncedSearch, statusFilter]);

  const loadMore = useCallback(async () => {
    if (books === null || loading || loadingMore) return;
    if (books.length >= total) return;
    const requestId = ++requestIdRef.current;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const page = await listBooks({
        search: debouncedSearch || undefined,
        status: statusFilter,
        limit: PAGE_SIZE,
        offset: books.length,
      });
      if (requestIdRef.current !== requestId) return;
      // Rows inserted since the first page shift offsets; drop ids we already
      // show rather than rendering duplicates.
      setBooks((current) => {
        const shown = new Set((current ?? []).map((b) => b.id));
        return [
          ...(current ?? []),
          ...page.items.filter((b) => !shown.has(b.id)),
        ];
      });
      setTotal(page.total);
    } catch {
      if (requestIdRef.current !== requestId) return;
      setLoadMoreError(true);
    } finally {
      if (requestIdRef.current === requestId) setLoadingMore(false);
    }
  }, [books, total, loading, loadingMore, debouncedSearch, statusFilter]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      // Best-effort revocation; the local session is cleared regardless.
    }
    await clearSession();
    setSessionState(null);
    setSigningOut(false);
    load();
  }, [load]);

  // Runs on focus and whenever the query params change while focused, so the
  // list refreshes after returning from create/edit/delete.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filters: Array<{ label: string; value: BookStatus | undefined }> = [
    { label: 'All', value: undefined },
    ...BOOK_STATUSES.map((s) => ({ label: STATUS_LABELS[s], value: s })),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.authRow}>
        {session !== null ? (
          <>
            <Text style={styles.authText} numberOfLines={1}>
              {session.user.email ?? 'Signed in'}
            </Text>
            <Button
              title={signingOut ? 'Signing out…' : 'Sign out'}
              onPress={handleSignOut}
              disabled={signingOut}
            />
          </>
        ) : (
          <>
            <Text style={styles.authText}>Anonymous shared list</Text>
            <Button
              title="Sign in"
              onPress={() => navigation.navigate('Login')}
            />
          </>
        )}
      </View>

      <View style={styles.addButton}>
        <Button
          title="Add book"
          onPress={() => navigation.navigate('CreateBook')}
        />
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by title"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search books by title"
      />

      <View style={styles.filterRow}>
        {filters.map((f) => {
          const selected = statusFilter === f.value;
          return (
            <Pressable
              key={f.label}
              style={[styles.filterButton, selected && styles.filterSelected]}
              onPress={() => setStatusFilter(f.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={selected && styles.filterSelectedText}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error !== null ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={load} />
        </View>
      ) : books === null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(book) => book.id}
          refreshing={loading}
          onRefresh={load}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator />
              </View>
            ) : loadMoreError ? (
              <View style={styles.footer}>
                <Text style={styles.errorText}>Couldn't load more books.</Text>
                <Button title="Try again" onPress={loadMore} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text>
                {debouncedSearch || statusFilter
                  ? 'No books match your search.'
                  : 'No books yet.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate('BookDetail', { id: item.id })}
              accessibilityRole="button"
              accessibilityLabel={`View details for ${item.title}`}
            >
              <Text style={styles.rowTitle}>{item.title}</Text>
              {item.author !== null && <Text>{item.author}</Text>}
              <Text>
                {STATUS_LABELS[item.status]}
                {item.rating !== null ? ` · ${item.rating}/5` : ''}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  authRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  authText: { flexShrink: 1 },
  addButton: { marginBottom: 8 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  filterButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  filterSelected: { backgroundColor: '#333', borderColor: '#333' },
  filterSelectedText: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  footer: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  errorText: { textAlign: 'center' },
  row: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
    gap: 2,
  },
  rowTitle: { fontWeight: 'bold' },
});
