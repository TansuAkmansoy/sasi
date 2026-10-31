import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Reservation, Villa } from '../lib/types';
import { daysInMonth, diffDays, make, today, weekdayMon, GUNLER_KISA } from '../lib/tarih';
import { isActive } from '../lib/durum';
import { statusColors, useColors } from '../theme';

const W = 42; // gün genişliği
const ROW = 64;
const HEAD = 46;
const NAME = 96;

/** Satır = villa, sütun = gün. Çubuk giriş günü 16:00'da başlar, çıkış günü 10:00'da biter. */
export function Cizelge(props: {
  villas: Villa[];
  reservations: Reservation[];
  year: number;
  month: number;
  onPressEmpty: (villaId: string, date: string) => void;
  onPressReservation: (r: Reservation) => void;
}) {
  const c = useColors();
  const n = daysInMonth(props.year, props.month);
  const first = make(props.year, props.month, 1);
  const days = useMemo(() => Array.from({ length: n }, (_, i) => make(props.year, props.month, i + 1)), [props.year, props.month, n]);
  const t = today();
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const idx = days.indexOf(t);
    const x = idx >= 0 ? Math.max(0, (idx - 2) * W) : 0;
    const id = setTimeout(() => ref.current?.scrollTo({ x, animated: false }), 50);
    return () => clearTimeout(id);
  }, [days, t]);

  const bars = useMemo(() => {
    const out: { r: Reservation; left: number; width: number; cutL: boolean; cutR: boolean }[] = [];
    for (const r of props.reservations) {
      if (!isActive(r)) continue;
      const s = diffDays(first, r.check_in) + 0.55;
      const e = diffDays(first, r.check_out) + 0.45;
      if (e <= 0 || s >= n) continue;
      const cs = Math.max(0, s);
      const ce = Math.min(n, e);
      out.push({ r, left: cs * W, width: (ce - cs) * W, cutL: s < 0, cutR: e > n });
    }
    return out;
  }, [props.reservations, first, n]);

  return (
    <View style={{ flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, borderRadius: 12, overflow: 'hidden', backgroundColor: c.surface }}>
      <View style={{ width: NAME, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: c.border, backgroundColor: c.surface }}>
        <View style={{ height: HEAD, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }} />
        {props.villas.map((v) => (
          <View key={v.id} style={[st.nameCell, { height: ROW, borderBottomColor: c.border }]}>
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }} numberOfLines={2}>
              {v.name.replace(/^Villa\s+/i, '')}
            </Text>
          </View>
        ))}
      </View>
      <ScrollView horizontal ref={ref} showsHorizontalScrollIndicator={false}>
        <View style={{ width: n * W }}>
          <View style={{ flexDirection: 'row', height: HEAD, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }}>
            {days.map((d) => {
              const wk = weekdayMon(d) >= 5;
              const isT = d === t;
              return (
                <View key={d} style={[st.headCell, { width: W, backgroundColor: isT ? c.sunSoft : wk ? c.weekend : c.surface }]}>
                  <Text style={{ color: c.text3, fontSize: 11 }}>{GUNLER_KISA[weekdayMon(d)]}</Text>
                  <Text style={{ color: isT ? c.text : c.text, fontWeight: isT ? '800' : '600', fontSize: 14 }}>{Number(d.slice(8))}</Text>
                </View>
              );
            })}
          </View>
          {props.villas.map((v) => (
            <View key={v.id} style={{ height: ROW, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }}>
              <View style={{ flexDirection: 'row', height: ROW }}>
                {days.map((d) => {
                  const wk = weekdayMon(d) >= 5;
                  const isT = d === t;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => props.onPressEmpty(v.id, d)}
                      accessibilityLabel={`${v.name} ${d} yeni rezervasyon`}
                      style={{ width: W, height: ROW, backgroundColor: isT ? c.sunSoft : wk ? c.weekend : c.free, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: c.border }}
                    />
                  );
                })}
              </View>
              {bars
                .filter((b) => b.r.villa_id === v.id)
                .map((b) => {
                  const col = statusColors(c, b.r.status);
                  const opt = b.r.status === 'option';
                  return (
                    <Pressable
                      key={b.r.id}
                      onPress={() => props.onPressReservation(b.r)}
                      accessibilityLabel={`${b.r.guest_name} rezervasyonu`}
                      style={[
                        st.bar,
                        {
                          left: b.left,
                          width: b.width,
                          backgroundColor: col.bg,
                          borderColor: col.border,
                          borderStyle: opt ? 'dashed' : 'solid',
                          borderTopLeftRadius: b.cutL ? 0 : 10,
                          borderBottomLeftRadius: b.cutL ? 0 : 10,
                          borderTopRightRadius: b.cutR ? 0 : 10,
                          borderBottomRightRadius: b.cutR ? 0 : 10,
                        },
                      ]}
                    >
                      {opt ? <Ionicons name="time-outline" size={13} color={col.fg} style={{ marginRight: 3 }} /> : null}
                      <Text style={{ color: col.fg, fontSize: 12, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
                        {b.width > 70 ? b.r.guest_name || 'Misafir' : (b.r.guest_name || 'M').slice(0, 2)}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  nameCell: { justifyContent: 'center', paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headCell: { alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', top: 12, height: ROW - 24, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, overflow: 'hidden' },
});
