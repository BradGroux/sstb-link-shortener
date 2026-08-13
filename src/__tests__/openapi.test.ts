import { describe, expect, it } from 'vitest';
import { openApiDocument } from '../openapi';
import { API_KEY_SCOPES, DEFAULT_AGENT_SCOPES } from '../utils/apiScopes';

describe('agent OpenAPI contract', () => {
  it('publishes the stable link and analytics operations', () => {
    expect(openApiDocument.openapi).toBe('3.1.0');
    expect(openApiDocument.paths['/links'].post.operationId).toBe('createLink');
    expect(openApiDocument.paths['/links/{id}'].put.operationId).toBe('updateLink');
    expect(openApiDocument.paths['/analytics/dashboard'].get.operationId).toBe('getAggregateAnalytics');
  });

  it('documents the exact enforced operation scopes', () => {
    const description = openApiDocument.components.securitySchemes.bearerAuth.description;
    for (const scope of API_KEY_SCOPES) expect(description).toContain(scope);
    expect(openApiDocument.paths['/links/{id}'].delete.security).toEqual([{ bearerAuth: [] }]);
    expect(openApiDocument.paths['/links/{id}'].delete['x-required-scopes']).toEqual(['links:delete']);
    expect(DEFAULT_AGENT_SCOPES).not.toContain('links:delete');
  });
});
