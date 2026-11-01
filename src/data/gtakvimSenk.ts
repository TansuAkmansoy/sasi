import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import type { FeeSettings, Reservation, Villa } from '../lib/types';
import { STATUS_LABEL } from '../lib/types';
import { nights } from '../lib/tarih';
import { money } from '../lib/para';

// Rezervasyonları telefondaki bir takvime (Google hesabındaki takvim) yazar.
// Android takvimi Google'a kendisi eşitler. Hangi rezervasyonun hangi etkinlik
// olduğu bu telefonda saklanır; değişen kayıt güncellenir, iptal edilen silinir.

const KEY = 'sasi.gcal';

export interface GcalState {
  enabled: boolean;
  calendarId: string | null;
  calendarTitle: string | null;
  /** rezervasyon id → { etkinlik id, içerik imzası } */
  events: Record<string, { id: string; sig: string }>;
  lastSync: string | null;
}

const EMPTY: GcalState = { enabled: false, calendarId: null, calendarTitle: null, events: {}, lastSync: null };

export const calendarSupported = Platform.OS === 'android' || Platform.OS === 'ios';

export async function loadGcal(): Promise<GcalState> {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  return raw ? { ...EMPTY, ...(JSON.parse(raw) as GcalState) } : EMPTY;
}

export async function saveGcal(s: GcalState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

export interface CalendarOption {
  id: string;
  title: string;
  account: string;
  color?: string;
}

/** Yazılabilir takvimler (Google hesapları önce) */
export async function listCalendars(): Promise<CalendarOption[]> {
  const perm = await Calendar.requestCalendarPermissionsAsync();
  if (perm.status !== 'granted') throw new Error('Takvim izni verilmedi. Ayarlar → Uygulamalar → Sasi → İzinler bölümünden takvim iznini aç.');
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return cals
    .filter((c) => c.allowsModifications)
    .map((c) => ({ id: c.id, title: c.title, account: c.source?.name ?? '', color: c.color }))
    .sort((a, b) => Number(/@gmail|google/i.test(b.account)) - Number(/@gmail|google/i.test(a.account)) || a.title.localeCompare(b.title, 'tr'));
}

const SHOWN = ['option', 'confirmed', 'completed'];

function at(isoDate: string, hhmm: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi);
}

function eventFor(r: Reservation, villas: Villa[], fees: FeeSettings) {
  const villa = villas.find((v) => v.id === r.villa_id)?.name ?? 'Villa';
  const short = villa.replace(/^Villa\s+/i, '');
  const title = `${r.status === 'option' ? 'HOLD · ' : ''}${short} · ${r.guest_name || 'Misafir'}`;
  const notes = [
    `${villa} · ${nights(r.check_in, r.check_out)} gece · ${STATUS_LABEL[r.status]}`,
    r.guests_count ? `Kişi: ${r.guests_count}` : '',
    r.guest_phone ? `Telefon: ${r.guest_phone}` : '',
    `Ücret: ${money(r.gross_minor, r.currency)}`,
    r.pet ? 'Evcil hayvan var' : '',
    r.note ? `Not: ${r.note}` : '',
    '— Sasi',
  ]
    .filter(Boolean)
    .join('\n');
  const details = {
    title,
    startDate: at(r.check_in, fees.check_in_time),
    endDate: at(r.check_out, fees.check_out_time),
    timeZone: 'Europe/Istanbul',
    location: `${villa}, Kalkan / Kaş`,
    notes,
    allDay: false,
  };
  const sig = JSON.stringify([title, r.check_in, r.check_out, fees.check_in_time, fees.check_out_time, notes]);
  return { details, sig };
}

export interface SyncResult {
  added: number;
  updated: number;
  removed: number;
  failed: number;
}

let running: Promise<SyncResult> | null = null;

/** Tüm kayıtları seçili takvimle eşitler. force: imza aynı olsa da günceller. */
export function syncCalendar(reservations: Reservation[], villas: Villa[], fees: FeeSettings, force = false): Promise<SyncResult> {
  if (running) return running;
  running = (async () => {
    const res: SyncResult = { added: 0, updated: 0, removed: 0, failed: 0 };
    const st = await loadGcal();
    if (!calendarSupported || !st.calendarId) return res;
    const perm = await Calendar.getCalendarPermissionsAsync();
    if (perm.status !== 'granted') return res;
    const events = { ...st.events };
    const keep = new Set<string>();
    for (const r of reservations) {
      if (!r.id || !SHOWN.includes(r.status)) continue;
      keep.add(r.id);
      const { details, sig } = eventFor(r, villas, fees);
      const ex = events[r.id];
      try {
        if (ex && (ex.sig !== sig || force)) {
          try {
            await Calendar.updateEventAsync(ex.id, details);
            events[r.id] = { id: ex.id, sig };
            res.updated++;
          } catch {
            // Etkinlik takvimden elle silinmiş olabilir: yeniden oluştur
            const id = await Calendar.createEventAsync(st.calendarId, details);
            events[r.id] = { id, sig };
            res.added++;
          }
        } else if (!ex) {
          const id = await Calendar.createEventAsync(st.calendarId, details);
          events[r.id] = { id, sig };
          res.added++;
        }
      } catch {
        res.failed++;
      }
    }
    for (const [rid, ev] of Object.entries(events)) {
      if (keep.has(rid)) continue;
      try {
        await Calendar.deleteEventAsync(ev.id);
      } catch {
        // zaten silinmiş
      }
      delete events[rid];
      res.removed++;
    }
    await saveGcal({ ...st, events, lastSync: new Date().toISOString() });
    return res;
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Sasi'nin bu takvime yazdığı tüm etkinlikleri siler (aktarımı kapatırken) */
export async function removeAllEvents(): Promise<number> {
  const st = await loadGcal();
  let n = 0;
  for (const ev of Object.values(st.events)) {
    try {
      await Calendar.deleteEventAsync(ev.id);
      n++;
    } catch {
      // yok say
    }
  }
  await saveGcal({ ...st, events: {}, lastSync: null });
  return n;
}

/** Kayıt sonrası sessiz otomatik eşitleme */
export async function autoSync(reservations: Reservation[], villas: Villa[], fees: FeeSettings): Promise<void> {
  if (!calendarSupported || Platform.OS === 'web') return;
  try {
    const st = await loadGcal();
    if (st.enabled && st.calendarId) await syncCalendar(reservations, villas, fees);
  } catch {
    // otomatik eşitleme hatası uygulamayı durdurmaz
  }
}
