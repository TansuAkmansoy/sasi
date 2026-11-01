import type { Payment, Reservation } from './types.ts';
import { ACTIVE_STATUSES } from './types.ts';
import { addDays, overlaps } from './tarih.ts';

export function isActive(r: Pick<Reservation, 'status'>): boolean {
  return ACTIVE_STATUSES.includes(r.status);
}

/** Ödeme tutarını rezervasyonun para birimine çevirir (kur yoksa çevrilemez → null). */
export function inResCurrency(p: Payment, r: Pick<Reservation, 'currency'>): number | null {
  if (p.currency === r.currency) return p.amount_minor;
  if (p.rate == null || !(p.rate > 0)) return null;
  return Math.round(p.amount_minor * p.rate);
}

export interface Money {
  /** alınan (iadeler düşülmeden) */
  received: number;
  refunded: number;
  /** alınan − iade */
  net_received: number;
  remaining: number;
  commission: number;
  net_income: number;
  deposit: number;
  /** kuru girilmemiş farklı para birimli ödeme var */
  unconverted: boolean;
}

export function commissionOf(r: Pick<Reservation, 'gross_minor' | 'commission_minor' | 'commission_pct' | 'agency_id'>): number {
  if (!r.agency_id) return 0;
  if (r.commission_minor != null) return r.commission_minor;
  if (r.commission_pct != null) return Math.round((r.gross_minor * r.commission_pct) / 100);
  return 0;
}

export function moneyOf(r: Reservation): Money {
  let received = 0;
  let refunded = 0;
  let deposit = 0;
  let unconverted = false;
  for (const p of r.payments) {
    const v = inResCurrency(p, r);
    if (v == null) {
      unconverted = true;
      continue;
    }
    if (p.kind === 'refund') refunded += v;
    else received += v;
    if (p.kind === 'deposit') deposit += v;
  }
  const commission = commissionOf(r);
  const net_received = received - refunded;
  return {
    received,
    refunded,
    net_received,
    remaining: r.status === 'cancelled' || r.status === 'option_released' ? 0 : Math.max(0, r.gross_minor - net_received),
    commission,
    net_income: r.gross_minor - commission,
    deposit,
    unconverted,
  };
}

/** Çıkış tarihi gelmiş ama henüz arşive alınmamış (kullanıcı onayı bekliyor) */
export function awaitingCompletion(r: Reservation, todayIso: string): boolean {
  return r.status === 'confirmed' && r.check_out <= todayIso;
}

/** Hold süresi doldu mu? Saatli hold varsa ana göre, yoksa güne göre. */
export function optionExpired(r: Pick<Reservation, 'status' | 'option_until' | 'hold_until'>, todayIso: string, nowMs: number = Date.now()): boolean {
  if (r.status !== 'option') return false;
  if (r.hold_until) return Date.parse(r.hold_until) <= nowMs;
  return !!r.option_until && r.option_until <= todayIso;
}

/** Hold yakında bitiyor mu? (saatli: 12 saat içinde; günlük: yarın veya önce) */
export function optionDueSoon(r: Pick<Reservation, 'status' | 'option_until' | 'hold_until'>, todayIso: string, nowMs: number = Date.now()): boolean {
  if (r.status !== 'option') return false;
  if (r.hold_until) return Date.parse(r.hold_until) <= nowMs + 12 * 3600_000;
  return !!r.option_until && r.option_until <= addDays(todayIso, 1);
}

export type Missing = 'invoice' | 'registry' | 'payment';
export const MISSING_LABEL: Record<Missing, string> = {
  invoice: 'Fatura yok',
  registry: 'Defter yok',
  payment: 'Ödeme eksik',
};

/** Konaklaması başlamış onaylı/tamamlanmış kayıtlarda eksik işler */
export function missingOf(r: Reservation, todayIso: string): Missing[] {
  if (r.status !== 'confirmed' && r.status !== 'completed') return [];
  const out: Missing[] = [];
  const started = r.check_in <= todayIso;
  if (started && !r.registry_done) out.push('registry');
  if (r.check_out <= todayIso && !r.invoice_date) out.push('invoice');
  const m = moneyOf(r);
  if (m.remaining > 0 && r.check_in <= addDays(todayIso, 14)) out.push('payment');
  return out;
}

/** Bir villada [a,b) aralığıyla çakışan aktif rezervasyon (kendisi hariç) */
export function findConflict(all: Reservation[], villaId: string, a: string, b: string, selfId?: string): Reservation | undefined {
  return all.find((r) => r.id !== selfId && r.villa_id === villaId && isActive(r) && overlaps(a, b, r.check_in, r.check_out));
}

/** Villanın dolu geceleri (kendisi hariç) */
export function busyNights(all: Reservation[], villaId: string, selfId?: string): Set<string> {
  const s = new Set<string>();
  for (const r of all) {
    if (r.id === selfId || r.villa_id !== villaId || !isActive(r)) continue;
    for (let d = r.check_in; d < r.check_out; d = addDays(d, 1)) s.add(d);
  }
  return s;
}
