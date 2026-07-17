import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsString, IsUrl, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsUrl(
    { protocols: ['https'], require_protocol: true, require_tld: false },
    { message: 'SUPABASE_URL must be a valid https:// URL' },
  )
  SUPABASE_URL!: string;

  @IsString({ message: 'SUPABASE_SERVICE_ROLE_KEY must be set' })
  @IsNotEmpty({ message: 'SUPABASE_SERVICE_ROLE_KEY must not be empty' })
  SUPABASE_SERVICE_ROLE_KEY!: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    excludeExtraneousValues: false,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    // Report constraint messages only — never echo values, which may be secrets.
    const messages = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${messages}`);
  }

  return validated;
}
