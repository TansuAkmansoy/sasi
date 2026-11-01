import type { Agency, AppSettings, FeeSettings, Reservation, TextSettings, Villa } from './types.ts';
import { AYLAR, nights, parse } from './tarih.ts';
import { money } from './para.ts';
import { cancelDeadline, extrasOf, isShortStay, localTimeOf, stayOf } from './ucret.ts';
import { inResCurrency, moneyOf } from './durum.ts';

const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/** "12 Temmuz 2026 Pazar" */
export function fmtLong(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const d = parse(isoDate.slice(0, 10));
  return `${d.getUTCDate()} ${AYLAR[d.getUTCMonth()]} ${d.getUTCFullYear()} ${GUNLER[d.getUTCDay()]}`;
}

export const DEFAULT_FEES: FeeSettings = {
  currency: 'EUR',
  pet_fee_minor: null,
  short_stay_fee_minor: null,
  short_stay_nights: 5,
  check_in_time: '16:00',
  check_out_time: '10:00',
  cancel_months: 1,
};

export const DEFAULT_TEXTS: TextSettings = {
  usage: [
    '• Giriş saati {giris_saati}, çıkış saati {cikis_saati}. Erken giriş veya geç çıkış müsaitliğe bağlıdır; lütfen önceden sorunuz.',
    '• Villa, rezervasyonda belirtilen kişi sayısıyla kullanılmalıdır.',
    '• Villa içinde sigara içilmemelidir; balkon ve bahçe kullanılabilir.',
    '• Havuz çevresinde cam eşya kullanılmamalı, çocuklar yetişkin gözetiminde olmalıdır.',
    '• Komşularımızın huzuru için gece saatlerinde yüksek sesten kaçınılmalıdır.',
    '• Evcil hayvanla gelinecekse önceden bildirilmelidir.',
    '• Çıkışta anahtarlar teslim edilmeli, çöpler toplanmış olmalıdır.',
  ].join('\n'),
  terms: [
    'İPTAL: Rezervasyon, girişten {iptal_ay} ay öncesine kadar ({iptal_son_tarih}) iptal edilebilir. Bu tarihten sonra iptal kabul edilmez.',
    'ÖN ÖDEME: Ön ödeme, rezervasyonu yaptığınız acente tarafından alınır. Doğrudan rezervasyonlarda ön ödeme tarafımızca alınabilir.',
    'ÖDEME: Kalan tutar parçalar halinde ödenebilir. Toplam tutarın girişe kadar tamamlanması gerekir.',
    'GİRİŞ / ÇIKIŞ: Giriş saati {giris_saati}, çıkış saati {cikis_saati}.',
    'EVCİL HAYVAN: Evcil hayvanla konaklama önceden bildirilmelidir. Tek seferlik evcil hayvan ücreti alınır.',
    'KISA KONAKLAMA: {kisa_gece} geceden kısa konaklamalarda kısa konaklama (ekstra temizlik) ücreti alınır.',
  ].join('\n\n'),
  tpl_hold: [
    'Merhaba {misafir},',
    '',
    '{villa} için {giris} – {cikis} ({gece} gece) tarihlerini sizin adınıza {hold_bitis} saatine kadar ayırdık.',
    '',
    '{ucret_dokumu}',
    '',
    'Bu süre içinde onayınızı bekliyoruz. Onay gelmezse tarihler yeniden müsait hale gelecektir.',
    '',
    'KİRALAMA ŞARTLARI',
    '{kiralama_sartlari}',
  ].join('\n'),
  tpl_confirm: [
    'Merhaba {misafir},',
    '',
    '{villa} rezervasyonunuz onaylanmıştır.',
    '',
    'Giriş: {giris}, saat {giris_saati}',
    'Çıkış: {cikis}, saat {cikis_saati}',
    'Süre: {gece} gece{kisi_satiri}',
    '',
    '{ucret_dokumu}',
    '',
    '{odeme_durumu}',
    '',
    'KİRALAMA ŞARTLARI',
    '{kiralama_sartlari}',
    '',
    'VİLLA KULLANIM BİLGİLERİ',
    '{kullanim_bilgileri}',
    '',
    'İyi tatiller dileriz.',
  ].join('\n'),
};

export function mergeSettings(raw: Partial<{ fees: Partial<FeeSettings>; texts: Partial<TextSettings> }> | null | undefined): AppSettings {
  return {
    fees: { ...DEFAULT_FEES, ...(raw?.fees ?? {}) },
    texts: { ...DEFAULT_TEXTS, ...(raw?.texts ?? {}) },
  };
}

