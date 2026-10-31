import type { Agency, Currency, HistoryEntry, LinkKind, MonthlyPrice, Payment, Reservation, Snapshot } from '../lib/types';

export class ConflictError extends Error {
  constructor() {
    super('Bu tarihler bu villada dolu. Takvimi yenileyip tekrar dene.');
    this.name = 'ConflictError';
  }
}

export interface Backend {
  kind: 'supabase' | 'demo';
  loadAll(): Promise<Snapshot>;
  /** Ödemelerle birlikte tek işlemde kaydeder, kayıt id'sini döner. Çakışmada ConflictError fırlatır. */
  saveReservation(r: Omit<Reservation, 'payments'>, payments: Payment[]): Promise<string>;
  savePrices(villaId: string, currency: Currency, rows: MonthlyPrice[], removeMonths: { year: number; month: number }[]): Promise<void>;
  saveAgency(a: Partial<Agency> & { name: string }): Promise<void>;
  deleteAgency(id: string): Promise<void>;
  createLink(label: string, kind: LinkKind, tokenHash: string): Promise<string>;
  revokeLink(id: string): Promise<void>;
  history(reservationId: string): Promise<HistoryEntry[]>;
  signOut(): Promise<void>;
}

/** Rezervasyonun veritabanına giden alanları */
export function reservationRow(r: Omit<Reservation, 'payments'> & { payments?: unknown }) {
  const { payments: _p, created_at: _c, updated_at: _u, ...rest } = r as Reservation;
  return rest;
}
