import React, { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useStore } from '../../src/store';
import { Chip, ChipRow, EmptyState, Field, IconButton, Screen } from '../../src/components/ui';
import { RezKart } from '../../src/components/RezKart';
import { today } from '../../src/lib/tarih';
import { useColors } from '../../src/theme';
import { awaitingCompletion } from '../../src/lib/durum';

type Filter = 'upcoming' | 'option' | 'awaiting' | 'cancelled' | 'all';

export default function KayitlarEkrani() {
  const c = useColors();
  const data = useStore((s) => s.data);
  const refresh = useStore((s) => s.refresh);
  const refreshing = useStore((s) => s.refreshing);
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [villa, setVilla] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const t = today();

  const list = useMemo(() => {
    const all = data?.reservations ?? [];
    const ql = q.trim().toLocaleLowerCase('tr-TR');
    return all
      .filter((r) => {
        if (villa && r.villa_id !== villa) return false;
        switch (filter) {
          case 'upcoming':
            return (r.status === 'confirmed' || r.status === 'option') && r.check_out > t;
          case 'option':
            return r.status === 'option';
          case 'awaiting':
            return awaitingCompletion(r, t);
          case 'cancelled':
            return r.status === 'cancelled' || r.status === 'option_released';
          default:
            return true;
        }
      })
      .filter((r) => {
        if (!ql) return true;
        const agency = data?.agencies.find((a) => a.id === r.agency_id)?.name ?? '';
        return [r.guest_name, r.guest_phone ?? '', r.guest_email ?? '', r.note ?? '', agency].some((x) => x.toLocaleLowerCase('tr-TR').includes(ql));
      })
      .sort((a, b) => (filter === 'all' || filter === 'cancelled' ? b.check_in.localeCompare(a.check_in) : a.check_in.localeCompare(b.check_in)));
  }, [data, filter, villa, q, t]);

  return (
    <Screen
      title="Kayıtlar"
      subtitle={`${list.length} rezervasyon`}
      right={<IconButton icon="add-circle" color={c.primary} label="Yeni rezervasyon" onPress={() => router.push({ pathname: '/rezervasyon/[id]', params: { id: 'yeni' } })} />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <Field label="Ara" placeholder="Misafir, telefon, acente, not…" value={q} onChangeText={setQ} autoCorrect={false} />
      <ChipRow>
        <Chip label="Yaklaşan" selected={filter === 'upcoming'} onPress={() => setFilter('upcoming')} />
        <Chip label="Opsiyon" selected={filter === 'option'} onPress={() => setFilter('option')} />
        <Chip label="Onay bekleyen" selected={filter === 'awaiting'} onPress={() => setFilter('awaiting')} />
        <Chip label="İptal" selected={filter === 'cancelled'} onPress={() => setFilter('cancelled')} />
        <Chip label="Tümü" selected={filter === 'all'} onPress={() => setFilter('all')} />
      </ChipRow>
      <ChipRow style={{ marginBottom: 8 }}>
        <Chip label="Tüm villalar" selected={!villa} onPress={() => setVilla(null)} color={c.deep} />
        {(data?.villas ?? []).map((v) => (
          <Chip key={v.id} label={v.name.replace(/^Villa\s+/i, '')} selected={villa === v.id} onPress={() => setVilla(v.id)} color={c.deep} />
        ))}
      </ChipRow>
      {list.length === 0 ? (
        <EmptyState icon="file-tray-outline" title="Kayıt yok" text="Bu filtreye uyan rezervasyon bulunamadı." />
      ) : (
        list.map((r) => <RezKart key={r.id} r={r} villas={data?.villas ?? []} agencies={data?.agencies} onPress={() => router.push({ pathname: '/rezervasyon/[id]', params: { id: r.id! } })} />)
      )}
    </Screen>
  );
}
