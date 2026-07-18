import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getBook, ApiError } from '../lib/api';
import { STATUS_LABELS } from '../lib/labels';
import type { RootStackParamList } from '../navigation/types';
import type { Book } from '../types/book';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>;

export default function BookDetailScreen({ route }: Props) {
  const { id } = route.params;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guards against out-of-order responses when the screen regains focus
  // while an earlier fetch is still in flight.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getBook(id);
      if (requestIdRef.current !== requestId) return;
      setBook(result);
    } catch (e) {
      if (requestIdRef.current !== requestId) return;
      if (e instanceof ApiError && e.status === 404) {
        // The book may have been deleted since the list was loaded.
        setBook(null);
        setError('This book no longer exists.');
      } else {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [id]);

  // Refetch on focus so edits made on the Edit screen show up
  // when navigating back here.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading && book === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error !== null || book === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Something went wrong.'}</Text>
        <Button title="Retry" onPress={load} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{book.title}</Text>

      <Field label="Author" value={book.author ?? '—'} />
      <Field label="Status" value={STATUS_LABELS[book.status]} />
      <Field
        label="Rating"
        value={book.rating !== null ? `${book.rating}/5` : '—'}
      />
      <Field label="Added" value={formatDate(book.createdAt)} />
      <Field label="Updated" value={formatDate(book.updatedAt)} />

      <View style={styles.actions}>
        <Button title="Edit" disabled onPress={() => {}} />
        <Button title="Delete" disabled color="#c00" onPress={() => {}} />
      </View>
    </ScrollView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
  field: { gap: 2 },
  fieldLabel: { fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  errorText: { textAlign: 'center' },
});
