import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Reservation, Villa } from '../lib/types';
import { addDays, fmtRange } from '../lib/tarih';

// Opsiyon bitiş hatırlatmaları: bitişten bir gün önce ve bitiş günü saat 09:00'da.

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
          name: 'Opsiyon hatırlatmaları',
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
  try {
    if (!(await setupNotifications())) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    const now = Date.now();
    for (const r of reservations) {
      if (r.status !== 'option' || !r.option_until) continue;
      const villa = villas.find((v) => v.id === r.villa_id)?.name ?? 'Villa';
      const who = r.guest_name || 'Misafir';
      const plan = [
        { when: at9(addDays(r.option_until, -1)), title: 'Opsiyon yarın bitiyor', },
        { when: at9(r.option_until), title: 'Opsiyon bugün bitiyor' },
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
    // Bildirim kurulamadıysa uygulama yine de çalışır; opsiyonlar "Bugün" ekranında görünür.
  }
}
