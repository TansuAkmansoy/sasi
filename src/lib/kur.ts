import type { Currency } from './types.ts';

/** 1 birim yabancı para = kaç TL (TCMB döviz satış kuru). TRY = 1. */
export interface Rates {
  /** TCMB bülten tarihi 'YYYY-MM-DD' */
  date: string;
  TRY: number;
  EUR: number;
  GBP: number;
  USD: number;
}

/** TCMB günlük kur adresi. date verilmezse bugünkü (son yayımlanan) bülten. */
export function tcmbUrl(dateIso?: string | null): string {
  if (!dateIso) return 'https://www.tcmb.gov.tr/kurlar/today.xml';
  const [y, m, d] = dateIso.split('-');
  return `https://www.tcmb.gov.tr/kurlar/${y}${m}/${d}${m}${y}.xml`;
}

const num = (s: string | undefined): number | null => {
  if (!s) return null;
  const n = Number(s.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** TCMB XML bültenini okur (ForexSelling, birime bölünmüş). Eksik/bozuk bültende null. */
export function parseTcmb(xml: string): Rates | null {
  const dm = /Tarih_Date[^>]*\sDate="(\d{2})\/(\d{2})\/(\d{4})"/.exec(xml);
  const tm = /Tarih_Date[^>]*\sTarih="(\d{2})\.(\d{2})\.(\d{4})"/.exec(xml);
  const date = dm ? `${dm[3]}-${dm[1]}-${dm[2]}` : tm ? `${tm[3]}-${tm[2]}-${tm[1]}` : null;
  if (!date) return null;
  const out: Partial<Rates> = { date, TRY: 1 };
  const re = /<Currency\b[^>]*CurrencyCode="([A-Z]{3})"[^>]*>([\s\S]*?)<\/Currency>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const code = m[1] as Currency;
    if (code !== 'EUR' && code !== 'GBP' && code !== 'USD') continue;
    const body = m[2];
    const tag = (t: string) => new RegExp(`<${t}>([^<]*)</${t}>`).exec(body)?.[1];
    const unit = num(tag('Unit')) ?? 1;
    const v = num(tag('ForexSelling')) ?? num(tag('BanknoteSelling'));
    if (v) out[code] = v / unit;
  }
  return out.EUR && out.GBP && out.USD ? (out as Rates) : null;
}

/** from para biriminden to para birimine çapraz kur (1 from = ? to) */
export function crossRate(from: Currency, to: Currency, r: Rates): number {
  return r[from] / r[to];
}

export function convert(minor: number, from: Currency, to: Currency, r: Rates): number {
  if (from === to) return minor;
  return Math.round(minor * crossRate(from, to, r));
}
