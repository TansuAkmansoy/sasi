import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, radius, space, useColors } from '../theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Screen(props: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: React.ReactNode;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const header = (
    <View style={[s.header, { paddingTop: insets.top + space.s, backgroundColor: c.bg, borderBottomColor: c.border }]}>
      {props.onBack ? (
        <Pressable onPress={props.onBack} hitSlop={12} accessibilityLabel="Geri" style={s.back}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: c.text }]} numberOfLines={1}>
          {props.title}
        </Text>
        {props.subtitle ? <Text style={[s.subtitle, { color: c.text2 }]} numberOfLines={1}>{props.subtitle}</Text> : null}
      </View>
      {props.right}
    </View>
  );
  const body =
    props.scroll === false ? (
      <View style={{ flex: 1 }}>{props.children}</View>
    ) : (
      <ScrollView
        contentContainerStyle={{ padding: space.l, paddingBottom: space.xl * 3 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={props.onRefresh ? <RefreshControl refreshing={!!props.refreshing} onRefresh={props.onRefresh} tintColor={c.primary} colors={[c.primary]} /> : undefined}
      >
        {props.children}
      </ScrollView>
    );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {header}
      {body}
      {props.footer ? (
        <View style={[s.footer, { paddingBottom: insets.bottom + space.s, backgroundColor: c.surface, borderTopColor: c.border }]}>{props.footer}</View>
      ) : null}
    </View>
  );
}

export function IconButton(props: { icon: IconName; onPress: () => void; label: string; color?: string }) {
  const c = useColors();
  return (
    <Pressable onPress={props.onPress} hitSlop={8} accessibilityLabel={props.label} style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.6 }]}>
      <Ionicons name={props.icon} size={24} color={props.color ?? c.text} />
    </Pressable>
  );
}

export function Card(props: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const c = useColors();
  const st = [s.card, { backgroundColor: c.surface, borderColor: c.border }, props.style];
  if (props.onPress)
    return (
      <Pressable onPress={props.onPress} style={({ pressed }) => [st, pressed && { opacity: 0.85 }]}>
        {props.children}
      </Pressable>
    );
  return <View style={st}>{props.children}</View>;
}

export function SectionTitle(props: { children: React.ReactNode; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[s.sectionRow, props.style]}>
      <Text style={[s.section, { color: c.text2 }]}>{props.children}</Text>
      {props.right}
    </View>
  );
}

