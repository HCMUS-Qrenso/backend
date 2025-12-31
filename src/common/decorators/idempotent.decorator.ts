import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'idempotent';

/**
 * Decorator to mark an endpoint as idempotent
 * Requires Idempotency-Key header for safe retries
 * 
 * @param ttlMinutes - Time to live for the idempotency key in minutes (default: 60)
 */
export const Idempotent = (ttlMinutes: number = 60) =>
  SetMetadata(IDEMPOTENT_KEY, { ttlMinutes });

