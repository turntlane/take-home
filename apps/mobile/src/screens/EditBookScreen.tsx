import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import BookForm from '../components/BookForm';
import { ApiError, getBook, updateBook } from '../lib/api';
import type { RootStackParamList } from '../navigation/types';
import type { Book } from '../types/book';

type Props = NativeStackScreenProps<RootStackParamList, 'EditBook'>;

export default function EditBookScreen({ route, navigation }: Props) {
  const { id } = route.params;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError('This book no longer exists.');
      } else {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [id]);

  // Fetch once on mount — deliberately not on focus: refetching when the
  // screen regains focus would clobber the user's in-progress edits.
  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
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
    <BookForm
      initialValues={{
        title: book.title,
        author: book.author ?? '',
        status: book.status,
        rating: book.rating !== null ? String(book.rating) : '',
      }}
      submitLabel="Save changes"
      onSubmit={async (input) => {
        // Send the full field set: the form is the whole entity, and PATCH
        // accepts any subset, so no diffing is needed.
        await updateBook(id, input);
        // The detail screen refetches on focus, so it shows the update.
        navigation.goBack();
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  errorText: { textAlign: 'center' },
});
