import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/store';
import { useColors } from '../src/theme';
import { Button, Card, Muted, PickerField, Screen } from '../src/components/ui';
import { TakvimSecici } from '../src/components/TakvimSecici';
import { fmtRange, nights, today, addDays } from '../src/lib/tarih';
import { findConflict } from '../src/lib/durum';
import { calcPrice } from '../src/lib/fiyat';
import { money } from '../src/lib/para';
import { STATUS_LABEL } from '../src/lib/types';

export default function MusaitlikEkrani() {
  const c = useColors();
  const data = useStore((s) => s.data);
  const [range, setRange] = useState<{ a: string; b: string } | null>(null);
  const [open, setOpen] = useState(true);
  const villas = (data?.villas ?? []).filter((v) => v.active);

  return (
    <Screen title="Müsaitlik sorgula" subtitle="Telefonda hızlı cevap için" onBack={() => router.back()}>
      <PickerField
        label="Giriş → çıkış"
        value={range ? `${fmtRange(range.a, range.b)} · ${nights(range.a, range.b)} gece` : ''}
        placeholder="Tarihleri seç"
        onPress={() => setOpen(true)}
      />
      {!range ? <Muted>Tarihleri seçince üç villanın durumu ve fiyatı burada görünür.</Muted> : null}
      {range
        ? villas.map((v) => {
            const cf = findConflict(data?.reservations ?? [], v.id, range.a, range.b);
            const price = calcPrice(v.id, range.a, range.b, data?.prices ?? []);
            return (
              <Card key={v.id} style={{ borderColor: cf ? c.danger : c.ok, borderWidth: 1.5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={cf ? 'close-circle' : 'checkmark-circle'} size={26} color={cf ? c.danger : c.ok} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>{v.name}</Text>
                    <Text style={{ color: cf ? c.danger : c.ok, fontWeight: '600' }}>{cf ? 'Dolu' : 'Boş'}</Text>
                  </View>
                  {!cf && price.ok ? <Text style={{ color: c.text, fontSize: 17, fontWeight: '800' }}>{money(price.total_minor, price.currency!)}</Text> : null}
                </View>
                {cf ? (
                  <Muted style={{ marginTop: 6 }}>
                    {STATUS_LABEL[cf.status]}: {cf.guest_name || 'Misafir'} · {fmtRange(cf.check_in, cf.check_out)}
                  </Muted>
                ) : (
                  <>
                    {price.lines.length ? (
                      <Muted style={{ marginTop: 6 }}>{price.lines.map((l) => `${l.label}: ${l.nights} gece`).join(' + ')}</Muted>
                    ) : null}
                    {price.missingMonths.length ? <Text style={{ color: c.terra, marginTop: 4 }}>{price.missingMonths.join(', ')} fiyatı girilmemiş</Text> : null}
                    <Button
                      title="Bu villaya rezervasyon aç"
                      small
                      kind="secondary"
                      icon="add"
                      style={{ marginTop: 10 }}
                      onPress={() => router.replace({ pathname: '/rezervasyon/[id]', params: { id: 'yeni', villa: v.id, giris: range.a, cikis: range.b } })}
                    />
                  </>
                )}
              </Card>
            );
          })
        : null}
      <TakvimSecici
        visible={open}
        mode="range"
        title="Hangi tarihler soruluyor?"
        start={range?.a ?? today()}
        end={range?.b ?? null}
        onCancel={() => setOpen(false)}
        onConfirm={(a, b) => {
          setRange({ a, b });
          setOpen(false);
        }}
      />
      {range ? (
        <Button title="7 gece kaydır →" kind="ghost" small onPress={() => setRange({ a: addDays(range.a, 7), b: addDays(range.b, 7) })} style={{ alignSelf: 'center' }} />
      ) : null}
    </Screen>
  );
}
