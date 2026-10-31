import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../src/store';
import { useColors } from '../src/theme';
import { Banner, Button, Chip, ChipRow, Field, Muted, Screen, SectionTitle } from '../src/components/ui';
import { AYLAR } from '../src/lib/tarih';
import { CURRENCIES, Currency, MonthlyPrice } from '../src/lib/types';
import { money, moneyInput, parseMoney, SYMBOL } from '../src/lib/para';

export default function FiyatlarEkrani() {
  const c = useColors();
  const data = useStore((s) => s.data);
  const savePrices = useStore((s) => s.savePrices);
  const villas = (data?.villas ?? []).filter((v) => v.active);
  const [villaId, setVillaId] = useState(villas[0]?.id ?? '');
  const [year, setYear] = useState(new Date().getFullYear() + (new Date().getMonth() >= 9 ? 1 : 0));
  const villa = villas.find((v) => v.id === villaId);
  const [currency, setCurrency] = useState<Currency>(villa?.currency ?? 'EUR');
  const [texts, setTexts] = useState<string[]>(Array(12).fill(''));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  const existing = useMemo(() => (data?.prices ?? []).filter((p) => p.villa_id === villaId && p.year === year), [data, villaId, year]);

  useEffect(() => {
    const arr = Array(12).fill('');
    existing.forEach((p) => (arr[p.month - 1] = moneyInput(p.weekly_minor)));
    setTexts(arr);
    setCurrency(villa?.currency ?? 'EUR');
    setMsg(null);
  }, [existing, villa?.currency]);

  const copyPrev = () => {
    const prev = (data?.prices ?? []).filter((p) => p.villa_id === villaId && p.year === year - 1);
    if (!prev.length) return setMsg({ kind: 'error', text: `${year - 1} için fiyat yok.` });
    const arr = [...texts];
    prev.forEach((p) => (arr[p.month - 1] = moneyInput(p.weekly_minor)));
    setTexts(arr);
    setMsg({ kind: 'info', text: `${year - 1} fiyatları kopyalandı. Düzenleyip kaydet.` });
  };

  async function save() {
    const rows: MonthlyPrice[] = [];
    const remove: { year: number; month: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const t = texts[i].trim();
      if (!t) {
        if (existing.some((p) => p.month === i + 1)) remove.push({ year, month: i + 1 });
        continue;
      }
      const v = parseMoney(t);
      if (v == null) return setMsg({ kind: 'error', text: `${AYLAR[i]} tutarı okunamadı.` });
      rows.push({ villa_id: villaId, year, month: i + 1, weekly_minor: v, currency });
    }
    setSaving(true);
    try {
      await savePrices(villaId, currency, rows, remove);
      setMsg({ kind: 'info', text: 'Fiyatlar kaydedildi.' });
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Aylık fiyatlar" subtitle="Haftalık ücret · gece = haftalık / 7" onBack={() => router.back()} footer={<Button title="Kaydet" icon="checkmark" loading={saving} onPress={save} />}>
      {msg ? <Banner kind={msg.kind} text={msg.text} /> : null}
      <ChipRow>
        {villas.map((v) => (
          <Chip key={v.id} label={v.name} selected={v.id === villaId} onPress={() => setVillaId(v.id)} />
        ))}
      </ChipRow>
      <ChipRow>
        {[year - 1, year, year + 1].map((y) => (
          <Chip key={y} label={String(y)} selected={y === year} onPress={() => setYear(y)} color={c.deep} />
        ))}
      </ChipRow>
      <SectionTitle>Para birimi</SectionTitle>
      <ChipRow>
        {CURRENCIES.map((cur) => (
          <Chip key={cur} label={`${SYMBOL[cur]} ${cur}`} selected={currency === cur} onPress={() => setCurrency(cur)} color={c.terra} />
        ))}
      </ChipRow>
      <Muted>Villanın tüm fiyatları bu para biriminde tutulur.</Muted>
      <SectionTitle right={<Button title={`${year - 1}'den kopyala`} kind="ghost" small onPress={copyPrev} />}>{year} haftalık ücretler</SectionTitle>
      {AYLAR.map((ay, i) => {
        const v = parseMoney(texts[i]);
        return (
          <View key={ay} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: c.text, width: 80, fontSize: 15, fontWeight: '600', marginBottom: 12 }}>{ay}</Text>
            <Field
              containerStyle={{ flex: 1 }}
              label=""
              value={texts[i]}
              placeholder="Fiyat yok"
              keyboardType="decimal-pad"
              suffix={SYMBOL[currency]}
              onChangeText={(t) => setTexts((arr) => arr.map((x, j) => (j === i ? t : x)))}
              hint={v ? `Gece ${money(Math.round(v / 7), currency)}` : undefined}
            />
          </View>
        );
      })}
    </Screen>
  );
}
