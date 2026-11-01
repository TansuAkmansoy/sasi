// Web sürümünde (iPhone) telefon takvimine erişim yok: aynı arayüz, işlem yapmaz.
import type { FeeSettings, Reservation, Villa } from '../lib/types';

export interface GcalState {
  enabled: boolean;
  calendarId: string | null;
  calendarTitle: string | null;
  events: Record<string, { id: string; sig: string }>;
  lastSync: string | null;
}
export interface CalendarOption {
  id: string;
  title: string;
  account: string;
  color?: string;
}
export interface SyncResult {
  added: number;
  updated: number;
  removed: number;
  failed: number;
}
const EMPTY: GcalState = { enabled: false, calendarId: null, calendarTitle: null, events: {}, lastSync: null };
export const calendarSupported = false;
export async function loadGcal(): Promise<GcalState> {
  return EMPTY;
}
export async function saveGcal(_s: GcalState): Promise<void> {}
export async function listCalendars(): Promise<CalendarOption[]> {
  return [];
}
export async function syncCalendar(_r: Reservation[], _v: Villa[], _f: FeeSettings, _force = false): Promise<SyncResult> {
  return { added: 0, updated: 0, removed: 0, failed: 0 };
}
export async function removeAllEvents(): Promise<number> {
  return 0;
}
export async function autoSync(_r: Reservation[], _v: Villa[], _f: FeeSettings): Promise<void> {}