export function Button(props: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const c = useColors();
  const kind = props.kind ?? 'primary';
  const map = {
    primary: { bg: c.primary, fg: c.primaryText, border: c.primary },
    secondary: { bg: c.surface, fg: c.text, border: c.border },
    danger: { bg: c.surface, fg: c.danger, border: c.danger },
    ghost: { bg: 'transparent', fg: c.primary, border: 'transparent' },
  }[kind];
  const off = props.disabled || props.loading;
  return (
    <Pressable
      onPress={off ? undefined : props.onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      style={({ pressed }) => [
        s.btn,
        props.small && s.btnSmall,
        { backgroundColor: map.bg, borderColor: map.border, opacity: off ? 0.5 : pressed ? 0.8 : 1 },
        props.style,
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={map.fg} />
      ) : (
        <>
          {props.icon ? <Ionicons name={props.icon} size={props.small ? 16 : 20} color={map.fg} style={{ marginRight: 6 }} /> : null}
          <Text style={[s.btnText, props.small && { fontSize: 14 }, { color: map.fg }]}>{props.title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip(props: { label: string; selected?: boolean; onPress?: () => void; color?: string; icon?: IconName }) {
  const c = useColors();
  const sel = !!props.selected;
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: sel }}
      style={({ pressed }) => [
        s.chip,
        { backgroundColor: sel ? props.color ?? c.primary : c.surface, borderColor: sel ? props.color ?? c.primary : c.border },
        pressed && { opacity: 0.75 },
      ]}
    >
      {props.icon ? <Ionicons name={props.icon} size={15} color={sel ? c.primaryText : c.text2} style={{ marginRight: 4 }} /> : null}
      <Text style={{ color: sel ? c.primaryText : c.text, fontSize: 14, fontWeight: sel ? '600' : '400' }}>{props.label}</Text>
    </Pressable>
  );
}

export function ChipRow(props: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.chipRow, props.style]}>{props.children}</View>;
}

export function Badge(props: { label: string; bg: string; fg: string; border?: string; icon?: IconName }) {
  return (
    <View style={[s.badge, { backgroundColor: props.bg, borderColor: props.border ?? props.bg }]}>
      {props.icon ? <Ionicons name={props.icon} size={12} color={props.fg} style={{ marginRight: 3 }} /> : null}
      <Text style={{ color: props.fg, fontSize: 12, fontWeight: '600' }}>{props.label}</Text>
    </View>
  );
}

export function Field(props: TextInputProps & { label: string; hint?: string; error?: string | null; suffix?: string; containerStyle?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const { label, hint, error, suffix, containerStyle, style, ...rest } = props;
  return (
    <View style={[{ marginBottom: space.m }, containerStyle]}>
      <Text style={[s.label, { color: c.text2 }]}>{label}</Text>
      <View style={[s.inputWrap, { backgroundColor: c.surface, borderColor: error ? c.danger : c.border }]}>
        <TextInput placeholderTextColor={c.text3} style={[s.input, { color: c.text }, style as StyleProp<TextStyle>]} {...rest} />
        {suffix ? <Text style={{ color: c.text2, fontSize: 16, marginLeft: 6 }}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={[s.hint, { color: c.danger }]}>{error}</Text> : hint ? <Text style={[s.hint, { color: c.text3 }]}>{hint}</Text> : null}
    </View>
  );
}

/** Dokununca seçici açan alan (tarih vb.) */
export function PickerField(props: { label: string; value: string; placeholder?: string; onPress: () => void; icon?: IconName; onClear?: () => void; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[{ marginBottom: space.m }, props.style]}>
      <Text style={[s.label, { color: c.text2 }]}>{props.label}</Text>
      <Pressable onPress={props.onPress} style={({ pressed }) => [s.inputWrap, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.8 : 1 }]}>
        <Ionicons name={props.icon ?? 'calendar-outline'} size={18} color={c.text2} style={{ marginRight: 8 }} />
        <Text style={[s.input, { color: props.value ? c.text : c.text3, paddingVertical: 12 }]}>{props.value || props.placeholder || 'Seç'}</Text>
        {props.onClear && props.value ? (
          <Pressable onPress={props.onClear} hitSlop={10} accessibilityLabel="Temizle">
            <Ionicons name="close-circle" size={20} color={c.text3} />
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

export function Row(props: { label: string; value: React.ReactNode; strong?: boolean; color?: string }) {
  const c = useColors();
  return (
    <View style={s.row}>
      <Text style={{ color: c.text2, fontSize: 14, flexShrink: 1 }}>{props.label}</Text>
      {typeof props.value === 'string' || typeof props.value === 'number' ? (
        <Text style={{ color: props.color ?? c.text, fontSize: props.strong ? 16 : 14, fontWeight: props.strong ? '700' : '500', fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 1 }}>
          {props.value}
        </Text>
      ) : (
        props.value
      )}
    </View>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: space.s }} />;
}

export function EmptyState(props: { icon: IconName; title: string; text?: string; action?: { title: string; onPress: () => void } }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xl * 2, paddingHorizontal: space.l }}>
      <Ionicons name={props.icon} size={44} color={c.text3} />
      <Text style={{ color: c.text, fontSize: 17, fontWeight: '600', marginTop: space.m, textAlign: 'center' }}>{props.title}</Text>
      {props.text ? <Text style={{ color: c.text2, fontSize: 14, marginTop: 6, textAlign: 'center' }}>{props.text}</Text> : null}
      {props.action ? <Button title={props.action.title} onPress={props.action.onPress} style={{ marginTop: space.l }} /> : null}
    </View>
  );
}

