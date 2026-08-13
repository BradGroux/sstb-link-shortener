import { describe, expect, it } from 'vitest';
import {
  API_KEY_SCOPES,
  DEFAULT_AGENT_SCOPES,
  hasApiKeyScope,
  parseApiKeyScopes,
} from '../apiScopes';

describe('API key operation scopes', () => {
  it('gives agent keys useful read/write access without destructive access', () => {
    expect(DEFAULT_AGENT_SCOPES).toContain('links:write');
    expect(DEFAULT_AGENT_SCOPES).toContain('analytics:read');
    expect(DEFAULT_AGENT_SCOPES).not.toContain('links:delete');
  });

  it('drops unknown and malformed stored scopes', () => {
    expect(parseApiKeyScopes('["links:read","admin:all",3]')).toEqual(['links:read']);
    expect(parseApiKeyScopes('not-json')).toEqual([]);
    expect(parseApiKeyScopes(null)).toEqual([]);
  });

  it('requires an exact operation scope', () => {
    expect(hasApiKeyScope(['links:read'], 'links:read')).toBe(true);
    expect(hasApiKeyScope(['links:read'], 'links:write')).toBe(false);
    expect(new Set(API_KEY_SCOPES).size).toBe(API_KEY_SCOPES.length);
  });
});
