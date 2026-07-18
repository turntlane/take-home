import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, StyleSheet, View } from 'react-native';
import AuthForm from '../components/AuthForm';
import { register } from '../lib/api';
import { setSession } from '../lib/session';
import type { RootStackParamList } from '../navigation/types';

export default function RegisterScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Register'>>();

  return (
    <View style={styles.container}>
      <AuthForm
        submitLabel="Register"
        busyLabel="Registering…"
        onSubmit={async (email, password) => {
          const session = await register(email, password);
          await setSession(session);
          navigation.goBack();
        }}
      />
      <View style={styles.switchButton}>
        <Button
          title="Have an account? Sign in"
          onPress={() => navigation.replace('Login')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  switchButton: { padding: 16 },
});
