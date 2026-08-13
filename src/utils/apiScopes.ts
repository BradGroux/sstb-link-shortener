export const API_KEY_SCOPES = [
  'domains:read',
  'links:read',
  'links:write',
  'links:delete',
  'analytics:read',
  'taxonomy:read',
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const DEFAULT_AGENT_SCOPES: ApiKeyScope[] = [
  'domains:read',
  'links:read',
  'links:write',
  'analytics:read',
  'taxonomy:read',
];

export function parseApiKeyScopes(value: string | null | undefined): ApiKeyScope[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((scope): scope is ApiKeyScope =>
      typeof scope === 'string' && API_KEY_SCOPES.includes(scope as ApiKeyScope)
    );
  } catch {
    return [];
  }
}

export function hasApiKeyScope(scopes: readonly ApiKeyScope[], required: ApiKeyScope): boolean {
  return scopes.includes(required);
}
