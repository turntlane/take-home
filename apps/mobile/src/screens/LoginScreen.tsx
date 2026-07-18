import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, StyleSheet, View } from 'react-native';
import AuthForm from '../components/AuthForm';
import { login } from '../lib/api';
import { setSession } from '../lib/session';
import type { RootStackParamList } from '../navigation/types';

export default function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Login'>>();

  return (
    <View style={styles.container}>
      <AuthForm
        submitLabel="Sign in"
        busyLabel="Signing in…"
        onSubmit={async (email, password) => {
          const session = await login(email, password);
          await setSession(session);
          navigation.goBack();
        }}
      />
      <View style={styles.switchButton}>
        <Button
          title="Need an account? Register"
          onPress={() => navigation.replace('Register')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  switchButton: { padding: 16 },
});
