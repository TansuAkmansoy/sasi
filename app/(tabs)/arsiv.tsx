import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../../src/store';
import { useColors } from '../../src/theme';
import { Card, Chip, ChipRow, EmptyState, Row, Screen, Segmented, SectionTitle, Divider } from '../../src/components/ui';
import { RezKart } from '../../src/components/RezKart';
import { nights, today } from '../../src/lib/tarih';
import { moneyOf } from '../../src/lib/durum';
import { addTo, totalsText, Totals } from '../../src/lib/para';

type Tab = 'completed' | 'cancelled';

export default function ArsivEkrani() {
  const c = useColors();
  const data = useStore((s) => s.data);
  const refresh = useStore((s) => s.refresh);
  const refreshing = useStore((s) => s.refreshing);
  const [tab, setTab] = useState<Tab>('completed');
  const [year, setYear] = useState<number | null>(Number(today().slice(0, 4)));
  const [villa, setVilla] = useState<string | null>(null);
  const [agency, setAgency] = useState<string | null>(null);

  const base = (data?.reservations ?? []).filter((r) => (tab === 'completed' ? r.status === 'completed' : r.status === 'cancelled'));
  const years = useMemo(() => {
    const s = new Set<number>([Number(today().slice(0, 4))]);
    base.forEach((r) => s.add(Number(r.check_in.slice(0, 4))));
    return [...s].sort((a, b) => b - a);
  }, [base]);

  const list = base
    .filter((r) => (year ? Number(r.check_in.slice(0, 4)) === year : true))
    .filter((r) => (villa ? r.villa_id === villa : true))
    .filter((r) => (agency === null ? true : agency === 'direct' ? !r.agency_id : r.agency_id === agency))
    .sort((a, b) => b.check_in.localeCompare(a.check_in));

  const sums = useMemo(() => {
    const gross: Totals = {}, comm: Totals = {}, net: Totals = {}, got: Totals = {}, refund: Totals = {}, deduct: Totals = {}, open: Totals = {};
    let n = 0;
    let pendingRefunds = 0;
    for (const r of list) {
      const m = moneyOf(r);
      n += nights(r.check_in, r.check_out);
      addTo(got, r.currency, m.net_received);
      if (tab === 'completed') {
        addTo(gross, r.currency, r.gross_minor);
        addTo(comm, r.currency, m.commission);
        addTo(net, r.currency, m.net_income);
        addTo(open, r.currency, m.remaining);
      } else {
        addTo(refund, r.currency, m.refunded);
        addTo(deduct, r.currency, r.deduction_minor ?? 0);
        if (r.refund_status === 'pending') pendingRefunds++;
      }
    }
    return { gross, comm, net, got, refund, deduct, open, n, pendingRefunds };
  }, [list, tab]);

  return (
    <Screen title="Arşiv" subtitle="Tamamlanan ve iptal edilen konaklamalar" refreshing={refreshing} onRefresh={refresh}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'completed', label: 'Tamamlanan' },
          { value: 'cancelled', label: 'İptal edilen' },
        ]}
      />
      <ChipRow>
        <Chip label="Tüm yıllar" selected={year === null} onPress={() => setYear(null)} />
        {years.map((y) => (
          <Chip key={y} label={String(y)} selected={year === y} onPress={() => setYear(y)} />
        ))}
      </ChipRow>
      <ChipRow>
        <Chip label="Tüm villalar" selected={!villa} onPress={() => setVilla(null)} color={c.deep} />
        {(data?.villas ?? []).map((v) => (
          <Chip key={v.id} label={v.name.replace(/^Villa\s+/i, '')} selected={villa === v.id} onPress={() => setVilla(v.id)} color={c.deep} />
        ))}
      </ChipRow>
      <ChipRow>
        <Chip label="Tüm kanallar" selected={agency === null} onPress={() => setAgency(null)} color={c.terra} />
        <Chip label="Direkt" selected={agency === 'direct'} onPress={() => setAgency('direct')} color={c.terra} />
        {(data?.agencies ?? []).map((a) => (
          <Chip key={a.id} label={a.name} selected={agency === a.id} onPress={() => setAgency(a.id)} color={c.terra} />
        ))}
      </ChipRow>

      <Card style={{ marginTop: 8 }}>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 16, marginBottom: 4 }}>
          {list.length} konaklama · {sums.n} gece
        </Text>
        <Text style={{ color: c.text3, fontSize: 12, marginBottom: 6 }}>Her para birimi ayrı toplanır.</Text>
        <Divider />
        {tab === 'completed' ? (
          <View>
            <Row label="Brüt" value={totalsText(sums.gross)} strong />
            <Row label="Acente komisyonu" value={totalsText(sums.comm)} />
            <Row label="Net gelir" value={totalsText(sums.net)} strong color={c.ok} />
            <Row label="Tahsil edilen" value={totalsText(sums.got)} />
            {Object.values(sums.open).some((v) => (v ?? 0) > 0) ? <Row label="Tahsil edilmemiş" value={totalsText(sums.open)} color={c.terra} /> : null}
          </View>
        ) : (
          <View>
            <Row label="Alınan (iade düşülmüş)" value={totalsText(sums.got)} strong />
            <Row label="İade edilen" value={totalsText(sums.refund)} />
            <Row label="Kesinti" value={totalsText(sums.deduct)} />
            <Row label="İadesi bekleyen" value={`${sums.pendingRefunds} kayıt`} color={sums.pendingRefunds ? c.terra : undefined} />
          </View>
        )}
      </Card>

      <SectionTitle>Kayıtlar</SectionTitle>
      {list.length === 0 ? (
        <EmptyState
          icon="archive-outline"
          title="Arşiv boş"
          text={tab === 'completed' ? 'Konaklama bitince kaydı açıp "Konaklamayı tamamla" dediğinde buraya gelir.' : 'İptal edilen rezervasyonlar burada listelenir.'}
        />
      ) : (
        list.map((r) => <RezKart key={r.id} r={r} villas={data?.villas ?? []} agencies={data?.agencies} onPress={() => router.push({ pathname: '/rezervasyon/[id]', params: { id: r.id! } })} />)
      )}
    </Screen>
  );
}
