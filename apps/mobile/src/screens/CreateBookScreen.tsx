import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BookForm from '../components/BookForm';
import { createBook } from '../lib/api';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateBook'>;

export default function CreateBookScreen({ navigation }: Props) {
  return (
    <BookForm
      submitLabel="Add book"
      onSubmit={async (input) => {
        await createBook(input);
        // The list refetches on focus, so it picks up the new book.
        navigation.goBack();
      }}
    />
  );
}
