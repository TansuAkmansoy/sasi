import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, radius, space } from '../theme';
import { AYLAR, GUNLER_KISA, addMonths, daysInMonth, make, today, weekdayMon, ym, fmtRange, fmt, nights, addDays } from '../lib/tarih';
import { Button } from './ui';

type Props =
  | {
      visible: boolean;
      mode: 'range';
      title?: string;
      busy?: Set<string>;
      start?: string | null;
      end?: string | null;
      onCancel: () => void;
      onConfirm: (start: string, end: string) => void;
    }
  | {
      visible: boolean;
      mode: 'single';
      title?: string;
      value?: string | null;
      onCancel: () => void;
      onConfirm: (date: string) => void;
    };

export function TakvimSecici(props: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const t = today();
  const initial = props.mode === 'range' ? props.start ?? t : props.value ?? t;
  const [view, setView] = useState(ym(initial));
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const busy = props.mode === 'range' ? props.busy ?? new Set<string>() : new Set<string>();

  useEffect(() => {
    if (!props.visible) return;
    setMsg(null);
    if (props.mode === 'range') {
      setStart(props.start ?? null);
      setEnd(props.end ?? null);
      setView(ym(props.start ?? t));
    } else {
      setStart(props.value ?? null);
      setView(ym(props.value ?? t));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.visible]);

  const cells = useMemo(() => {
    const first = make(view.y, view.m, 1);
    const lead = weekdayMon(first);
    const n = daysInMonth(view.y, view.m);
    const arr: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= n; d++) arr.push(make(view.y, view.m, d));
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [view]);

  function tap(d: string) {
    setMsg(null);
    if (props.mode === 'single') {
      setStart(d);
      return;
    }
    if (!start || end) {
      if (busy.has(d)) return setMsg('Bu gece dolu. Giriş için boş bir gün seç.');
      setStart(d);
      setEnd(null);
      return;
    }
    if (d <= start) {
      if (busy.has(d)) return setMsg('Bu gece dolu. Giriş için boş bir gün seç.');
      setStart(d);
      return;
    }
    for (let x = start; x < d; x = addDays(x, 1)) {
      if (busy.has(x)) return setMsg(`${fmt(x)} gecesi dolu. Daha kısa bir aralık seç.`);
    }
    setEnd(d);
  }

  const summary =
    props.mode === 'range'
      ? start && end
        ? `${fmtRange(start, end)} · ${nights(start, end)} gece`
        : start
          ? `Giriş: ${fmt(start)} — şimdi çıkış gününe dokun`
          : 'Giriş gününe dokun'
      : start
        ? fmt(start)
        : 'Bir gün seç';

  const canConfirm = props.mode === 'range' ? !!(start && end) : !!start;

  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onCancel}>
      <View style={st.backdrop}>
        <View style={[st.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + space.m }]}>
          <View style={st.topRow}>
            <Text style={{ color: c.text, fontSize: 17, fontWeight: '700', flex: 1 }}>{props.title ?? (props.mode === 'range' ? 'Tarihleri seç' : 'Tarih seç')}</Text>
            <Pressable onPress={props.onCancel} hitSlop={10} accessibilityLabel="Kapat">
              <Ionicons name="close" size={26} color={c.text2} />
            </Pressable>
          </View>
          <View style={st.monthRow}>
            <Pressable onPress={() => setView(addMonths(view.y, view.m, -1))} hitSlop={10} style={st.nav} accessibilityLabel="Önceki ay">
              <Ionicons name="chevron-back" size={24} color={c.text} />
            </Pressable>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>
              {AYLAR[view.m - 1]} {view.y}
            </Text>
            <Pressable onPress={() => setView(addMonths(view.y, view.m, 1))} hitSlop={10} style={st.nav} accessibilityLabel="Sonraki ay">
              <Ionicons name="chevron-forward" size={24} color={c.text} />
            </Pressable>
          </View>
          <View style={st.grid}>
            {GUNLER_KISA.map((g) => (
              <Text key={g} style={[st.wd, { color: c.text3 }]}>
                {g}
              </Text>
            ))}
            {cells.map((d, i) => {
              if (!d) return <View key={i} style={st.cell} />;
              const isBusy = busy.has(d);
              const isStart = d === start;
              const isEnd = d === end;
              const inRange = props.mode === 'range' && start && end && d > start && d < end;
              const isToday = d === t;
              const sel = isStart || isEnd;
              return (
                <Pressable key={i} onPress={() => tap(d)} style={st.cell} accessibilityLabel={`${fmt(d)}${isBusy ? ', dolu' : ''}`}>
                  <View
                    style={[
                      st.day,
                      inRange && { backgroundColor: c.primarySoft, borderRadius: 0 },
                      isBusy && !sel && { backgroundColor: c.dangerSoft },
                      sel && { backgroundColor: c.primary },
                      isToday && !sel && { borderWidth: 2, borderColor: c.today },
                    ]}
                  >
                    <Text
                      style={{
                        color: sel ? c.primaryText : isBusy ? c.danger : c.text,
                        fontWeight: sel || isToday ? '700' : '400',
                        textDecorationLine: isBusy && !sel ? 'line-through' : 'none',
                        fontSize: 15,
                      }}
                    >
                      {Number(d.slice(8))}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {props.mode === 'range' && busy.size ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: c.dangerSoft, marginRight: 6 }} />
              <Text style={{ color: c.text2, fontSize: 12 }}>Dolu gece · çıkış günü olarak seçilebilir (çıkış 10:00, giriş 16:00)</Text>
            </View>
          ) : null}
          <Text style={{ color: msg ? c.danger : c.text, fontSize: 15, fontWeight: '600', marginTop: space.m, minHeight: 22 }}>{msg ?? summary}</Text>
          <View style={{ flexDirection: 'row', marginTop: space.m, gap: space.s }}>
            {props.mode === 'single' ? <Button title="Bugün" kind="secondary" onPress={() => { setStart(t); setView(ym(t)); }} style={{ flex: 1 }} /> : null}
            <Button
              title="Tamam"
              disabled={!canConfirm}
              style={{ flex: 2 }}
              onPress={() => {
                if (props.mode === 'range') {
                  if (start && end) props.onConfirm(start, end);
                } else if (start) props.onConfirm(start);
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.l, borderTopRightRadius: radius.l, padding: space.l },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.s },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: space.s },
  nav: { padding: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  wd: { width: '14.2857%', textAlign: 'center', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  cell: { width: '14.2857%', aspectRatio: 1, padding: 1 },
  day: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
});
