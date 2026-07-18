import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string | null;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async register(dto: RegisterDto): Promise<AuthSession> {
    const { data, error } = await this.supabase.getAuthClient().auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      this.logger.warn(`Registration failed: ${error.message}`);
      throw new BadRequestException('Unable to register');
    }
    if (!data.session || !data.user) {
      // No session without an error means email confirmation is enabled in
      // Supabase; this API requires it off.
      this.logger.error('Registration returned no session');
      throw new InternalServerErrorException('Unable to register');
    }

    return toAuthSession(data.session, data.user);
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const { data, error } = await this.supabase
      .getAuthClient()
      .auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (error || !data.session || !data.user) {
      if (error) {
        this.logger.warn(`Login failed: ${error.message}`);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    return toAuthSession(data.session, data.user);
  }

  async logout(accessToken: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .auth.admin.signOut(accessToken);

    if (error) {
      // Revoking an already-dead session is not an error; log and return 204.
      this.logger.warn(`Logout revocation failed: ${error.message}`);
    }
  }
}

function toAuthSession(session: Session, user: User): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
  };
}
