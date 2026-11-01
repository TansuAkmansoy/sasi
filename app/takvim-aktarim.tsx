import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/store';
import { useColors } from '../src/theme';
import { onay } from '../src/lib/onay';
import { Banner, Button, Card, Muted, Screen, SectionTitle, Toggle } from '../src/components/ui';
import { CalendarOption, GcalState, listCalendars, loadGcal, removeAllEvents, saveGcal, syncCalendar } from '../src/data/gtakvimSenk';

export default function TakvimAktarimEkrani() {
  const c = useColors();
  const data = useStore((s) => s.data);
  const [st, setSt] = useState<GcalState | null>(null);
  const [cals, setCals] = useState<CalendarOption[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'info' | 'error' | 'warn'; text: string } | null>(null);

  useEffect(() => {
    loadGcal().then(setSt);
  }, []);

  if (Platform.OS === 'web') {
    return (
      <Screen title="Google Takvim aktarımı" onBack={() => router.back()}>
        <Banner kind="warn" text="Otomatik aktarım yalnızca Android uygulamasında çalışır. Android'de açıkken iPhone'dan yapılan kayıtlar da Android uygulama açıldığında takvime aktarılır." />
      </Screen>
    );
  }

  async function pickList() {
    setMsg(null);
    try {
      setCals(await listCalendars());
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    }
  }

  async function choose(cal: CalendarOption) {
    if (!st) return;
    const changed = st.calendarId && st.calendarId !== cal.id && Object.keys(st.events).length > 0;
    const go = async () => {
      if (changed) await removeAllEvents();
      const next: GcalState = { ...(await loadGcal()), calendarId: cal.id, calendarTitle: `${cal.title}${cal.account ? ` (${cal.account})` : ''}`, enabled: true, events: changed ? {} : st.events };
      await saveGcal(next);
      setSt(next);
      setCals(null);
      await syncNow(false);
    };
    if (changed) onay('Takvimi değiştir', 'Eski takvimdeki Sasi etkinlikleri silinip yeni takvime aktarılacak.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Değiştir', onPress: go }]);
    else go();
  }

  async function syncNow(force: boolean) {
    if (!data) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await syncCalendar(data.reservations, data.villas, data.settings.fees, force);
      setSt(await loadGcal());
      setMsg({
        kind: r.failed ? 'warn' : 'info',
        text: `Aktarıldı: ${r.added} yeni, ${r.updated} güncellendi, ${r.removed} silindi${r.failed ? `, ${r.failed} hata` : ''}. Google Takvim birkaç dakika içinde eşitler.`,
      });
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function setEnabled(v: boolean) {
    if (!st) return;
    if (v && !st.calendarId) return pickList();
    const next = { ...st, enabled: v };
    await saveGcal(next);
    setSt(next);
    if (v) syncNow(false);
  }

  const count = st ? Object.keys(st.events).length : 0;

  return (
    <Screen title="Google Takvim aktarımı" subtitle="Rezervasyonlar telefonun takvimine" onBack={() => router.back()}>
      {msg ? <Banner kind={msg.kind} text={msg.text} /> : null}
      <Card>
        <Muted>
          Hold, onaylı ve tamamlanmış rezervasyonlar seçtiğin takvime giriş 16:00 → çıkış 10:00 etkinliği olarak yazılır. Hold'ların başında "HOLD" yazar. Tarih değişince etkinlik güncellenir, iptal edilen ya da bırakılan kayıt takvimden silinir.
        </Muted>
        <View style={{ height: 8 }} />
        <Toggle label="Otomatik aktar" hint="Her kayıt ve değişiklikten sonra" value={!!st?.enabled} onChange={setEnabled} />
      </Card>

      <SectionTitle>Hedef takvim</SectionTitle>
      <Card>
        <Text style={{ color: st?.calendarTitle ? c.text : c.text3, fontSize: 15, fontWeight: '600' }}>{st?.calendarTitle ?? 'Seçilmedi'}</Text>
        {st?.lastSync ? <Muted style={{ fontSize: 13, marginTop: 4 }}>Son aktarım: {new Date(st.lastSync).toLocaleString('tr-TR')} · {count} etkinlik</Muted> : null}
        <Button title={st?.calendarId ? 'Takvimi değiştir' : 'Takvim seç'} kind="secondary" small icon="calendar-outline" style={{ marginTop: 10 }} onPress={pickList} />
        <Muted style={{ fontSize: 12, marginTop: 8 }}>
          Önerim ayrı bir "Sasi" takvimi: telefonda/bilgisayarda calendar.google.com → sol menüde "Diğer takvimler" yanındaki + → "Yeni takvim oluştur" → adı Sasi. Birkaç dakika sonra burada listede görünür.
        </Muted>
      </Card>

      {cals ? (
        <Card>
          {cals.length === 0 ? <Muted>Yazılabilir takvim bulunamadı.</Muted> : null}
          {cals.map((cal) => (
            <Pressable key={cal.id} onPress={() => choose(cal)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: cal.color ?? c.primary, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>{cal.title}</Text>
                <Text style={{ color: c.text2, fontSize: 12 }}>{cal.account}</Text>
              </View>
              {st?.calendarId === cal.id ? <Ionicons name="checkmark-circle" size={22} color={c.primary} /> : null}
            </Pressable>
          ))}
        </Card>
      ) : null}

      {st?.calendarId ? (
        <>
          <Button title="Hepsini şimdi aktar" icon="sync" loading={busy} onPress={() => syncNow(true)} style={{ marginTop: 8 }} />
          <Button
            title="Takvimden Sasi etkinliklerini kaldır"
            kind="danger"
            small
            style={{ marginTop: 12 }}
            onPress={() =>
              onay('Etkinlikleri kaldır', 'Sasi\'nin bu takvime yazdığı tüm etkinlikler silinir ve otomatik aktarım kapanır.', [
                { text: 'Vazgeç', style: 'cancel' },
                {
                  text: 'Kaldır',
                  style: 'destructive',
                  onPress: async () => {
                    const n = await removeAllEvents();
                    const next = { ...(await loadGcal()), enabled: false };
                    await saveGcal(next);
                    setSt(next);
                    setMsg({ kind: 'info', text: `${n} etkinlik silindi.` });
                  },
                },
              ])
            }
          />
        </>
      ) : null}
    </Screen>
  );
}
