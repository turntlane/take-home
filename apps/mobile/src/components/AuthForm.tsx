import { useState } from 'react';
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { ApiError } from '../lib/api';

interface FieldErrors {
  email?: string;
  password?: string;
}

interface Props {
  submitLabel: string;
  busyLabel: string;
  /** Called with trimmed credentials; rejections are shown in the form. */
  onSubmit: (email: string, password: string) => Promise<void>;
}

export default function AuthForm({ submitLabel, busyLabel, onSubmit }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Mirrors the API's DTO rules so most mistakes are caught before a request.
  function validate(): { valid: boolean; errors: FieldErrors } {
    const errors: FieldErrors = {};

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    } else if (password.length > 72) {
      errors.password = 'Password must be at most 72 characters.';
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  async function handleSubmit() {
    const { valid, errors } = validate();
    setFieldErrors(errors);
    setSubmitError(null);
    if (!valid) return;

    setSubmitting(true);
    try {
      await onSubmit(email.trim(), password);
      // On success the caller navigates away — leave the form inert so the
      // button can't be pressed again during the transition.
    } catch (e) {
      setSubmitting(false);
      if (e instanceof ApiError) {
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
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        editable={!submitting}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        accessibilityLabel="Email"
      />
      {fieldErrors.email && (
        <Text style={styles.fieldError}>{fieldErrors.email}</Text>
      )}

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        editable={!submitting}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        accessibilityLabel="Password"
      />
      {fieldErrors.password && (
        <Text style={styles.fieldError}>{fieldErrors.password}</Text>
      )}

      {submitError !== null && (
        <Text style={styles.submitError}>{submitError}</Text>
      )}

      <Button
        title={submitting ? busyLabel : submitLabel}
        onPress={handleSubmit}
        disabled={submitting}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  label: { fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
  },
  fieldError: { color: '#c00' },
  submitError: { color: '#c00' },
});
