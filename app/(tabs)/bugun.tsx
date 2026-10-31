import React from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../../src/store';
import { useColors } from '../../src/theme';
import { Banner, Screen, SectionTitle, EmptyState } from '../../src/components/ui';
import { RezKart } from '../../src/components/RezKart';
import { addDays, fmt, today, weekdayName } from '../../src/lib/tarih';
import { awaitingCompletion, isActive, missingOf, optionDueSoon } from '../../src/lib/durum';
import type { Reservation } from '../../src/lib/types';

export default function BugunEkrani() {
  const c = useColors();
  const data = useStore((s) => s.data);
  const refresh = useStore((s) => s.refresh);
  const refreshing = useStore((s) => s.refreshing);
  const t = today();
  const all = data?.reservations ?? [];
  const open = (r: Reservation) => router.push({ pathname: '/rezervasyon/[id]', params: { id: r.id! } });

  const arrivals = all.filter((r) => isActive(r) && r.check_in === t);
  const departures = all.filter((r) => isActive(r) && r.check_out === t);
  const options = all.filter((r) => optionDueSoon(r, t)).sort((a, b) => (a.option_until ?? '').localeCompare(b.option_until ?? ''));
  const awaiting = all.filter((r) => awaitingCompletion(r, t)).sort((a, b) => a.check_out.localeCompare(b.check_out));
  const missing = all.filter((r) => !awaitingCompletion(r, t) && missingOf(r, t).length > 0);
  const soon = all.filter((r) => isActive(r) && r.check_in > t && r.check_in <= addDays(t, 7));
  const staying = all.filter((r) => isActive(r) && r.check_in < t && r.check_out > t);

  const nothing = !arrivals.length && !departures.length && !options.length && !awaiting.length && !missing.length && !soon.length && !staying.length;

  const block = (title: string, list: Reservation[], hint?: string) =>
    list.length ? (
      <>
        <SectionTitle>
          {title} ({list.length})
        </SectionTitle>
        {hint ? <Text style={{ color: c.text3, fontSize: 13, marginBottom: 8 }}>{hint}</Text> : null}
        {list.map((r) => (
          <RezKart key={r.id} r={r} villas={data?.villas ?? []} agencies={data?.agencies} onPress={() => open(r)} />
        ))}
      </>
    ) : null;

  return (
    <Screen title="Bugün" subtitle={`${weekdayName(t)}, ${fmt(t)}`} refreshing={refreshing} onRefresh={refresh}>
      {options.some((r) => (r.option_until ?? '') <= t) ? <Banner kind="warn" icon="time-outline" text="Süresi dolan opsiyon var. Onayla, uzat ya da bırak; karar verene kadar tarihler kapalı kalır." /> : null}
      {block('Opsiyon süresi doluyor', options)}
      {block('Bugün giriş (16:00)', arrivals)}
      {block('Bugün çıkış (10:00)', departures)}
      {block('Konaklama bitti, onayını bekliyor', awaiting, 'Son düzeltmeleri yapıp "Konaklamayı tamamla" ile arşive al.')}
      {block('Eksik işler', missing)}
      {block('Şu an konaklayanlar', staying)}
      {block('Önümüzdeki 7 gün girişleri', soon)}
      {nothing ? <EmptyState icon="sunny-outline" title="Bugün yapılacak bir şey yok" text="Girişler, çıkışlar, opsiyonlar ve eksik işler burada görünür." /> : null}
    </Screen>
  );
}
