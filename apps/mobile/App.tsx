import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import type { RootStackParamList } from './src/navigation/types';
import BookDetailScreen from './src/screens/BookDetailScreen';
import BookListScreen from './src/screens/BookListScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="BookList"
          component={BookListScreen}
          options={{ title: 'Books' }}
        />
        <Stack.Screen
          name="BookDetail"
          component={BookDetailScreen}
          options={{ title: 'Book' }}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
