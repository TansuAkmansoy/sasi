import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Reservation, Villa } from '../lib/types';
import { addDays, daysInMonth, diffDays, make, today, weekdayMon, GUNLER_KISA } from '../lib/tarih';
import { isActive } from '../lib/durum';
import { useColors, villaColor } from '../theme';

const LANE_H = 19;
const MAX_LANES = 3;
const DAY_H = 26;

interface Seg {
  r: Reservation;
  s: number; // hafta içindeki başlangıç (gün, 0-7)
  e: number;
  lane: number;
  cutL: boolean;
  cutR: boolean;
}

/**
 * Google Takvim'in ay görünümü gibi: 7 sütun, haftalar satır, rezervasyonlar
 * gün kutularının üzerinde renkli çubuklar. Renk villayı gösterir; hold'lar
 * kesik çizgili turuncu.
 */
export function AyTakvim(props: {
  villas: Villa[];
  reservations: Reservation[];
  year: number;
  month: number;
  selected: string | null;
  onSelectDay: (date: string) => void;
  onPressReservation: (r: Reservation) => void;
}) {
  const c = useColors();
  const [w, setW] = useState(0);
  const t = today();
  const first = make(props.year, props.month, 1);
  const n = daysInMonth(props.year, props.month);
  const gridStart = addDays(first, -weekdayMon(first));
  const weeks = Math.ceil((weekdayMon(first) + n) / 7);
  const cellW = w / 7;
  const villaIdx = useMemo(() => new Map(props.villas.map((v, i) => [v.id, i])), [props.villas]);
  const shortName = (id: string) => (props.villas.find((v) => v.id === id)?.name ?? '').replace(/^Villa\s+/i, '');

  const rows = useMemo(() => {
    const out: { start: string; segs: Seg[]; hidden: number[] }[] = [];
    const active = props.reservations.filter(isActive).sort((a, b) => a.check_in.localeCompare(b.check_in) || (villaIdx.get(a.villa_id) ?? 0) - (villaIdx.get(b.villa_id) ?? 0));
    for (let wi = 0; wi < weeks; wi++) {
      const ws = addDays(gridStart, wi * 7);
      const segs: Seg[] = [];
      const laneEnd: number[] = [];
      const hidden = Array(7).fill(0);
      for (const r of active) {
        const s0 = diffDays(ws, r.check_in) + 0.5;
        const e0 = diffDays(ws, r.check_out) + 0.5;
        if (e0 <= 0 || s0 >= 7) continue;
        const s = Math.max(0, s0);
        const e = Math.min(7, e0);
        let lane = laneEnd.findIndex((end) => end <= s + 0.001);
        if (lane === -1) {
          lane = laneEnd.length;
          laneEnd.push(e);
        } else laneEnd[lane] = e;
        if (lane >= MAX_LANES) {
          for (let d = Math.floor(s); d < Math.ceil(e); d++) hidden[d]++;
          continue;
        }
        segs.push({ r, s, e, lane, cutL: s0 < 0, cutR: e0 > 7 });
      }
      out.push({ start: ws, segs, hidden });
    }
    return out;
  }, [props.reservations, gridStart, weeks, villaIdx]);

  const rowH = DAY_H + MAX_LANES * LANE_H + 8;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, borderRadius: 12, overflow: 'hidden', backgroundColor: c.surface }}>
      <View style={{ flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }}>
        {GUNLER_KISA.map((g, i) => (
          <Text key={g} style={{ width: '14.2857%', textAlign: 'center', paddingVertical: 6, fontSize: 11, fontWeight: '700', color: i >= 5 ? c.text2 : c.text3 }}>
            {g.toLocaleUpperCase('tr-TR')}
          </Text>
        ))}
      </View>
      {w > 0
        ? rows.map((row, wi) => (
            <View key={row.start} style={{ height: rowH, flexDirection: 'row', borderBottomWidth: wi < rows.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: c.border }}>
              {Array.from({ length: 7 }, (_, di) => {
                const d = addDays(row.start, di);
                const inMonth = d.slice(0, 7) === first.slice(0, 7);
                const isT = d === t;
                const sel = d === props.selected;
                return (
                  <Pressable
                    key={d}
                    onPress={() => props.onSelectDay(d)}
                    accessibilityLabel={`${Number(d.slice(8))}`}
                    style={{
                      width: cellW,
                      height: rowH,
                      borderRightWidth: di < 6 ? StyleSheet.hairlineWidth : 0,
                      borderRightColor: c.border,
                      backgroundColor: sel ? c.primarySoft : inMonth ? c.surface : c.bg,
                      alignItems: 'center',
                      paddingTop: 3,
                    }}
                  >
                    <View style={[st.num, isT && { backgroundColor: c.primary }]}>
                      <Text style={{ fontSize: 12, fontWeight: isT ? '800' : '600', color: isT ? c.primaryText : inMonth ? c.text : c.text3 }}>{Number(d.slice(8))}</Text>
                    </View>
                    {row.hidden[di] ? <Text style={{ position: 'absolute', bottom: 1, fontSize: 10, color: c.text2, fontWeight: '700' }}>+{row.hidden[di]}</Text> : null}
                  </Pressable>
                );
              })}
              {row.segs.map((sg) => {
                const opt = sg.r.status === 'option';
                const vc = villaColor(c, villaIdx.get(sg.r.villa_id) ?? 0);
                const done = sg.r.status === 'completed';
                const width = (sg.e - sg.s) * cellW - 2;
                return (
                  <Pressable
                    key={sg.r.id}
                    onPress={() => props.onPressReservation(sg.r)}
                    style={{
                      position: 'absolute',
                      left: sg.s * cellW + 1,
                      top: DAY_H + sg.lane * LANE_H,
                      width,
                      height: LANE_H - 3,
                      backgroundColor: opt ? c.holdBg : vc,
                      opacity: done ? 0.55 : 1,
                      borderWidth: opt ? 1.5 : 0,
                      borderColor: c.hold,
                      borderStyle: opt ? 'dashed' : 'solid',
                      borderTopLeftRadius: sg.cutL ? 0 : 5,
                      borderBottomLeftRadius: sg.cutL ? 0 : 5,
                      borderTopRightRadius: sg.cutR ? 0 : 5,
                      borderBottomRightRadius: sg.cutR ? 0 : 5,
                      paddingHorizontal: 4,
                      flexDirection: 'row',
                      alignItems: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {opt ? <Ionicons name="time-outline" size={10} color={c.holdText} style={{ marginRight: 2 }} /> : null}
                    <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: '700', color: opt ? c.holdText : '#fff', flexShrink: 1 }}>
                      {width > 64 ? `${shortName(sg.r.villa_id)} · ${sg.r.guest_name || 'Misafir'}` : shortName(sg.r.villa_id).slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))
        : <View style={{ height: rowH * weeks }} />}
    </View>
  );
}

const st = StyleSheet.create({
  num: { minWidth: 22, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
});
