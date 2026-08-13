import { describe, expect, it } from 'vitest';
import {
  createLinkSchema,
  geoRedirectSchema,
  deviceRedirectSchema,
  cityRedirectSchema,
  osRedirectSchema,
  ogFetchSchema,
} from '../link';
import { rootPageSchema } from '../settings';

const unsafeSchemes = ['javascript:alert(1)', 'data:text/html,owned', 'file:///etc/passwd'];

describe('link URL scheme safety', () => {
  it.each(unsafeSchemes)('rejects unsafe primary destinations: %s', (destinationUrl) => {
    expect(createLinkSchema.safeParse({
      domain_id: 'domain_1',
      destination_url: destinationUrl,
    }).success).toBe(false);
  });

  it.each([
    geoRedirectSchema,
    deviceRedirectSchema,
    cityRedirectSchema,
    osRedirectSchema,
  ])('rejects unsafe alternate destinations', (schema) => {
    const base = {
      country_code: 'US',
      device_type: 'mobile',
      city_name: 'austin',
      os: 'ios',
      destination_url: 'javascript:alert(1)',
    };
    expect(schema.safeParse(base).success).toBe(false);
  });

  it('rejects unsafe OG fetch and root redirect URLs', () => {
    expect(ogFetchSchema.safeParse({ url: 'javascript:alert(1)' }).success).toBe(false);
    expect(rootPageSchema.safeParse({ mode: 'redirect', redirect_url: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('accepts HTTPS destinations', () => {
    expect(createLinkSchema.safeParse({
      domain_id: 'domain_1',
      destination_url: 'https://example.com/path',
    }).success).toBe(true);
  });
});
