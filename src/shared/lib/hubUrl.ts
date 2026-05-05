export function getApiOrigin(): string {
  const explicit = import.meta.env.VITE_API_ORIGIN as string | undefined;
  if (explicit?.trim()) return explicit.replace(/\/$/, '');

  const base = import.meta.env.VITE_API_BASE_URL || '';
  if (!base) return window.location.origin;

  try {
    if (base.startsWith('http://') || base.startsWith('https://')) {
      const u = new URL(base);
      u.pathname = u.pathname.replace(/\/api\/?$/, '') || '/';
      return u.origin + (u.pathname === '/' ? '' : u.pathname.replace(/\/$/, ''));
    }
    const u = new URL(base, window.location.origin);
    u.pathname = u.pathname.replace(/\/api\/?$/, '') || '/';
    return u.origin + (u.pathname === '/' ? '' : u.pathname.replace(/\/$/, ''));
  } catch {
    return window.location.origin;
  }
}

export function getNotificationHubUrl(): string {
  return `${getApiOrigin()}/hubs/notifications`;
}
