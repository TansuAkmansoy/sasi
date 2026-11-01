import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { parseTcmb, Rates, tcmbUrl } from '../lib/kur';
import { addDays, today } from '../lib/tarih';

// TCMB kurları: bugünkü bülten 3 saat önbellekte tutulur; geçmiş günlerin
// bülteni bir kez indirilip kalıcı saklanır (hafta sonu/tatilde önceki iş günü).

const TODAY_KEY = 'sasi.fx.today';
const dayKey = (d: string) => `sasi.fx.${d}`;
const memory = new Map<string, Rates>();

/**
 * Tarayıcı (iPhone web sürümü) TCMB'den doğrudan okuyamaz (CORS). Android uygulama
 * indirdiği bültenleri Supabase'e (app_settings, "fx:..." anahtarları) yazar;
 * web sürümü oradan okur.
 */
export interface FxRemote {
  save(key: string, rates: Rates): void;
  load(key: string): Promise<Rates | null>;
}
let remote: FxRemote | null = null;
export function setFxRemote(r: FxRemote | null) {
  remote = r;
}
const isWeb = Platform.OS === 'web';
const pending = new Map<string, Promise<Rates | null>>();

async function fetchXml(url: string): Promise<Rates | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/xml,text/xml' } });
    if (!res.ok) return null;
    return parseTcmb(await res.text());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadToday(): Promise<Rates | null> {
  if (isWeb) return (await remote?.load('fx:today').catch(() => null)) ?? null;
  const raw = await AsyncStorage.getItem(TODAY_KEY).catch(() => null);
  const cached = raw ? (JSON.parse(raw) as { at: number; rates: Rates }) : null;
  if (cached && Date.now() - cached.at < 3 * 3600_000) return cached.rates;
  const fresh = await fetchXml(tcmbUrl());
  if (fresh) {
    AsyncStorage.setItem(TODAY_KEY, JSON.stringify({ at: Date.now(), rates: fresh })).catch(() => {});
    remote?.save('fx:today', fresh);
    return fresh;
  }
  return cached?.rates ?? null; // çevrimdışı: son bilinen kur
}

async function loadDay(date: string): Promise<Rates | null> {
  if (date >= today()) return loadToday();
  if (isWeb) return (await remote?.load(`fx:${date}`).catch(() => null)) ?? (await loadToday());
  const raw = await AsyncStorage.getItem(dayKey(date)).catch(() => null);
  if (raw) return JSON.parse(raw) as Rates;
  // TCMB o gün bülten yayımlamadıysa (hafta sonu, tatil) önceki günlere bak
  for (let i = 0; i < 8; i++) {
    const d = addDays(date, -i);
    const r = await fetchXml(tcmbUrl(d));
    if (r) {
      AsyncStorage.setItem(dayKey(date), JSON.stringify(r)).catch(() => {});
      remote?.save(`fx:${date}`, r);
      return r;
    }
  }
  return null;
}

/** Kurlar: date verilmezse bugünkü bülten */
export function getRates(date?: string | null): Promise<Rates | null> {
  const key = date && date < today() ? date : 'today';
  const m = memory.get(key);
  if (m) return Promise.resolve(m);
  let p = pending.get(key);
  if (!p) {
    p = (key === 'today' ? loadToday() : loadDay(key)).then((r) => {
      if (r) memory.set(key, r);
      pending.delete(key);
      return r;
    });
    pending.set(key, p);
  }
  return p;
}

export function useRates(date?: string | null): { rates: Rates | null; loading: boolean } {
  const [state, setState] = useState<{ rates: Rates | null; loading: boolean }>({ rates: memory.get(date && date < today() ? date : 'today') ?? null, loading: true });
  useEffect(() => {
    let alive = true;
    getRates(date).then((rates) => alive && setState({ rates, loading: false }));
    return () => {
      alive = false;
    };
  }, [date]);
  return state;
}
