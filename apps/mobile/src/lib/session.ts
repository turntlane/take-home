import * as SecureStore from 'expo-secure-store';

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

const SESSION_KEY = 'session';

export async function getSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    if (
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.refreshToken !== 'string' ||
      typeof parsed.user?.id !== 'string'
    ) {
      throw new Error('Malformed session');
    }
    return parsed;
  } catch {
    await clearSession();
    return null;
  }
}

export async function setSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
