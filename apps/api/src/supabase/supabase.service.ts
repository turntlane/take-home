import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;
  private readonly authClient: SupabaseClient;

  constructor(configService: ConfigService) {
    // Env presence/shape is enforced at startup by validateEnv; the service-role
    // key never leaves the server environment and must never be logged.
    const url = configService.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // signUp/signInWithPassword store the returned session on the client in
    // memory even with persistSession: false, so subsequent requests through
    // that client would run as the signed-in user instead of the service role.
    // Auth calls therefore get their own client; data queries stay on `client`.
    this.authClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  getAuthClient(): SupabaseClient {
    return this.authClient;
  }
}
