/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Rate limiting middleware

import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, Variables } from '../types';

interface RateLimitOptions {
  binding: keyof Pick<
    Env,
    'LOGIN_RATE_LIMITER' | 'REGISTER_RATE_LIMITER' | 'REFRESH_RATE_LIMITER' | 'API_AUTH_RATE_LIMITER'
  >;
  key: string | ((c: Context<{ Bindings: Env; Variables: Variables }>) => string);
}

// Legacy function for backwards compatibility (not recommended)
export async function rateLimitMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
  options: RateLimitOptions
) {
  return createRateLimit(options)(c, next);
}

// Factory function (recommended)
export function createRateLimit(options: RateLimitOptions) {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    const key = typeof options.key === 'function' ? options.key(c) : options.key;
    const limiter = c.env[options.binding];
    const { success } = await limiter.limit({ key });

    if (!success) {
      throw new HTTPException(429, {
        message: 'Rate limit exceeded',
      });
    }

    await next();
  };
}
