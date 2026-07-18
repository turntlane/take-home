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
import { listBooks } from '../lib/api';
import { STATUS_LABELS } from '../lib/labels';
import type { RootStackParamList } from '../navigation/types';
import { BOOK_STATUSES, type Book, type BookStatus } from '../types/book';

const SEARCH_DEBOUNCE_MS = 300;

export default function BookListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'BookList'>>();
  // `null` = never loaded successfully; keeps the first-load spinner distinct
  // from background refetches (filter changes, refocus) that keep stale rows.
  const [books, setBooks] = useState<Book[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    try {
      const result = await listBooks(debouncedSearch || undefined, statusFilter);
      if (requestIdRef.current !== requestId) return;
      setBooks(result);
    } catch (e) {
      if (requestIdRef.current !== requestId) return;
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

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
  errorText: { textAlign: 'center' },
  row: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
    gap: 2,
  },
  rowTitle: { fontWeight: 'bold' },
});
