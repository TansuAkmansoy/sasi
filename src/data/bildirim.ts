import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Reservation, Villa } from '../lib/types';
import { addDays, fmtRange } from '../lib/tarih';

// Hold hatırlatmaları: saatli hold'da bitişten 2 saat önce ve bitişte; eski günlük kayıtlarda bir gün önce ve bitiş günü 09:00.

let ready = false;

export async function setupNotifications(): Promise<boolean> {
  try {
    if (!ready) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('opsiyon', {
          name: 'Hold hatırlatmaları',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      ready = true;
    }
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

function at9(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d, 9, 0, 0);
}

export async function syncOptionReminders(reservations: Reservation[], villas: Villa[]): Promise<void> {
  if (Platform.OS === 'web') return; // web sürümünde bildirim yok
  try {
    if (!(await setupNotifications())) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    const now = Date.now();
    for (const r of reservations) {
      if (r.status !== 'option' || !r.option_until) continue;
      const villa = villas.find((v) => v.id === r.villa_id)?.name ?? 'Villa';
      const who = r.guest_name || 'Misafir';
      const plan = r.hold_until
        ? [
            { when: new Date(Date.parse(r.hold_until) - 2 * 3600_000), title: 'Hold 2 saat sonra bitiyor' },
            { when: new Date(Date.parse(r.hold_until)), title: 'Hold süresi doldu' },
          ]
        : [
            { when: at9(addDays(r.option_until, -1)), title: 'Hold yarın bitiyor' },
            { when: at9(r.option_until), title: 'Hold bugün bitiyor' },
          ];
      for (const p of plan) {
        if (p.when.getTime() <= now) continue;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: p.title,
            body: `${villa} · ${who} · ${fmtRange(r.check_in, r.check_out)}. Onayla, uzat ya da bırak.`,
            data: { reservationId: r.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.when, channelId: 'opsiyon' },
        });
      }
    }
  } catch {
    // Bildirim kurulamadıysa uygulama yine de çalışır; hold'lar "Bugün" ekranında görünür.
  }
}

/** Bildirime dokununca rezervasyon id'siyle çağrılır; aboneliği kaldıran fonksiyonu döner. */
export function onReminderTap(cb: (reservationId: string) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
    const id = resp.notification.request.content.data?.reservationId;
    if (typeof id === 'string') cb(id);
  });
  return () => sub.remove();
}
