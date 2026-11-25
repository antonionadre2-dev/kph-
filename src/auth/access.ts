/** Staff rights require a verified identity, never a matching email suffix alone. */
export function isStaffIdentity(identity: { email?: string | null; emailVerified?: boolean; admin?: unknown } | null): boolean {
  if (!identity || identity.emailVerified !== true) return false;
  if (identity.admin === true) return true;
  return ['kai@krakenpfm.ch', 'antonio.nadre@anotherstar.com'].includes((identity.email || '').trim().toLowerCase());
}

/** Public service pages do not need to load Firebase or resolve a customer session. */
export function needsAuthSession(pathname: string): boolean {
  const path = pathname.replace(/^\/(en|es|fr|it|pt)(?=\/|$)/, '');
  return /^\/(login|register|dashboard|admin)(?:\/|$)/.test(path);
}
