// Tarih yardımcıları. Tüm tarihler 'YYYY-MM-DD' metnidir; saat dilimi kayması olmasın diye
// hesaplar UTC üzerinden yapılır.

export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const AYLAR_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export const GUNLER_KISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function make(y: number, m: number, d: number): string {
  return iso(new Date(Date.UTC(y, m - 1, d)));
}

/** Cihazın yerel saatine göre bugün. */
export function today(now: Date = new Date()): string {
  return make(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(isoDate: string, n: number): string {
  const d = parse(isoDate);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
}

export function nights(checkIn: string, checkOut: string): number {
  return diffDays(checkIn, checkOut);
}

/** [checkIn, checkOut) aralığındaki her gece (giriş günleri). */
export function nightList(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) out.push(d);
  return out;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Pazartesi=0 ... Pazar=6 */
export function weekdayMon(isoDate: string): number {
  return (parse(isoDate).getUTCDay() + 6) % 7;
}

export function ym(isoDate: string): { y: number; m: number } {
  const [y, m] = isoDate.split('-').map(Number);
  return { y, m };
}

export function addMonths(y: number, m: number, n: number): { y: number; m: number } {
  const t = y * 12 + (m - 1) + n;
  return { y: Math.floor(t / 12), m: (t % 12) + 1 };
}

export function overlaps(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  return aIn < bOut && bIn < aOut;
}

/** "12 Tem 2026" */
export function fmt(isoDate: string | null | undefined, withYear = true): string {
  if (!isoDate) return '—';
  const { y, m } = ym(isoDate);
  const d = Number(isoDate.slice(8, 10));
  return withYear ? `${d} ${AYLAR_KISA[m - 1]} ${y}` : `${d} ${AYLAR_KISA[m - 1]}`;
}

/** "12 Tem → 19 Tem 2026" */
export function fmtRange(a: string, b: string): string {
  const sameYear = a.slice(0, 4) === b.slice(0, 4);
  return `${fmt(a, !sameYear)} → ${fmt(b)}`;
}

export function weekdayName(isoDate: string): string {
  return GUNLER_KISA[weekdayMon(isoDate)];
}
