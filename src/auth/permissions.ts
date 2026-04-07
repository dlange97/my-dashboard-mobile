export function decodeJwtClaims(token: string | null): Record<string, unknown> | null {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function hasPermission(
  user: { permissions?: string[] } | null,
  permission: string | undefined,
): boolean {
  if (!permission) return true;
  const permissions = user?.permissions ?? [];
  return permissions.includes(permission);
}

export function hasAnyPermission(
  user: { permissions?: string[] } | null,
  permissionList: string[] = [],
): boolean {
  const permissions = user?.permissions ?? [];
  return permissionList.some((p) => permissions.includes(p));
}
