import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface AuthUser {
  id: string;
  email: string | null;
}

interface RequestWithUser {
  headers: Record<string, string | undefined>;
  user: AuthUser | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser | null =>
    context.switchToHttp().getRequest<RequestWithUser>().user ?? null,
);

// Auth is optional: no Authorization header means anonymous. A header that is
// present but malformed, invalid, or expired is a 401 — it must never be
// downgraded to anonymous, or expired sessions would read/write the shared pool.
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  private readonly logger = new Logger(OptionalAuthGuard.name);

  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const header = request.headers['authorization'];

    if (header === undefined) {
      request.user = null;
      return true;
    }

    const match = header.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const { data, error } = await this.supabase
      .getClient()
      .auth.getUser(match[1]);

    if (error || !data.user) {
      if (error) {
        this.logger.warn(`Token verification failed: ${error.message}`);
      }
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = { id: data.user.id, email: data.user.email ?? null };
    return true;
  }
}
