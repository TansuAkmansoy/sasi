import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HistoryEntry, MonthlyPrice, Reservation, Snapshot } from '../lib/types';
import { addDays, today, ym, addMonths } from '../lib/tarih';
import { findConflict } from '../lib/durum';
import { Backend, ConflictError, reservationRow } from './backend';

// Supabase kurulmadan uygulamayı denemek için telefonda saklanan örnek veri.
const KEY = 'sasi.demo.v1';

let seq = Date.now();
const uid = () => `demo-${(seq++).toString(36)}`;

function seed(): Snapshot {
  const t = today();
  const villas = [
    { id: 'v1', name: 'Villa Poyraz', sort: 1, currency: 'EUR' as const, active: true },
    { id: 'v2', name: 'Villa Seascape', sort: 2, currency: 'EUR' as const, active: true },
    { id: 'v3', name: 'Villa Shipahoy', sort: 3, currency: 'GBP' as const, active: true },
  ];
  const prices: MonthlyPrice[] = [];
  const { y, m } = ym(t);
  for (let i = -2; i < 14; i++) {
    const mm = addMonths(y, m, i);
    const season = [6, 7, 8].includes(mm.m) ? 1.6 : [5, 9].includes(mm.m) ? 1.2 : 0.8;
    prices.push({ villa_id: 'v1', year: mm.y, month: mm.m, weekly_minor: Math.round(5000 * season) * 100, currency: 'EUR' });
    prices.push({ villa_id: 'v2', year: mm.y, month: mm.m, weekly_minor: Math.round(4200 * season) * 100, currency: 'EUR' });
    prices.push({ villa_id: 'v3', year: mm.y, month: mm.m, weekly_minor: Math.round(3800 * season) * 100, currency: 'GBP' });
  }
  const base = (p: Partial<Reservation>): Reservation => ({
    id: uid(), villa_id: 'v1', status: 'confirmed', check_in: t, check_out: addDays(t, 7), option_until: null,
    guest_name: '', guest_phone: null, guest_email: null, guests_count: null, currency: 'EUR', gross_minor: 0,
    manual_price: false, agency_id: null, commission_pct: null, commission_minor: null, invoice_date: null,
    registry_done: false, registry_date: null, note: null, cancel_date: null, cancel_reason: null, refund_status: null,
    deduction_minor: null, payments: [], ...p,
  });
  const reservations: Reservation[] = [
    base({ villa_id: 'v1', check_in: addDays(t, -9), check_out: addDays(t, -2), guest_name: 'Emma Wilson', currency: 'GBP', gross_minor: 420000, agency_id: 'a1', commission_pct: 15, registry_done: true, registry_date: addDays(t, -9), payments: [{ id: uid(), kind: 'deposit', amount_minor: 120000, currency: 'GBP', rate: null, method: 'transfer', paid_on: addDays(t, -60) }, { id: uid(), kind: 'balance', amount_minor: 300000, currency: 'GBP', rate: null, method: 'cash', paid_on: addDays(t, -9) }] }),
    base({ villa_id: 'v1', check_in: addDays(t, -2), check_out: addDays(t, 5), guest_name: 'Mehmet Yılmaz', guest_phone: '+90 532 000 00 00', guests_count: 6, gross_minor: 350000, registry_done: true, registry_date: addDays(t, -2), payments: [{ id: uid(), kind: 'deposit', amount_minor: 100000, currency: 'EUR', rate: null, method: 'transfer', paid_on: addDays(t, -40) }] }),
    base({ villa_id: 'v2', check_in: t, check_out: addDays(t, 10), guest_name: 'James Brown', guests_count: 4, gross_minor: 600000, agency_id: 'a2', commission_pct: 20, payments: [{ id: uid(), kind: 'deposit', amount_minor: 200000, currency: 'EUR', rate: null, method: 'agency', paid_on: addDays(t, -30) }] }),
    base({ villa_id: 'v3', status: 'option', option_until: addDays(t, 1), check_in: addDays(t, 12), check_out: addDays(t, 19), guest_name: 'Sophie Taylor', currency: 'GBP', gross_minor: 304000 }),
    base({ villa_id: 'v1', check_in: addDays(t, 5), check_out: addDays(t, 13), guest_name: 'Ayşe Demir', gross_minor: 457100 }),
    base({ villa_id: 'v2', status: 'cancelled', check_in: addDays(t, 20), check_out: addDays(t, 27), guest_name: 'Oliver Smith', gross_minor: 420000, cancel_date: addDays(t, -3), cancel_reason: 'Uçuş iptali', refund_status: 'pending', deduction_minor: 50000, payments: [{ id: uid(), kind: 'deposit', amount_minor: 100000, currency: 'EUR', rate: null, method: 'transfer', paid_on: addDays(t, -50) }] }),
  ];
  return {
    villas,
    prices,
    agencies: [
      { id: 'a1', name: 'Kalkan Holidays', default_commission_pct: 15 },
      { id: 'a2', name: 'Villa Agency UK', default_commission_pct: 20 },
    ],
    reservations,
    links: [],
    fetchedAt: new Date().toISOString(),
  };
}

