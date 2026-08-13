export function isCsrfExemptAuthPath(path: string): boolean {
  return /^\/(?:dashboard\/)?api\/v1\/auth\/(?:login|register|refresh|mfa\/verify)$/.test(path);
}

export function hasBearerAuthorization(header: string | undefined): boolean {
  return Boolean(header?.startsWith('Bearer ') && header.length > 'Bearer '.length);
}
