export const ADMIN_COUNTS_REFRESH_EVENT = 'opennote:admin-counts-refresh';

export function requestAdminMenuCountsRefresh(target?: EventTarget): void {
  const eventTarget = target ?? (typeof window !== 'undefined' ? window : null);
  if (!eventTarget) return;
  eventTarget.dispatchEvent(new Event(ADMIN_COUNTS_REFRESH_EVENT));
}
