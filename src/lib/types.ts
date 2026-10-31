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
  gross_minor: number;
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
  changes: Record<string, { old: unknown; new: unknown }> | null;
}

export interface Snapshot {
  villas: Villa[];
  prices: MonthlyPrice[];
  agencies: Agency[];
  reservations: Reservation[];
  links: ShareLink[];
  fetchedAt: string;
}

export const STATUS_LABEL: Record<Status, string> = {
  option: 'Opsiyon',
  confirmed: 'Onaylı',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  option_released: 'Opsiyon bırakıldı',
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
