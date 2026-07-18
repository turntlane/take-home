import { useState } from 'react';
import {
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiError } from '../lib/api';
import { STATUS_LABELS } from '../lib/labels';
import {
  BOOK_STATUSES,
  type BookStatus,
  type CreateBookInput,
} from '../types/book';

// Form-local shape: rating is the raw text-field value ('' = no rating) so the
// user can clear it; conversion to number | null happens on submit.
export interface BookFormValues {
  title: string;
  author: string;
  status: BookStatus;
  rating: string;
}

interface FieldErrors {
  title?: string;
  author?: string;
  rating?: string;
}

interface Props {
  initialValues?: Partial<BookFormValues>;
  submitLabel: string;
  /** Called with a validated payload; rejections are shown in the form. */
  onSubmit: (input: CreateBookInput) => Promise<void>;
}

export default function BookForm({
  initialValues,
  submitLabel,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [author, setAuthor] = useState(initialValues?.author ?? '');
  const [status, setStatus] = useState<BookStatus>(
    initialValues?.status ?? 'to_read',
  );
  const [rating, setRating] = useState(initialValues?.rating ?? '');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Mirrors the API's DTO rules so most mistakes are caught before a request.
  function validate(): { input?: CreateBookInput; errors: FieldErrors } {
    const errors: FieldErrors = {};

    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      errors.title = 'Title is required.';
    } else if (trimmedTitle.length > 200) {
      errors.title = 'Title must be at most 200 characters.';
    }

    const trimmedAuthor = author.trim();
    if (trimmedAuthor.length > 200) {
      errors.author = 'Author must be at most 200 characters.';
    }

    const trimmedRating = rating.trim();
    let ratingValue: number | null = null;
    if (trimmedRating !== '') {
      const parsed = Number(trimmedRating);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
        errors.rating = 'Rating must be a whole number from 1 to 5, or empty.';
      } else {
        ratingValue = parsed;
      }
    }

    if (Object.keys(errors).length > 0) return { errors };
    return {
      errors,
      input: {
        title: trimmedTitle,
        author: trimmedAuthor === '' ? null : trimmedAuthor,
        status,
        rating: ratingValue,
      },
    };
  }

  async function handleSubmit() {
    const { input, errors } = validate();
    setFieldErrors(errors);
    setSubmitError(null);
    if (!input) return;

    setSubmitting(true);
    try {
      await onSubmit(input);
      // On success the caller navigates away — leave the form inert so the
      // button can't be pressed again during the transition.
    } catch (e) {
      setSubmitting(false);
      if (e instanceof ApiError) {
        // Server-side validation (400) or other API failure — surface the
        // API's messages in the form instead of crashing.
        setSubmitError(e.messages.join('\n'));
      } else {
        setSubmitError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.field}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          editable={!submitting}
          accessibilityLabel="Title"
        />
        {fieldErrors.title && (
          <Text style={styles.fieldError}>{fieldErrors.title}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Author</Text>
        <TextInput
          style={styles.input}
          value={author}
          onChangeText={setAuthor}
          editable={!submitting}
          accessibilityLabel="Author"
        />
        {fieldErrors.author && (
          <Text style={styles.fieldError}>{fieldErrors.author}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>
          {BOOK_STATUSES.map((s) => {
            const selected = status === s;
            return (
              <Pressable
                key={s}
                style={[styles.statusButton, selected && styles.statusSelected]}
                onPress={() => setStatus(s)}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: submitting }}
              >
                <Text style={selected && styles.statusSelectedText}>
                  {STATUS_LABELS[s]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Rating (1–5)</Text>
        <TextInput
          style={styles.input}
          value={rating}
          onChangeText={setRating}
          editable={!submitting}
          keyboardType="number-pad"
          placeholder="No rating"
          accessibilityLabel="Rating from 1 to 5"
        />
        {fieldErrors.rating && (
          <Text style={styles.fieldError}>{fieldErrors.rating}</Text>
        )}
      </View>

      {submitError !== null && (
        <Text style={styles.submitError}>{submitError}</Text>
      )}

      <Button
        title={submitting ? 'Saving…' : submitLabel}
        onPress={handleSubmit}
        disabled={submitting}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  field: { gap: 4 },
  label: { fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
  },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusSelected: { backgroundColor: '#333', borderColor: '#333' },
  statusSelectedText: { color: '#fff' },
  fieldError: { color: '#c00' },
  submitError: { color: '#c00' },
});
