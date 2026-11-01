import type { FeeSettings, Reservation } from './types.ts';
import { STATUS_LABEL } from './types.ts';
import { nights } from './tarih.ts';

const stamp = (isoDate: string, hhmm: string) => `${isoDate.replace(/-/g, '')}T${hhmm.replace(':', '')}00`;

/**
 * Google Takvim "etkinlik ekle" bağlantısı. Telefonda Google Takvim uygulaması
 * ya da tarayıcı açılır; kaydetmek için kullanıcı onaylar.
 */
export function googleCalendarUrl(r: Pick<Reservation, 'check_in' | 'check_out' | 'guest_name' | 'guest_phone' | 'status' | 'guests_count' | 'note'>, villaName: string, fees: Pick<FeeSettings, 'check_in_time' | 'check_out_time'>): string {
  const title = `${villaName.replace(/^Villa\s+/i, '')} · ${r.guest_name || 'Misafir'}${r.status === 'option' ? ' (Hold)' : ''}`;
  const details = [
    `${villaName} · ${nights(r.check_in, r.check_out)} gece · ${STATUS_LABEL[r.status]}`,
    r.guests_count ? `Kişi: ${r.guests_count}` : '',
    r.guest_phone ? `Telefon: ${r.guest_phone}` : '',
    r.note ? `Not: ${r.note}` : '',
    'Sasi',
  ]
    .filter(Boolean)
    .join('\n');
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${stamp(r.check_in, fees.check_in_time)}/${stamp(r.check_out, fees.check_out_time)}`,
    ctz: 'Europe/Istanbul',
    details,
    location: `${villaName}, Kalkan / Kaş`,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
