import { describe, expect, it } from 'vitest';
import { hasBearerAuthorization, isCsrfExemptAuthPath } from '../authRoute';

describe('CSRF-exempt authentication paths', () => {
  it.each([
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/refresh',
    '/api/v1/auth/mfa/verify',
    '/dashboard/api/v1/auth/login',
    '/dashboard/api/v1/auth/register',
  ])('matches mounted auth endpoint %s', (path) => {
    expect(isCsrfExemptAuthPath(path)).toBe(true);
  });

  it.each(['/api/v1/links', '/api/v1/auth/change-password', '/evil/api/v1/auth/login'])('keeps %s protected', (path) => {
    expect(isCsrfExemptAuthPath(path)).toBe(false);
  });
});

describe('bearer authorization detection', () => {
  it('recognizes only non-empty bearer credentials', () => {
    expect(hasBearerAuthorization('Bearer sk_live_example')).toBe(true);
    expect(hasBearerAuthorization('Bearer ')).toBe(false);
    expect(hasBearerAuthorization(undefined)).toBe(false);
  });
});
