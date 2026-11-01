import React, { useEffect, useRef, useState } from 'react';
import { Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AYLAR } from '../lib/tarih';
import { useColors, radius, space } from '../theme';
import { Button } from './ui';

const ITEM_H = 44;
const VISIBLE = 5;

/** Kaydırmalı tekerlek: ortadaki satır seçilidir. */
function Tekerlek(props: { items: string[]; index: number; onIndex: (i: number) => void; width?: number | `${number}%` }) {
  const c = useColors();
  const ref = useRef<any>(null);
  const settled = useRef(props.index);

  useEffect(() => {
    if (settled.current !== props.index) {
      settled.current = props.index;
      ref.current?.scrollTo({ y: props.index * ITEM_H, animated: true });
    }
  }, [props.index]);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(props.items.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
    settled.current = i;
    if (i !== props.index) props.onIndex(i);
  };

  return (
    <View style={{ height: ITEM_H * VISIBLE, flex: props.width ? undefined : 1, width: props.width }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: ITEM_H * 2, height: ITEM_H, left: 4, right: 4, backgroundColor: c.primarySoft, borderRadius: radius.s }} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        onLayout={() => ref.current?.scrollTo({ y: props.index * ITEM_H, animated: false })}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
      >
        {props.items.map((it, i) => {
          const sel = i === props.index;
          return (
            <Pressable
              key={it}
              onPress={() => {
                ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
                settled.current = i;
                props.onIndex(i);
              }}
              style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: sel ? 19 : 16, fontWeight: sel ? '800' : '500', color: sel ? c.text : c.text3 }}>{it}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function yearRange(center: number): number[] {
  const now = new Date().getFullYear();
  const from = Math.min(now - 3, center - 1);
  const to = Math.max(now + 6, center + 1);
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** Ay ve yıl tekerlekleri yan yana */
export function AyYilTekerlek(props: { y: number; m: number; onChange: (y: number, m: number) => void }) {
  const [years] = useState(() => yearRange(props.y));
  return (
    <View style={{ flexDirection: 'row', gap: space.s }}>
      <Tekerlek items={AYLAR} index={props.m - 1} onIndex={(i) => props.onChange(props.y, i + 1)} />
      <Tekerlek items={years.map(String)} index={Math.max(0, years.indexOf(props.y))} onIndex={(i) => props.onChange(years[i], props.m)} width="38%" />
    </View>
  );
}

/** Takvim sekmesi için alttan açılan ay/yıl seçici */
export function AyYilSecici(props: { visible: boolean; y: number; m: number; onCancel: () => void; onConfirm: (y: number, m: number) => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [v, setV] = useState({ y: props.y, m: props.m });
  useEffect(() => {
    if (props.visible) setV({ y: props.y, m: props.m });
  }, [props.visible, props.y, props.m]);
  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onCancel}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={props.onCancel} />
      <View style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.l, borderTopRightRadius: radius.l, padding: space.l, paddingBottom: insets.bottom + space.l }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.m }}>
          <Text style={{ color: c.text, fontSize: 17, fontWeight: '700', flex: 1 }}>Ay ve yıl seç</Text>
          <Pressable onPress={props.onCancel} hitSlop={10} accessibilityLabel="Kapat">
            <Ionicons name="close" size={26} color={c.text2} />
          </Pressable>
        </View>
        <AyYilTekerlek y={v.y} m={v.m} onChange={(y, m) => setV({ y, m })} />
        <Button title={`${AYLAR[v.m - 1]} ${v.y} ayına git`} style={{ marginTop: space.l }} onPress={() => props.onConfirm(v.y, v.m)} />
      </View>
    </Modal>
  );
}
