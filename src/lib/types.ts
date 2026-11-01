export type Currency = 'TRY' | 'EUR' | 'GBP' | 'USD';
export const CURRENCIES: Currency[] = ['EUR', 'GBP', 'USD', 'TRY'];

export type Status = 'option' | 'confirmed' | 'completed' | 'cancelled' | 'option_released';
export const ACTIVE_STATUSES: Status[] = ['option', 'confirmed', 'completed'];

export type PaymentKind = 'deposit' | 'interim' | 'balance' | 'refund';
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'agency' | 'other';
export type RefundStatus = 'pending' | 'refunded' | 'none';
export type LinkKind = 'availability' | 'admin';

/** Tarihler her yerde 'YYYY-MM-DD' metni olarak tutulur. Tutarlar minor birimde (kuruş/cent) tamsayıdır. */
export interface Villa {
  id: string;
  name: string;
  sort: number;
  currency: Currency;
  active: boolean;
}

export interface MonthlyPrice {
  villa_id: string;
  year: number;
  month: number; // 1-12
  weekly_minor: number;
  currency: Currency;
}

export interface Agency {
  id: string;
  name: string;
  default_commission_pct: number | null;
}

export interface Payment {
  id?: string;
  reservation_id?: string;
  kind: PaymentKind;
  amount_minor: number;
  currency: Currency;
  /** 1 birim ödeme para birimi = rate birim rezervasyon para birimi */
  rate: number | null;
  method: PaymentMethod;
  paid_on: string;
}

export interface Reservation {
  id?: string;
  villa_id: string;
  status: Status;
  check_in: string;
  check_out: string;
  option_until: string | null;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  guests_count: number | null;
  currency: Currency;
  /** brüt = konaklama ücreti + evcil hayvan ücreti + kısa konaklama ücreti */
  gross_minor: number;
  /** konaklama ücreti (gece ücretlerinin toplamı); null ise eski kayıt: brüt − ekstralar */
  stay_minor: number | null;
  /** fiyat listesinden hesaplanan (önerilen) konaklama ücreti; anlaşılan ücret stay_minor'dır */
  suggested_minor: number | null;
  pet: boolean;
  pet_fee_minor: number | null;
  short_stay_fee_minor: number | null;
  /** hold bitiş anı (ISO zaman damgası) */
  hold_until: string | null;
  manual_price: boolean;
  agency_id: string | null;
  commission_pct: number | null;
  commission_minor: number | null;
  invoice_date: string | null;
  registry_done: boolean;
  registry_date: string | null;
  note: string | null;
  cancel_date: string | null;
  cancel_reason: string | null;
  refund_status: RefundStatus | null;
  deduction_minor: number | null;
  created_at?: string;
  updated_at?: string;
  payments: Payment[];
}

export interface ShareLink {
  id: string;
  label: string;
  kind: LinkKind;
  token_hash: string;
  created_at: string;
  revoked: boolean;
}

export interface HistoryEntry {
  id: number;
  reservation_id: string;
  changed_at: string;
  action: 'created' | 'updated';
  /** değişikliği yapan hesabın e-postası (1.3'ten itibaren) */
  actor?: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
}

export interface FeeSettings {
  currency: Currency;
  pet_fee_minor: number | null;
  short_stay_fee_minor: number | null;
  /** bu geceden az konaklamalar "kısa konaklama" sayılır */
  short_stay_nights: number;
  check_in_time: string;
  check_out_time: string;
  /** iptal: girişten kaç ay öncesine kadar */
  cancel_months: number;
}

export interface TextSettings {
  usage: string;
  terms: string;
  tpl_hold: string;
  tpl_confirm: string;
}

export interface AppSettings {
  fees: FeeSettings;
  texts: TextSettings;
}

export interface Snapshot {
  settings: AppSettings;
  villas: Villa[];
  prices: MonthlyPrice[];
  agencies: Agency[];
  reservations: Reservation[];
  links: ShareLink[];
  fetchedAt: string;
}

export const STATUS_LABEL: Record<Status, string> = {
  option: 'Hold',
  confirmed: 'Onaylı',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  option_released: 'Hold bırakıldı',
};

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  deposit: 'Ön ödeme',
  interim: 'Ara ödeme',
  balance: 'Kalan ödeme',
  refund: 'İade',
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Nakit',
  transfer: 'Havale/EFT',
  card: 'Kredi kartı',
  agency: 'Acente üzerinden',
  other: 'Diğer',
};

export const REFUND_LABEL: Record<RefundStatus, string> = {
  pending: 'İade bekliyor',
  refunded: 'İade edildi',
  none: 'İade yok',
};
