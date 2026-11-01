import React from 'react';
import { Text, View } from 'react-native';
import type { Reservation, Villa, Agency } from '../lib/types';
import { STATUS_LABEL } from '../lib/types';
import { fmtRange, nights, today, fmt } from '../lib/tarih';
import { money } from '../lib/para';
import { awaitingCompletion, missingOf, moneyOf, optionExpired, MISSING_LABEL } from '../lib/durum';
import { statusColors, useColors } from '../theme';
import { localDateOf, localTimeOf } from '../lib/ucret';
import { Badge, Card } from './ui';

export function RezKart(props: { r: Reservation; villas: Villa[]; agencies?: Agency[]; onPress: () => void; showMoney?: boolean }) {
  const c = useColors();
  const r = props.r;
  const t = today();
  const villa = props.villas.find((v) => v.id === r.villa_id)?.name ?? '—';
  const agency = props.agencies?.find((a) => a.id === r.agency_id)?.name;
  const col = statusColors(c, r.status);
  const m = moneyOf(r);
  const missing = missingOf(r, t);
  return (
    <Card onPress={props.onPress} style={{ paddingVertical: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: col.border, marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', flex: 1 }} numberOfLines={1}>
              {r.guest_name || 'İsimsiz misafir'}
            </Text>
            {props.showMoney !== false ? (
              <Text style={{ color: c.text, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{money(r.gross_minor, r.currency)}</Text>
            ) : null}
          </View>
          <Text style={{ color: c.text2, fontSize: 14, marginTop: 2 }}>
            {villa} · {fmtRange(r.check_in, r.check_out)} · {nights(r.check_in, r.check_out)} gece
          </Text>
          {agency ? <Text style={{ color: c.text3, fontSize: 13, marginTop: 1 }}>{agency}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
            <Badge label={STATUS_LABEL[r.status]} bg={r.status === 'confirmed' ? c.primarySoft : col.bg} fg={r.status === 'confirmed' ? c.deep : col.fg} border={col.border} />
            {r.status === 'option' && (r.hold_until || r.option_until) ? (
              <Badge
                label={`${optionExpired(r, t) ? 'Hold süresi doldu' : 'Hold bitişi'} ${r.hold_until ? `${fmt(localDateOf(r.hold_until), false)} ${localTimeOf(r.hold_until)}` : fmt(r.option_until, false)}`}
                bg={optionExpired(r, t) ? c.dangerSoft : c.holdBg}
                fg={optionExpired(r, t) ? c.danger : c.holdText}
                icon="time-outline"
              />
            ) : null}
            {r.pet ? <Badge label="Evcil hayvan" bg={c.surface2} fg={c.text2} icon="paw-outline" /> : null}
            {awaitingCompletion(r, t) ? <Badge label="Onayını bekliyor" bg={c.terraSoft} fg={c.terra} icon="checkmark-done-outline" /> : null}
            {missing.map((x) => (
              <Badge key={x} label={MISSING_LABEL[x]} bg={c.terraSoft} fg={c.terra} icon="alert-circle-outline" />
            ))}
            {props.showMoney !== false && m.remaining > 0 && r.status !== 'option' && !missing.includes('payment') ? (
              <Badge label={`Kalan ${money(m.remaining, r.currency)}`} bg={c.surface2} fg={c.text2} />
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}