export function Banner(props: { text: string; kind?: 'info' | 'warn' | 'error'; icon?: IconName; action?: { title: string; onPress: () => void } }) {
  const c = useColors();
  const k = props.kind ?? 'info';
  const col = k === 'error' ? { bg: c.dangerSoft, fg: c.danger } : k === 'warn' ? { bg: c.terraSoft, fg: c.terra } : { bg: c.primarySoft, fg: c.deep };
  return (
    <View style={[s.banner, { backgroundColor: col.bg }]}>
      <Ionicons name={props.icon ?? (k === 'info' ? 'information-circle' : 'warning')} size={20} color={col.fg} style={{ marginRight: 8, marginTop: 1 }} />
      <Text style={{ color: c.text, flex: 1, fontSize: 14, lineHeight: 20 }}>{props.text}</Text>
      {props.action ? (
        <Pressable onPress={props.action.onPress} hitSlop={8}>
          <Text style={{ color: col.fg, fontWeight: '700', marginLeft: 8 }}>{props.action.title}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Progress(props: { value: number; max: number }) {
  const c = useColors();
  const pct = props.max > 0 ? Math.min(1, Math.max(0, props.value / props.max)) : 0;
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surface2, overflow: 'hidden', marginVertical: 6 }}>
      <View style={{ width: `${pct * 100}%` as `${number}%`, height: 8, backgroundColor: pct >= 1 ? c.ok : c.primary }} />
    </View>
  );
}

export function Segmented<T extends string>(props: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const c = useColors();
  return (
    <View style={[s.seg, { backgroundColor: c.surface2 }]}>
      {props.options.map((o) => {
        const sel = o.value === props.value;
        return (
          <Pressable key={o.value} onPress={() => props.onChange(o.value)} accessibilityState={{ selected: sel }} style={[s.segItem, sel && { backgroundColor: c.surface }]}>
            <Text style={{ color: sel ? c.text : c.text2, fontWeight: sel ? '700' : '500', fontSize: 14 }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle(props: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const c = useColors();
  return (
    <Pressable onPress={() => props.onChange(!props.value)} accessibilityRole="switch" accessibilityState={{ checked: props.value }} style={[s.row, { paddingVertical: space.s }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontSize: 15 }}>{props.label}</Text>
        {props.hint ? <Text style={{ color: c.text3, fontSize: 12, marginTop: 2 }}>{props.hint}</Text> : null}
      </View>
      <View style={[s.track, { backgroundColor: props.value ? c.primary : c.surface2, borderColor: props.value ? c.primary : c.border }]}>
        <View style={[s.thumb, { backgroundColor: '#fff', transform: [{ translateX: props.value ? 20 : 0 }] }]} />
      </View>
    </Pressable>
  );
}

export function Muted(props: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[{ color: c.text2, fontSize: 14, lineHeight: 20 }, props.style]}>{props.children}</Text>;
}

export function makeText(c: Colors) {
  return {
    h1: { color: c.text, fontSize: 22, fontWeight: '700' } as TextStyle,
    h2: { color: c.text, fontSize: 17, fontWeight: '700' } as TextStyle,
    body: { color: c.text, fontSize: 15 } as TextStyle,
    small: { color: c.text2, fontSize: 13 } as TextStyle,
  };
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.l, paddingBottom: space.m, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { marginRight: space.m, padding: 2 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  footer: { paddingHorizontal: space.l, paddingTop: space.s, borderTopWidth: StyleSheet.hairlineWidth },
  iconBtn: { padding: 6, marginLeft: 4, minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth, padding: space.l, marginBottom: space.m },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.l, marginBottom: space.s },
  section: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  btn: { minHeight: 48, borderRadius: radius.m, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.l },
  btnSmall: { minHeight: 38, paddingHorizontal: space.m },
  btnText: { fontSize: 16, fontWeight: '700' },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 38, marginRight: 8, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, marginRight: 6, marginTop: 4 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.s, paddingHorizontal: space.m, minHeight: 48 },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  hint: { fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: radius.m, padding: space.m, marginBottom: space.m },
  seg: { flexDirection: 'row', borderRadius: radius.m, padding: 3, marginBottom: space.m },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: radius.s, paddingHorizontal: 6 },
  track: { width: 48, height: 28, borderRadius: 14, borderWidth: 1, padding: 3 },
  thumb: { width: 20, height: 20, borderRadius: 10 },
});
