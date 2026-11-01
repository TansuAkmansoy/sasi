import React from 'react';
import { Text, View } from 'react-native';
import type { Currency } from '../lib/types';
import { CURRENCIES } from '../lib/types';
import { convert } from '../lib/kur';
import { money } from '../lib/para';
import { fmt } from '../lib/tarih';
import { useRates } from '../data/kur';
import { useColors } from '../theme';

/** Bir tutarın TCMB kuruyla diğer para birimlerindeki karşılıkları */
export function KurKarsiligi(props: { amount: number; currency: Currency; date?: string | null; label: string }) {
  const c = useColors();
  const { rates, loading } = useRates(props.date);
  if (!props.amount) return null;
  const others = CURRENCIES.filter((x) => x !== props.currency);
  return (
    <View style={{ marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: c.surface2 }}>
      <Text style={{ color: c.text2, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>
        {props.label}
        {rates ? ` · TCMB ${fmt(rates.date)}` : ''}
      </Text>
      {rates ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 2 }}>
          {others.map((x) => (
            <Text key={x} style={{ color: c.text, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
              ≈ {money(convert(props.amount, props.currency, x, rates), x)}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={{ color: c.text3, fontSize: 13 }}>{loading ? 'Kur alınıyor…' : 'Kur alınamadı (bağlantı yok).'}</Text>
      )}
    </View>
  );
}
