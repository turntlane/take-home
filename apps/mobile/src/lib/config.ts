// EXPO_PUBLIC_API_URL is public by design: it contains no secret. The app must
// never hold Supabase keys — all data access goes through our API.
// Must be a static `process.env.EXPO_PUBLIC_*` dot-access so Expo inlines it.
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;

export function getApiBaseUrl(): string {
  if (!rawApiUrl) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set. Copy apps/mobile/.env.example to .env and restart `expo start`.',
    );
  }
  return rawApiUrl.replace(/\/+$/, '');
}
