import { useColorScheme } from 'react-native';
import type { Status } from './lib/types';

// Akdeniz paleti: koy (turkuaz), derin deniz, güneş, kum, terakota.
const light = {
  bg: '#F5FAF9',
  surface: '#FFFFFF',
  surface2: '#E4F2EF',
  border: '#D6E6E2',
  text: '#16302F',
  text2: '#4E6866',
  text3: '#86A09D',
  primary: '#138A7A',
  primaryText: '#FFFFFF',
  primarySoft: '#D9F3EC',
  deep: '#0D5C73',
  /** logodaki geçiş: yeşil → mavi */
  brandA: '#6ACBA5',
  brandB: '#59C0ED',
  sun: '#F6C56F',
  sunSoft: '#FDF0D5',
  terra: '#C9612F',
  terraSoft: '#FBE4D8',
  danger: '#C53B3B',
  dangerSoft: '#FBE1E1',
  ok: '#2E8B57',
  okSoft: '#DDF2E5',
  today: '#59C0ED',
  free: '#FFFFFF',
  weekend: '#EEF6F4',
  hold: '#E08E00',
  holdBg: '#FFE6B0',
  holdText: '#5A3B00',
  villa: ['#138A7A', '#2E86C8', '#7B5BC8', '#C9562E', '#2E8B57'],
};

const dark: typeof light = {
  bg: '#0C1718',
  surface: '#132324',
  surface2: '#1C3333',
  border: '#28403F',
  text: '#E8F4F2',
  text2: '#A6BFBC',
  text3: '#738B88',
  primary: '#4FD1B5',
  primaryText: '#05302A',
  primarySoft: '#123B36',
  deep: '#8ED7F2',
  brandA: '#6ACBA5',
  brandB: '#59C0ED',
  sun: '#F6C56F',
  sunSoft: '#3D3220',
  terra: '#F08E5F',
  terraSoft: '#3E2519',
  danger: '#F07373',
  dangerSoft: '#3D1E1E',
  ok: '#5BC98A',
  okSoft: '#183325',
  today: '#59C0ED',
  free: '#132324',
  weekend: '#152A2A',
  hold: '#F5B33D',
  holdBg: '#4A3510',
  holdText: '#FFE2A8',
  villa: ['#4FD1B5', '#6FB4F5', '#A98BF0', '#F08E5F', '#5BC98A'],
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export function statusColors(c: Colors, s: Status): { bg: string; fg: string; border: string } {
  switch (s) {
    case 'option':
      return { bg: c.holdBg, fg: c.holdText, border: c.hold };
    case 'confirmed':
      return { bg: c.primary, fg: c.primaryText, border: c.primary };
    case 'completed':
      return { bg: c.deep, fg: c.bg, border: c.deep };
    case 'cancelled':
      return { bg: c.dangerSoft, fg: c.danger, border: c.danger };
    default:
      return { bg: c.surface2, fg: c.text2, border: c.border };
  }
}

/** Villanın takvim rengi (sıraya göre) */
export function villaColor(c: Colors, index: number): string {
  return c.villa[((index % c.villa.length) + c.villa.length) % c.villa.length];
}

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };
export const radius = { s: 8, m: 12, l: 16, pill: 999 };
