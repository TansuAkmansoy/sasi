import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Agency, HistoryEntry, MonthlyPrice, Payment, Reservation, ShareLink, Snapshot, Villa } from '../lib/types';
import { Backend, ConflictError, reservationRow } from './backend';

let client: SupabaseClient | null = null;
let clientKey = '';

export function getClient(url: string, key: string): SupabaseClient {
  const k = `${url}|${key}`;
  if (client && clientKey === k) return client;
  client = createClient(url, key, {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
  clientKey = k;
  return client;
}

let appStateHooked = false;
function hookAppState() {
  if (appStateHooked) return;
  appStateHooked = true;
  AppState.addEventListener('change', (s) => {
    if (!client) return;
    if (s === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
}

function friendly(e: unknown): Error {
  const err = e as { message?: string; code?: string };
  if (err?.code === '23P01') return new ConflictError();
  const msg = err?.message ?? String(e);
  if (/Failed to fetch|Network request failed|fetch failed/i.test(msg)) return new Error('İnternet bağlantısı yok. Bağlantını kontrol edip tekrar dene.');
  if (/JWT|not authenticated|permission denied/i.test(msg)) return new Error('Oturum süresi doldu. Çıkış yapıp yeniden giriş yap.');
  return new Error(msg);
}

const num = (v: unknown): number | null => (v == null ? null : Number(v));

function mapReservation(row: any): Reservation {
  return {
    ...row,
    gross_minor: Number(row.gross_minor ?? 0),
    commission_pct: num(row.commission_pct),
    commission_minor: num(row.commission_minor),
    deduction_minor: num(row.deduction_minor),
    guests_count: num(row.guests_count),
    payments: ((row.payments ?? []) as any[])
      .map((p) => ({ ...p, amount_minor: Number(p.amount_minor), rate: num(p.rate) }) as Payment)
      .sort((a, b) => a.paid_on.localeCompare(b.paid_on)),
  };
}

export async function signIn(url: string, key: string, email: string, password: string): Promise<void> {
  const c = getClient(url, key);
  const { error } = await c.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    if (/Invalid login/i.test(error.message)) throw new Error('E-posta veya şifre hatalı.');
    throw friendly(error);
  }
}

export async function hasSession(url: string, key: string): Promise<boolean> {
  const c = getClient(url, key);
  const { data } = await c.auth.getSession();
  return !!data.session;
}

export function supabaseBackend(url: string, key: string): Backend {
  const c = getClient(url, key);
  hookAppState();
  return {
    kind: 'supabase',
    async loadAll(): Promise<Snapshot> {
      const [v, p, a, r, l] = await Promise.all([
        c.from('villas').select('*').order('sort'),
        c.from('monthly_prices').select('*'),
        c.from('agencies').select('*').order('name'),
        c.from('reservations').select('*, payments(*)').order('check_in'),
        c.from('share_links').select('*').order('created_at', { ascending: false }),
      ]);
      for (const x of [v, p, a, r, l]) if (x.error) throw friendly(x.error);
      return {
        villas: (v.data ?? []) as Villa[],
        prices: ((p.data ?? []) as any[]).map((x) => ({ ...x, weekly_minor: Number(x.weekly_minor) })) as MonthlyPrice[],
        agencies: ((a.data ?? []) as any[]).map((x) => ({ ...x, default_commission_pct: num(x.default_commission_pct) })) as Agency[],
        reservations: (r.data ?? []).map(mapReservation),
        links: (l.data ?? []) as ShareLink[],
        fetchedAt: new Date().toISOString(),
      };
    },
    async saveReservation(r, payments) {
      const pays = payments.map((p) => ({
        id: p.id ?? null,
        kind: p.kind,
        amount_minor: p.amount_minor,
        currency: p.currency,
        rate: p.rate,
        method: p.method,
        paid_on: p.paid_on,
      }));
      const { data, error } = await c.rpc('save_reservation', { p: reservationRow(r), pays });
      if (error) throw friendly(error);
      return data as string;
    },
    async savePrices(villaId, currency, rows, removeMonths) {
      const u = await c.from('villas').update({ currency }).eq('id', villaId);
      if (u.error) throw friendly(u.error);
      if (rows.length) {
        const { error } = await c.from('monthly_prices').upsert(rows, { onConflict: 'villa_id,year,month' });
        if (error) throw friendly(error);
      }
      for (const m of removeMonths) {
        const { error } = await c.from('monthly_prices').delete().match({ villa_id: villaId, year: m.year, month: m.month });
        if (error) throw friendly(error);
      }
    },
    async saveAgency(a) {
      const { error } = a.id
        ? await c.from('agencies').update({ name: a.name, default_commission_pct: a.default_commission_pct ?? null }).eq('id', a.id)
        : await c.from('agencies').insert({ name: a.name, default_commission_pct: a.default_commission_pct ?? null });
      if (error) throw friendly(error);
    },
    async deleteAgency(id) {
      const { error } = await c.from('agencies').delete().eq('id', id);
      if (error) throw friendly(error);
    },
    async createLink(label, kind, tokenHash) {
      const { data, error } = await c.from('share_links').insert({ label, kind, token_hash: tokenHash }).select('id').single();
      if (error) throw friendly(error);
      return (data as { id: string }).id;
    },
    async revokeLink(id) {
      const { error } = await c.from('share_links').update({ revoked: true }).eq('id', id);
      if (error) throw friendly(error);
    },
    async history(reservationId) {
      const { data, error } = await c
        .from('reservation_history')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('changed_at', { ascending: false });
      if (error) throw friendly(error);
      return (data ?? []) as HistoryEntry[];
    },
    async signOut() {
      await c.auth.signOut();
    },
  };
}