async function read(): Promise<Snapshot> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw) return JSON.parse(raw) as Snapshot;
  const s = seed();
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

async function write(s: Snapshot) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

const history = new Map<string, HistoryEntry[]>();

export function demoBackend(): Backend {
  return {
    kind: 'demo',
    async loadAll() {
      const s = await read();
      return { ...s, fetchedAt: new Date().toISOString() };
    },
    async saveReservation(r, payments) {
      const s = await read();
      const active = ['option', 'confirmed', 'completed'].includes(r.status);
      if (active && findConflict(s.reservations, r.villa_id, r.check_in, r.check_out, r.id)) throw new ConflictError();
      const id = r.id ?? uid();
      const row: Reservation = {
        ...(reservationRow(r) as Omit<Reservation, 'payments'>),
        id,
        updated_at: new Date().toISOString(),
        payments: payments.map((p) => ({ ...p, id: p.id ?? uid(), reservation_id: id })),
      };
      const old = s.reservations.find((x) => x.id === id);
      const h = history.get(id) ?? [];
      if (old) {
        const changes: Record<string, { old: unknown; new: unknown }> = {};
        for (const k of Object.keys(row) as (keyof Reservation)[]) {
          if (k === 'payments' || k === 'updated_at') continue;
          if (JSON.stringify(old[k] ?? null) !== JSON.stringify(row[k] ?? null)) changes[k] = { old: old[k] ?? null, new: row[k] ?? null };
        }
        if (Object.keys(changes).length) h.unshift({ id: Date.now(), reservation_id: id, changed_at: new Date().toISOString(), action: 'updated', changes });
      } else {
        h.unshift({ id: Date.now(), reservation_id: id, changed_at: new Date().toISOString(), action: 'created', changes: null });
      }
      history.set(id, h);
      s.reservations = [...s.reservations.filter((x) => x.id !== id), row].sort((a, b) => a.check_in.localeCompare(b.check_in));
      await write(s);
      return id;
    },
    async savePrices(villaId, currency, rows, removeMonths) {
      const s = await read();
      s.villas = s.villas.map((v) => (v.id === villaId ? { ...v, currency } : v));
      const key = (p: { year: number; month: number }) => `${p.year}-${p.month}`;
      const drop = new Set([...rows.map(key), ...removeMonths.map(key)]);
      s.prices = [...s.prices.filter((p) => p.villa_id !== villaId || !drop.has(key(p))), ...rows];
      await write(s);
    },
    async saveAgency(a) {
      const s = await read();
      if (a.id) s.agencies = s.agencies.map((x) => (x.id === a.id ? { ...x, name: a.name, default_commission_pct: a.default_commission_pct ?? null } : x));
      else s.agencies.push({ id: uid(), name: a.name, default_commission_pct: a.default_commission_pct ?? null });
      await write(s);
    },
    async deleteAgency(id) {
      const s = await read();
      s.agencies = s.agencies.filter((x) => x.id !== id);
      s.reservations = s.reservations.map((r) => (r.agency_id === id ? { ...r, agency_id: null } : r));
      await write(s);
    },
    async createLink(label, kind, tokenHash) {
      const s = await read();
      const id = uid();
      s.links.unshift({ id, label, kind, token_hash: tokenHash, created_at: new Date().toISOString(), revoked: false });
      await write(s);
      return id;
    },
    async revokeLink(id) {
      const s = await read();
      s.links = s.links.map((l) => (l.id === id ? { ...l, revoked: true } : l));
      await write(s);
    },
    async history(reservationId) {
      return history.get(reservationId) ?? [];
    },
    async signOut() {
      await AsyncStorage.removeItem(KEY);
    },
  };
}
