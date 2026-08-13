import { describe, expect, it } from 'vitest';
import { hashIpAddress } from '../analytics';

describe('analytics visitor hashing', () => {
  const day = new Date('2026-08-13T12:00:00Z');

  it('is deterministic within a day without exposing the raw IP', async () => {
    const first = await hashIpAddress('203.0.113.10', 'test-secret', day);
    const second = await hashIpAddress('203.0.113.10', 'test-secret', day);

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{32}$/);
    expect(first).not.toContain('203');
  });

  it('rotates across days and secrets', async () => {
    const first = await hashIpAddress('203.0.113.10', 'test-secret', day);
    const nextDay = await hashIpAddress('203.0.113.10', 'test-secret', new Date('2026-08-14T12:00:00Z'));
    const otherSecret = await hashIpAddress('203.0.113.10', 'other-secret', day);

    expect(first).not.toBe(nextDay);
    expect(first).not.toBe(otherSecret);
  });

  it('fails closed when the secret is absent', async () => {
    await expect(hashIpAddress('203.0.113.10', undefined, day)).rejects.toThrow(
      'ANALYTICS_IP_HASH_SECRET is required'
    );
  });
});
