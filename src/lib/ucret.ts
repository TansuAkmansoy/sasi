import type { FeeSettings, Reservation } from './types.ts';
import { addDays, diffDays, parse, iso } from './tarih.ts';

/** Rezervasyondaki ekstra ücretler (evcil hayvan + kısa konaklama) */
export function extrasOf(r: Pick<Reservation, 'pet' | 'pet_fee_minor' | 'short_stay_fee_minor'>): number {
  return (r.pet ? r.pet_fee_minor ?? 0 : 0) + (r.short_stay_fee_minor ?? 0);
}

/** Konaklama ücreti. Eski kayıtlarda stay_minor boşsa brütten ekstralar düşülür. */
export function stayOf(r: Pick<Reservation, 'stay_minor' | 'gross_minor' | 'pet' | 'pet_fee_minor' | 'short_stay_fee_minor'>): number {
  return r.stay_minor ?? r.gross_minor - extrasOf(r);
}

export function grossOf(stay: number, pet: boolean, petFee: number | null, shortFee: number | null): number {
  return stay + (pet ? petFee ?? 0 : 0) + (shortFee ?? 0);
}

export function isShortStay(nights: number, fees: Pick<FeeSettings, 'short_stay_nights'>): boolean {
  return nights > 0 && nights < fees.short_stay_nights;
}

/** Girişten n ay önceki gün (ayın son gününe kırpılır): 31 Mart − 1 ay = 28/29 Şubat */
export function minusMonths(checkIn: string, months: number): string {
  const d = parse(checkIn);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() - months;
  const day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return iso(new Date(Date.UTC(y, m, Math.min(day, last))));
}

export function cancelDeadline(checkIn: string, fees: Pick<FeeSettings, 'cancel_months'>): string {
  return minusMonths(checkIn, fees.cancel_months);
}

export interface PlanItem {
  date: string;
  amount_minor: number;
}

/**
 * Kalan tutarı [başlangıç, vade] arasında eşit aralıklı parçalara böler.
 * Parçalar tam birime (100 minor) yuvarlanır; kuruş farkı son parçaya eklenir.
 */
export function paymentPlan(remaining: number, startIso: string, dueIso: string, parts: number): PlanItem[] {
  if (remaining <= 0) return [];
  const n = Math.max(1, Math.floor(parts));
  const span = diffDays(startIso, dueIso);
  if (span <= 0 || n === 1) return [{ date: span <= 0 ? startIso : dueIso, amount_minor: remaining }];
  const each = Math.floor(remaining / n / 100) * 100;
  const out: PlanItem[] = [];
  for (let i = 1; i <= n; i++) {
    const date = addDays(startIso, Math.round((i * span) / n));
    out.push({ date, amount_minor: i === n ? remaining - each * (n - 1) : each });
  }
  return out;
}

/** Hold bitişi: şimdiden itibaren saat (24/48) */
export function holdUntilFromNow(hours: number, now: Date = new Date()): string {
  return new Date(now.getTime() + hours * 3600_000).toISOString();
}

/** Zaman damgasının yerel tarih kısmı ('YYYY-MM-DD') */
export function localDateOf(isoTs: string): string {
  const d = new Date(isoTs);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function localTimeOf(isoTs: string): string {
  const d = new Date(isoTs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
