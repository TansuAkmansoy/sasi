import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import type { Agency, Currency, LinkKind, MonthlyPrice, Payment, Reservation, Snapshot } from './lib/types';
import type { Backend } from './data/backend';
import { supabaseBackend, signIn, hasSession } from './data/supabase';
import { demoBackend } from './data/demo';
import { syncOptionReminders } from './data/bildirim';

export const DEFAULT_SHARE_BASE = 'https://tansuakmansoy.github.io/sasi/';

export interface Config {
  mode: 'supabase' | 'demo';
  url: string;
  key: string;
  shareBase: string;
}

const CONFIG_KEY = 'sasi.config';
const CACHE_KEY = 'sasi.cache';
const TOKENS_KEY = 'sasi.linkTokens';

type Phase = 'loading' | 'setup' | 'login' | 'ready';

interface State {
  phase: Phase;
  config: Config | null;
  backend: Backend | null;
  data: Snapshot | null;
  refreshing: boolean;
  /** veriler sunucudan değil, telefondaki son kopyadan gösteriliyor */
  offline: boolean;
  error: string | null;
  linkTokens: Record<string, string>;

  boot(): Promise<void>;
  configure(url: string, key: string): Promise<void>;
  login(email: string, password: string): Promise<void>;
  startDemo(): Promise<void>;
  resetConnection(): Promise<void>;
  signOut(): Promise<void>;
  setShareBase(base: string): Promise<void>;
  refresh(): Promise<void>;
  saveReservation(r: Omit<Reservation, 'payments'>, payments: Payment[]): Promise<string>;
  savePrices(villaId: string, currency: Currency, rows: MonthlyPrice[], remove: { year: number; month: number }[]): Promise<void>;
  saveAgency(a: Partial<Agency> & { name: string }): Promise<void>;
  deleteAgency(id: string): Promise<void>;
  createLink(label: string, kind: LinkKind): Promise<string>;
  revokeLink(id: string): Promise<void>;
  linkUrl(id: string): string | null;
}

function normalizeUrl(u: string): string {
  let s = u.trim().replace(/\/+$/, '');
  if (s && !/^https?:\/\//.test(s)) s = 'https://' + s;
  if (/^https:\/\/[a-z0-9]{15,}$/.test(s)) s = s + '.supabase.co';
  return s;
}

function makeBackend(c: Config): Backend {
  return c.mode === 'demo' ? demoBackend() : supabaseBackend(c.url, c.key);
}

async function saveConfig(c: Config | null) {
  if (c) await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(c));
  else await AsyncStorage.removeItem(CONFIG_KEY);
}

