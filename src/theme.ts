import { useColorScheme } from 'react-native';
import type { Status } from './lib/types';

// Akdeniz paleti: koy (turkuaz), derin deniz, güneş, kum, terakota.
const light = {
  bg: '#FBF7F0',
  surface: '#FFFFFF',
  surface2: '#F3E3C7',
  border: '#E6DCCB',
  text: '#1F2A30',
  text2: '#5B6870',
  text3: '#8A959B',
  primary: '#0F8C93',
  primaryText: '#FFFFFF',
  primarySoft: '#D7F1F2',
  deep: '#0A5E6B',
  sun: '#F6C56F',
  sunSoft: '#FDF0D5',
  terra: '#C9612F',
  terraSoft: '#FBE4D8',
  danger: '#C53B3B',
  dangerSoft: '#FBE1E1',
  ok: '#2E8B57',
  okSoft: '#DDF2E5',
  today: '#F6C56F',
  free: '#FFFFFF',
  weekend: '#F7F1E6',
  hold: '#E08E00',
  holdBg: '#FFE6B0',
  holdText: '#5A3B00',
  villa: ['#0F8C93', '#3E6FD8', '#C9562E', '#7B5BC8', '#2E8B57'],
};

const dark: typeof light = {
  bg: '#0E171B',
  surface: '#162227',
  surface2: '#22323A',
  border: '#2A3B43',
  text: '#ECF2F3',
  text2: '#A9B8BE',
  text3: '#7A8A91',
  primary: '#2CC2C9',
  primaryText: '#05282C',
  primarySoft: '#123E43',
  deep: '#7FD9DD',
  sun: '#F6C56F',
  sunSoft: '#3D3220',
  terra: '#F08E5F',
  terraSoft: '#3E2519',
  danger: '#F07373',
  dangerSoft: '#3D1E1E',
  ok: '#5BC98A',
  okSoft: '#183325',
  today: '#F6C56F',
  free: '#162227',
  weekend: '#1A282E',
  hold: '#F5B33D',
  holdBg: '#4A3510',
  holdText: '#FFE2A8',
  villa: ['#2CC2C9', '#6F9BFF', '#F08E5F', '#A98BF0', '#5BC98A'],
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
