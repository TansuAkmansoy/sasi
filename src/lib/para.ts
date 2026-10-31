import type { Currency } from './types.ts';

export const SYMBOL: Record<Currency, string> = { TRY: '₺', EUR: '€', GBP: '£', USD: '$' };

/** 125000 → "1.250,00 €"  (kuruşsuz tutarlarda ",00" gösterilmez: "1.250 €") */
export function money(minor: number | null | undefined, cur: Currency, alwaysDecimals = false): string {
  const v = Math.round(minor ?? 0);
  const neg = v < 0;
  const abs = Math.abs(v);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const dec = alwaysDecimals || frac !== 0 ? ',' + frac.toString().padStart(2, '0') : '';
  return `${neg ? '−' : ''}${wholeStr}${dec} ${SYMBOL[cur]}`;
}

/** Kullanıcı girişini minor birime çevirir. "1.250,50" → 125050, "1250.5" → 125050, "" → null */
export function parseMoney(text: string): number | null {
  let s = text.replace(/[\s₺€£$]/g, '');
  if (!s) return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, '');
  } else if (/^\d{1,3}\.\d{3}$/.test(s)) {
    // "1.250" Türkçe binlik ayırıcı kabul edilir
    s = s.replace('.', '');
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

/** Minor tutarı düzenleme alanı için metne çevirir: 125050 → "1250,50", 125000 → "1250" */
export function moneyInput(minor: number | null | undefined): string {
  if (minor == null) return '';
  const whole = Math.trunc(minor / 100);
  const frac = Math.abs(minor % 100);
  return frac ? `${whole},${frac.toString().padStart(2, '0')}` : `${whole}`;
}

export function parseNumber(text: string): number | null {
  const s = text.replace(/\s/g, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Para birimine göre ayrı toplamlar */
export type Totals = Partial<Record<Currency, number>>;

export function addTo(t: Totals, cur: Currency, minor: number): void {
  t[cur] = (t[cur] ?? 0) + minor;
}

export function totalsText(t: Totals): string {
  const parts = (Object.keys(t) as Currency[]).filter((c) => (t[c] ?? 0) !== 0).map((c) => money(t[c]!, c));
  return parts.length ? parts.join(' · ') : '—';
}