/** Metinde kullanılabilecek alanlar (Ayarlar ekranında yardım olarak gösterilir) */
export const VARIABLES: { key: string; label: string }[] = [
  { key: 'misafir', label: 'Misafir adı' },
  { key: 'villa', label: 'Villa adı' },
  { key: 'giris', label: 'Giriş tarihi' },
  { key: 'cikis', label: 'Çıkış tarihi' },
  { key: 'gece', label: 'Gece sayısı' },
  { key: 'kisi', label: 'Kişi sayısı' },
  { key: 'giris_saati', label: 'Giriş saati' },
  { key: 'cikis_saati', label: 'Çıkış saati' },
  { key: 'hold_bitis', label: 'Hold bitiş tarihi ve saati' },
  { key: 'konaklama_ucreti', label: 'Konaklama ücreti' },
  { key: 'evcil_hayvan_ucreti', label: 'Evcil hayvan ücreti' },
  { key: 'kisa_konaklama_ucreti', label: 'Kısa konaklama ücreti' },
  { key: 'toplam', label: 'Toplam tutar' },
  { key: 'ucret_dokumu', label: 'Ücret dökümü (çok satır)' },
  { key: 'alinan', label: 'Alınan ödeme' },
  { key: 'kalan', label: 'Kalan ödeme' },
  { key: 'odeme_durumu', label: 'Alınan ödemeler listesi ve kalan' },
  { key: 'iptal_son_tarih', label: 'Son iptal tarihi' },
  { key: 'iptal_ay', label: 'İptal süresi (ay)' },
  { key: 'kisa_gece', label: 'Kısa konaklama sınırı (gece)' },
  { key: 'acente', label: 'Acente adı' },
  { key: 'kiralama_sartlari', label: 'Kiralama şartları metni' },
  { key: 'kullanim_bilgileri', label: 'Villa kullanım bilgileri metni' },
];

export function fill(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{([a-z_]+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

const KIND_TR: Record<string, string> = { deposit: 'Ön ödeme', interim: 'Ara ödeme', balance: 'Kalan ödeme', refund: 'İade' };

export function buildVars(r: Reservation, villa: Villa | undefined, agency: Agency | undefined, s: AppSettings): Record<string, string> {
  const n = nights(r.check_in, r.check_out);
  const cur = r.currency;
  const m = moneyOf(r);
  const stay = stayOf(r);
  const petFee = r.pet ? r.pet_fee_minor ?? 0 : 0;
  const shortFee = r.short_stay_fee_minor ?? 0;
  const lines = [`Konaklama ücreti (${n} gece): ${money(stay, cur)}`];
  if (petFee) lines.push(`Evcil hayvan ücreti (tek sefer): ${money(petFee, cur)}`);
  if (shortFee) lines.push(`Kısa konaklama ücreti: ${money(shortFee, cur)}`);
  lines.push(`TOPLAM: ${money(r.gross_minor, cur)}`);

  const paid = r.payments
    .filter((p) => p.kind !== 'refund')
    .map((p) => `• ${fmtLong(p.paid_on).split(' ').slice(0, 3).join(' ')}: ${money(p.amount_minor, p.currency)}${p.currency !== cur && inResCurrency(p, r) != null ? ` (${money(inResCurrency(p, r)!, cur)})` : ''} — ${KIND_TR[p.kind]}`);
  const status = [paid.length ? `Alınan ödemeler:\n${paid.join('\n')}` : 'Henüz ödeme alınmadı.', `Kalan: ${money(m.remaining, cur)}`].join('\n');

  const base: Record<string, string> = {
    misafir: r.guest_name || 'Değerli misafirimiz',
    villa: villa?.name ?? 'Villa',
    giris: fmtLong(r.check_in),
    cikis: fmtLong(r.check_out),
    gece: String(n),
    kisi: r.guests_count ? String(r.guests_count) : '',
    kisi_satiri: r.guests_count ? `\nKişi: ${r.guests_count}` : '',
    giris_saati: s.fees.check_in_time,
    cikis_saati: s.fees.check_out_time,
    hold_bitis: r.hold_until ? `${fmtLong(localIso(r.hold_until))} ${localTimeOf(r.hold_until)}` : r.option_until ? fmtLong(r.option_until) : '—',
    konaklama_ucreti: money(stay, cur),
    evcil_hayvan_ucreti: money(petFee, cur),
    kisa_konaklama_ucreti: money(shortFee, cur),
    toplam: money(r.gross_minor, cur),
    ucret_dokumu: lines.join('\n'),
    alinan: money(m.net_received, cur),
    kalan: money(m.remaining, cur),
    odeme_durumu: status,
    iptal_son_tarih: fmtLong(cancelDeadline(r.check_in, s.fees)),
    iptal_ay: String(s.fees.cancel_months),
    kisa_gece: String(s.fees.short_stay_nights),
    acente: agency?.name ?? 'Direkt',
  };
  return {
    ...base,
    kiralama_sartlari: fill(s.texts.terms, base),
    kullanim_bilgileri: fill(s.texts.usage, base),
  };
}

function localIso(ts: string): string {
  const d = new Date(ts);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export type MessageKind = 'hold' | 'confirm' | 'terms';

export function buildMessage(kind: MessageKind, r: Reservation, villa: Villa | undefined, agency: Agency | undefined, s: AppSettings): string {
  const vars = buildVars(r, villa, agency, s);
  if (kind === 'terms') return `KİRALAMA ŞARTLARI\n${vars.kiralama_sartlari}\n\nVİLLA KULLANIM BİLGİLERİ\n${vars.kullanim_bilgileri}`;
  return fill(kind === 'hold' ? s.texts.tpl_hold : s.texts.tpl_confirm, vars)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Kısa konaklama mı ve ücret otomatik önerilmeli mi */
export function shortStayApplies(r: Pick<Reservation, 'check_in' | 'check_out'>, s: AppSettings): boolean {
  return isShortStay(nights(r.check_in, r.check_out), s.fees);
}

export { extrasOf };
