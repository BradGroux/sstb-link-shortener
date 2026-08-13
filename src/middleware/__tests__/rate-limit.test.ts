import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { Env, Variables } from '../../types';
import { createRateLimit } from '../rateLimit';

function testApp(success: boolean) {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();
  const limit = vi.fn().mockResolvedValue({ success });
  app.get(
    '/limited',
    createRateLimit({ binding: 'LOGIN_RATE_LIMITER', key: () => 'login:test-client' }),
    (c) => c.text('ok')
  );
  return { app, limit };
}

describe('native rate-limit middleware', () => {
  it('continues when Cloudflare accepts the counter increment', async () => {
    const { app, limit } = testApp(true);
    const response = await app.request('/limited', {}, { LOGIN_RATE_LIMITER: { limit } } as unknown as Env);

    expect(response.status).toBe(200);
    expect(limit).toHaveBeenCalledWith({ key: 'login:test-client' });
  });

  it('returns 429 when the native limiter rejects the request', async () => {
    const { app } = testApp(false);
    const response = await app.request('/limited', {}, {
      LOGIN_RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: false }) },
    } as unknown as Env);

    expect(response.status).toBe(429);
  });
});
