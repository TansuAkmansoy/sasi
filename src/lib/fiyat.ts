import type { Currency, MonthlyPrice } from './types.ts';
import { nightList, ym, AYLAR_KISA } from './tarih.ts';

export interface PriceLine {
  year: number;
  month: number;
  label: string; // "Tem 2026"
  nights: number;
  weekly_minor: number;
  /** satır tutarı (gösterim için yuvarlanmış) */
  subtotal_minor: number;
}

export interface PriceResult {
  ok: boolean;
  nights: number;
  lines: PriceLine[];
  total_minor: number;
  currency: Currency | null;
  missingMonths: string[]; // "Ağu 2026"
  mixedCurrency: boolean;
}

/**
 * Haftalık ücretlerden konaklama fiyatı. Gece ücreti = o ayın haftalık ücreti / 7.
 * Her gece kendi ayının fiyatıyla sayılır; yuvarlama yalnızca toplamda yapılır.
 */
export function calcPrice(villaId: string, checkIn: string, checkOut: string, prices: MonthlyPrice[]): PriceResult {
  const list = checkIn && checkOut && checkOut > checkIn ? nightList(checkIn, checkOut) : [];
  const byMonth = new Map<string, number>();
  for (const n of list) {
    const { y, m } = ym(n);
    const k = `${y}-${m}`;
    byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
  }
  const lines: PriceLine[] = [];
  const missing: string[] = [];
  const currencies = new Set<Currency>();
  let exact = 0; // minor * 7 cinsinden tam toplam (kayan nokta hatası olmasın)
  for (const [k, count] of byMonth) {
    const [y, m] = k.split('-').map(Number);
    const label = `${AYLAR_KISA[m - 1]} ${y}`;
    const p = prices.find((x) => x.villa_id === villaId && x.year === y && x.month === m);
    if (!p) {
      missing.push(label);
      continue;
    }
    currencies.add(p.currency);
    exact += p.weekly_minor * count;
    lines.push({ year: y, month: m, label, nights: count, weekly_minor: p.weekly_minor, subtotal_minor: Math.round((p.weekly_minor * count) / 7) });
  }
  const mixed = currencies.size > 1;
  return {
    ok: list.length > 0 && missing.length === 0 && !mixed,
    nights: list.length,
    lines,
    total_minor: Math.round(exact / 7),
    currency: currencies.size === 1 ? [...currencies][0] : null,
    missingMonths: missing,
    mixedCurrency: mixed,
  };
}
