import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store';
import { useColors, space } from '../../src/theme';
import { Banner, Button, IconButton, Screen, SectionTitle, EmptyState, Segmented } from '../../src/components/ui';
import { Cizelge } from '../../src/components/Cizelge';
import { AyTakvim } from '../../src/components/AyTakvim';
import { AyYilSecici } from '../../src/components/AyYilSecici';
import { villaColor } from '../../src/theme';
import { RezKart } from '../../src/components/RezKart';
import { AYLAR, addMonths, daysInMonth, make, today, ym, fmt, weekdayName } from '../../src/lib/tarih';
import { isActive } from '../../src/lib/durum';

export default function TakvimEkrani() {
  const c = useColors();
  const data = useStore((s) => s.data);
  const refresh = useStore((s) => s.refresh);
  const refreshing = useStore((s) => s.refreshing);
  const offline = useStore((s) => s.offline);
  const error = useStore((s) => s.error);
  const mode = useStore((s) => s.config?.mode);
  const t = today();
  const [view, setView] = useState(ym(t));
  const [gorunum, setGorunum] = useState<'ay' | 'cizelge'>('ay');
  const [selDay, setSelDay] = useState<string | null>(t);
  const [ymOpen, setYmOpen] = useState(false);

  const villas = (data?.villas ?? []).filter((v) => v.active);
  const monthStart = make(view.y, view.m, 1);
  const monthEnd = make(view.y, view.m, daysInMonth(view.y, view.m));
  const monthRes = useMemo(
    () => (data?.reservations ?? []).filter((r) => isActive(r) && r.check_in <= monthEnd && r.check_out > monthStart),
    [data, monthStart, monthEnd],
  );

  // Doluluk: bu aydaki dolu gece / toplam gece
  const occ = useMemo(() => {
    const n = daysInMonth(view.y, view.m);
    let busy = 0;
    for (const r of monthRes) {
      const a = r.check_in > monthStart ? r.check_in : monthStart;
      const bEnd = make(view.y, view.m, n);
      const b = r.check_out <= bEnd ? r.check_out : null;
      const startDay = Number(a.slice(8));
      const endDay = b ? Number(b.slice(8)) : n + 1;
      busy += Math.max(0, endDay - startDay);
    }
    return villas.length ? Math.round((busy / (n * villas.length)) * 100) : 0;
  }, [monthRes, villas.length, view, monthStart]);

  return (
    <Screen
      title="Takvim"
      subtitle={mode === 'demo' ? 'Örnek veriler · gerçek kayıt değil' : data ? `Son güncelleme ${new Date(data.fetchedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : undefined}
      right={
        <>
          <IconButton icon="calculator-outline" label="Ücret hesapla" onPress={() => router.push('/hesapla')} />
          <IconButton icon="search" label="Müsaitlik sorgula" onPress={() => router.push('/musaitlik')} />
          <IconButton icon="add-circle" color={c.primary} label="Yeni rezervasyon" onPress={() => router.push({ pathname: '/rezervasyon/[id]', params: { id: 'yeni' } })} />
        </>
      }
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {offline ? (
        <Banner kind="warn" icon="cloud-offline-outline" text={`Çevrimdışı: takvim son güncellemeye göre gösteriliyor. Yeni kayıt için bağlantı gerekli.${error ? '\n' + error : ''}`} action={{ title: 'Yenile', onPress: refresh }} />
      ) : error ? (
        <Banner kind="error" text={error} action={{ title: 'Yenile', onPress: refresh }} />
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.m }}>
        <Pressable onPress={() => setView(addMonths(view.y, view.m, -1))} hitSlop={10} style={{ padding: 8 }} accessibilityLabel="Önceki ay">
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Pressable onPress={() => setYmOpen(true)} style={{ alignItems: 'center' }} accessibilityLabel="Ay ve yıl seç" hitSlop={8}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: c.text, fontSize: 19, fontWeight: '800' }}>
              {AYLAR[view.m - 1]} {view.y}
            </Text>
            <Ionicons name="chevron-down" size={18} color={c.text2} style={{ marginLeft: 4 }} />
          </View>
          <Text style={{ color: c.text2, fontSize: 13 }}>Doluluk %{occ}</Text>
        </Pressable>
        <Pressable onPress={() => setView(addMonths(view.y, view.m, 1))} hitSlop={10} style={{ padding: 8 }} accessibilityLabel="Sonraki ay">
          <Ionicons name="chevron-forward" size={26} color={c.text} />
        </Pressable>
      </View>

      <Segmented
        value={gorunum}
        onChange={setGorunum}
        options={[
          { value: 'ay', label: 'Ay' },
          { value: 'cizelge', label: 'Villa çizelgesi' },
        ]}
      />

      {villas.length && gorunum === 'ay' ? (
        <AyTakvim
          villas={villas}
          reservations={data?.reservations ?? []}
          year={view.y}
          month={view.m}
          selected={selDay}
          onSelectDay={setSelDay}
          onPressReservation={(r) => router.push({ pathname: '/rezervasyon/[id]', params: { id: r.id! } })}
        />
      ) : villas.length ? (
        <Cizelge
          villas={villas}
          reservations={data?.reservations ?? []}
          year={view.y}
          month={view.m}
          onPressEmpty={(villaId, date) => router.push({ pathname: '/rezervasyon/[id]', params: { id: 'yeni', villa: villaId, giris: date } })}
          onPressReservation={(r) => router.push({ pathname: '/rezervasyon/[id]', params: { id: r.id! } })}
        />
      ) : (
        <EmptyState icon="home-outline" title="Villa bulunamadı" text="Veritabanı kurulumunu tamamladığından emin ol." action={{ title: 'Yenile', onPress: refresh }} />
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.m, gap: 14 }}>
        {gorunum === 'ay' ? (
          villas.map((v, i) => <Legend key={v.id} color={villaColor(c, i)} label={v.name.replace(/^Villa\s+/i, '')} />)
        ) : (
          <>
            <Legend color={c.primary} label="Onaylı" />
            <Legend color={c.deep} label="Tamamlandı" />
          </>
        )}
        <Legend color={c.hold} label="Hold" dashed />
      </View>
      <Text style={{ color: c.text3, fontSize: 12, marginTop: 6 }}>
        {gorunum === 'ay' ? 'Bir güne dokun: o günün girişleri, çıkışları ve konaklayanlar aşağıda listelenir.' : 'Boş bir güne dokun: o villa ve tarihle yeni rezervasyon açılır.'} Giriş 16:00 · Çıkış 10:00
      </Text>

      {view.y !== ym(t).y || view.m !== ym(t).m ? (
        <Button title={`Bugüne dön (${fmt(t, false)})`} kind="ghost" small onPress={() => setView(ym(t))} style={{ marginTop: space.s, alignSelf: 'center' }} />
      ) : null}

      {gorunum === 'ay' && selDay ? (
        <>
          <SectionTitle right={<Button title="Bu tarihten rezervasyon" icon="add" kind="ghost" small onPress={() => router.push({ pathname: '/rezervasyon/[id]', params: { id: 'yeni', giris: selDay } })} />}>
            {weekdayName(selDay)}, {fmt(selDay)}
          </SectionTitle>
          {(() => {
            const dayRes = (data?.reservations ?? []).filter((r) => isActive(r) && r.check_in <= selDay && r.check_out >= selDay);
            const free = villas.filter((v) => !dayRes.some((r) => r.villa_id === v.id && r.check_in <= selDay && r.check_out > selDay));
            return (
              <>
                {dayRes.length === 0 ? <Text style={{ color: c.text2, marginBottom: 8 }}>Bu gün için kayıt yok.</Text> : null}
                {dayRes.map((r) => (
                  <View key={r.id}>
                    <Text style={{ color: c.text2, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>
                      {r.check_in === selDay ? 'GİRİŞ 16:00' : r.check_out === selDay ? 'ÇIKIŞ 10:00' : 'KONAKLIYOR'}
                    </Text>
                    <RezKart r={r} villas={data?.villas ?? []} agencies={data?.agencies} onPress={() => router.push({ pathname: '/rezervasyon/[id]', params: { id: r.id! } })} />
                  </View>
                ))}
                <Text style={{ color: free.length ? c.ok : c.text3, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                  {free.length ? `Bu gece boş: ${free.map((v) => v.name.replace(/^Villa\s+/i, '')).join(', ')}` : 'Bu gece üç villa da dolu.'}
                </Text>
              </>
            );
          })()}
        </>
      ) : null}

      <SectionTitle>Bu aydaki konaklamalar ({monthRes.length})</SectionTitle>
      {monthRes.length === 0 ? (
        <Text style={{ color: c.text2 }}>Bu ay için rezervasyon yok.</Text>
      ) : (
        monthRes.map((r) => (
          <RezKart key={r.id} r={r} villas={data?.villas ?? []} agencies={data?.agencies} onPress={() => router.push({ pathname: '/rezervasyon/[id]', params: { id: r.id! } })} />
        ))
      )}
      <AyYilSecici
        visible={ymOpen}
        y={view.y}
        m={view.m}
        onCancel={() => setYmOpen(false)}
        onConfirm={(y, m) => {
          setView({ y, m });
          setSelDay(make(y, m, 1));
          setYmOpen(false);
        }}
      />
    </Screen>
  );
}

function Legend(props: { color: string; label: string; dashed?: boolean; soft?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 18,
          height: 12,
          borderRadius: 4,
          backgroundColor: props.dashed ? c.sunSoft : props.soft ? c.sunSoft : props.color,
          borderWidth: 1.5,
          borderColor: props.color,
          borderStyle: props.dashed ? 'dashed' : 'solid',
          marginRight: 6,
        }}
      />
      <Text style={{ color: c.text2, fontSize: 13 }}>{props.label}</Text>
    </View>
  );
}
