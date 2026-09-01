import { apiFetch } from './client';

export interface NotificationRow {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  deep_link: string | null;
  read_at: string | null;
  delivered_at: string | null;
  created_at: string;
}
export async function listNotifications(): Promise<NotificationRow[]> {
  const result = await apiFetch<{ notifications: NotificationRow[] }>('/api/v1/notifications');
  return result.notifications;
}
export async function markNotificationRead(id: string): Promise<NotificationRow> {
  const result = await apiFetch<{ notification: NotificationRow }>(`/api/v1/notifications/${id}/read`, {
    method: 'PATCH',
  });
  return result.notification;
}
export async function registerDeviceToken(input: {
  platform: 'ios' | 'android' | 'web';
  token: string;
  appVersion?: string | null;
}): Promise<void> {
  await apiFetch('/api/v1/device-tokens', { method: 'POST', body: JSON.stringify(input) });
}