export const useStore = create<State>((set, get) => ({
  phase: 'loading',
  config: null,
  backend: null,
  data: null,
  refreshing: false,
  offline: false,
  error: null,
  linkTokens: {},

  async boot() {
    try {
      const [raw, tokens] = await Promise.all([AsyncStorage.getItem(CONFIG_KEY), AsyncStorage.getItem(TOKENS_KEY)]);
      if (tokens) set({ linkTokens: JSON.parse(tokens) });
      if (!raw) return set({ phase: 'setup' });
      const config = { shareBase: DEFAULT_SHARE_BASE, ...(JSON.parse(raw) as Config) };
      const backend = makeBackend(config);
      set({ config, backend });
      if (config.mode === 'supabase' && !(await hasSession(config.url, config.key))) {
        return set({ phase: 'login' });
      }
      set({ phase: 'ready' });
      await get().refresh();
    } catch (e) {
      set({ phase: 'setup', error: (e as Error).message });
    }
  },

  async configure(url, key) {
    const config: Config = { mode: 'supabase', url: normalizeUrl(url), key: key.trim(), shareBase: get().config?.shareBase ?? DEFAULT_SHARE_BASE };
    if (!/^https:\/\/.+/.test(config.url)) throw new Error('Proje adresi https:// ile başlamalı.');
    if (config.key.length < 20) throw new Error('Anahtar eksik görünüyor. Supabase panelinden tamamını kopyala.');
    await saveConfig(config);
    set({ config, backend: makeBackend(config), phase: 'login', error: null });
  },

  async login(email, password) {
    const c = get().config;
    if (!c) throw new Error('Önce bağlantı bilgilerini gir.');
    await signIn(c.url, c.key, email, password);
    set({ phase: 'ready', error: null });
    await get().refresh();
  },

  async startDemo() {
    const config: Config = { mode: 'demo', url: '', key: '', shareBase: DEFAULT_SHARE_BASE };
    await saveConfig(config);
    set({ config, backend: makeBackend(config), phase: 'ready', error: null });
    await get().refresh();
  },

  async resetConnection() {
    try {
      await get().backend?.signOut();
    } catch {}
    await saveConfig(null);
    await AsyncStorage.removeItem(CACHE_KEY);
    set({ config: null, backend: null, data: null, phase: 'setup', offline: false, error: null });
  },

  async signOut() {
    const c = get().config;
    if (c?.mode === 'demo') return get().resetConnection();
    try {
      await get().backend?.signOut();
    } catch {}
    await AsyncStorage.removeItem(CACHE_KEY);
    set({ data: null, phase: 'login', offline: false });
  },

  async setShareBase(base) {
    const c = get().config;
    if (!c) return;
    let b = base.trim();
    if (b && !b.endsWith('/') && !b.endsWith('.html')) b += '/';
    const config = { ...c, shareBase: b || DEFAULT_SHARE_BASE };
    await saveConfig(config);
    set({ config });
  },

  async refresh() {
    const b = get().backend;
    if (!b) return;
    set({ refreshing: true });
    try {
      const data = await b.loadAll();
      set({ data, offline: false, error: null });
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
      syncOptionReminders(data.reservations, data.villas);
    } catch (e) {
      const msg = (e as Error).message;
      if (!get().data) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) return set({ data: JSON.parse(cached), offline: true, error: msg });
      }
      set({ offline: !!get().data, error: msg });
    } finally {
      set({ refreshing: false });
    }
  },

  async saveReservation(r, payments) {
    const b = get().backend!;
    try {
      const id = await b.saveReservation(r, payments);
      await get().refresh();
      return id;
    } catch (e) {
      // Çakışmada da güncel takvimi çek ki kullanıcı neyin dolduğunu görsün
      get().refresh();
      throw e;
    }
  },

  async savePrices(villaId, currency, rows, remove) {
    await get().backend!.savePrices(villaId, currency, rows, remove);
    await get().refresh();
  },

  async saveAgency(a) {
    await get().backend!.saveAgency(a);
    await get().refresh();
  },

  async deleteAgency(id) {
    await get().backend!.deleteAgency(id);
    await get().refresh();
  },

  async createLink(label, kind) {
    const bytes = await Crypto.getRandomBytesAsync(24);
    const token = Array.from(bytes, (x) => x.toString(16).padStart(2, '0')).join('');
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token, { encoding: Crypto.CryptoEncoding.HEX });
    const id = await get().backend!.createLink(label, kind, hash.toLowerCase());
    const linkTokens = { ...get().linkTokens, [id]: token };
    set({ linkTokens });
    await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(linkTokens));
    await get().refresh();
    return id;
  },

  async revokeLink(id) {
    await get().backend!.revokeLink(id);
    await get().refresh();
  },

  linkUrl(id) {
    const c = get().config;
    const token = get().linkTokens[id];
    if (!c || !token) return null;
    const kind = get().data?.links.find((l) => l.id === id)?.kind;
    const params = c.mode === 'demo' ? `demo=1&m=${kind === 'admin' ? 'a' : 'm'}&t=${token}` :`u=${encodeURIComponent(c.url)}&k=${encodeURIComponent(c.key)}&t=${token}`;
    return `${c.shareBase}#${params}`;
  },
}));
