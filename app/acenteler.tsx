import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../src/store';
import { useColors } from '../src/theme';
import { Banner, Button, Card, EmptyState, Field, IconButton, Screen, SectionTitle } from '../src/components/ui';
import { parseNumber } from '../src/lib/para';
import type { Agency } from '../src/lib/types';

export default function AcentelerEkrani() {
  const c = useColors();
  const data = useStore((s) => s.data);
  const saveAgency = useStore((s) => s.saveAgency);
  const deleteAgency = useStore((s) => s.deleteAgency);
  const [edit, setEdit] = useState<Partial<Agency> | null>(null);
  const [pct, setPct] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (a: Partial<Agency>) => {
    setEdit(a);
    setPct(a.default_commission_pct != null ? String(a.default_commission_pct).replace('.', ',') : '');
    setErr(null);
  };

  async function save() {
    if (!edit) return;
    const name = (edit.name ?? '').trim();
    if (!name) return setErr('Acente adını yaz.');
    const p = pct.trim() ? parseNumber(pct) : null;
    if (pct.trim() && (p == null || p < 0 || p > 100)) return setErr('Komisyon 0–100 arası olmalı.');
    setBusy(true);
    try {
      await saveAgency({ id: edit.id, name, default_commission_pct: p });
      setEdit(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Acenteler" onBack={() => router.back()} right={<IconButton icon="add-circle" color={c.primary} label="Acente ekle" onPress={() => open({ name: '' })} />}>
      {edit ? (
        <Card style={{ borderColor: c.primary, borderWidth: 1.5 }}>
          {err ? <Banner kind="error" text={err} /> : null}
          <Field label="Acente adı" value={edit.name ?? ''} onChangeText={(v) => setEdit({ ...edit, name: v })} autoFocus />
          <Field label="Varsayılan komisyon" value={pct} onChangeText={setPct} keyboardType="decimal-pad" suffix="%" hint="Rezervasyonda bu acente seçilince otomatik gelir; değiştirilebilir." />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Vazgeç" kind="secondary" style={{ flex: 1 }} onPress={() => setEdit(null)} />
            <Button title="Kaydet" style={{ flex: 1 }} loading={busy} onPress={save} />
          </View>
        </Card>
      ) : null}
      <SectionTitle>Kayıtlı acenteler</SectionTitle>
      {(data?.agencies ?? []).length === 0 ? (
        <EmptyState icon="briefcase-outline" title="Henüz acente yok" text="Rezervasyonlarda aracı acente ve komisyon takibi için ekle." action={{ title: 'Acente ekle', onPress: () => open({ name: '' }) }} />
      ) : (
        (data?.agencies ?? []).map((a) => {
          const count = (data?.reservations ?? []).filter((r) => r.agency_id === a.id).length;
          return (
            <Card key={a.id} onPress={() => open(a)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{a.name}</Text>
                <Text style={{ color: c.text2, fontSize: 13 }}>
                  {a.default_commission_pct != null ? `%${String(a.default_commission_pct).replace('.', ',')} komisyon · ` : ''}
                  {count} rezervasyon
                </Text>
              </View>
              <IconButton
                icon="trash-outline"
                color={c.danger}
                label="Sil"
                onPress={() =>
                  Alert.alert('Acenteyi sil', count ? `${count} rezervasyonda bu acente "Direkt" olarak görünecek.` : 'Silinsin mi?', [
                    { text: 'Vazgeç', style: 'cancel' },
                    { text: 'Sil', style: 'destructive', onPress: () => deleteAgency(a.id).catch((e) => setErr((e as Error).message)) },
                  ])
                }
              />
            </Card>
          );
        })
      )}
    </Screen>
  );
}
