// Web sürümünde (iPhone) bildirim yok; hold'lar "Bugün" ekranında görünür.
import type { Reservation, Villa } from '../lib/types';

export async function setupNotifications(): Promise<boolean> {
  return false;
}
export async function syncOptionReminders(_r: Reservation[], _v: Villa[]): Promise<void> {}
export function onReminderTap(_cb: (reservationId: string) => void): () => void {
  return () => {};
}
