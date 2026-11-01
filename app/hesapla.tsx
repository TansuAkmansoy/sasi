import React, { useEffect, useMemo, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../src/store';
import { useColors } from '../src/theme';
import { Banner, Button, Card, Chip, ChipRow, Divider, Field, Muted, PickerField, Row, Screen, SectionTitle, Segmented, Toggle } from '../src/components/ui';
import { TakvimSecici } from '../src/components/TakvimSecici';
import { calcPrice } from '../src/lib/fiyat';
import { busyNights, findConflict } from '../src/lib/durum';
import { money, moneyInput, parseMoney, parseNumber, SYMBOL } from '../src/lib/para';
import { addDays, fmt, fmtRange, nights, today } from '../src/lib/tarih';
import { cancelDeadline, grossOf, isShortStay, paymentPlan } from '../src/lib/ucret';
import { fmtLong, DEFAULT_FEES } from '../src/lib/sablon';
import { STATUS_LABEL } from '../src/lib/types';
import { KurKarsiligi } from '../src/components/KurKarsiligi';

type DepositBy = 'none' | 'agency' | 'us';
const DUE_OPTIONS = [
  { days: 0, label: 'Girişte' },
  { days: 7, label: '7 gün önce' },
  { days: 14, label: '14 gün önce' },
  { days: 30, label: '30 gün önce' },
];

export default function HesaplaEkrani() {
  const c = useColors();
  const data = useStore((s) => s.data);
  const villas = (data?.villas ?? []).filter((v) => v.active);
  const fees = data?.settings.fees ?? DEFAULT_FEES;
  const t = today();

  const [villaId, setVillaId] = useState(villas[0]?.id ?? '');
  const [range, setRange] = useState<{ a: string; b: string } | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [stayText, setStayText] = useState('');
  const [stayManual, setStayManual] = useState(false);
  const [pet, setPet] = useState(false);
  const [petText, setPetText] = useState(moneyInput(fees.pet_fee_minor));
  const [shortText, setShortText] = useState(moneyInput(fees.short_stay_fee_minor));
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [commText, setCommText] = useState('');
  const [depBy, setDepBy] = useState<DepositBy>('none');
  const [depText, setDepText] = useState('');
  const [dueDays, setDueDays] = useState(0);
  const [parts, setParts] = useState(1);

  const villa = villas.find((v) => v.id === villaId);
  const price = useMemo(() => (range ? calcPrice(villaId, range.a, range.b, data?.prices ?? []) : null), [range, villaId, data?.prices]);
  const cur = price?.currency ?? villa?.currency ?? 'EUR';
  const n = range ? nights(range.a, range.b) : 0;
  const short = isShortStay(n, fees);
  const conflict = range ? findConflict(data?.reservations ?? [], villaId, range.a, range.b) : undefined;

  useEffect(() => {
    if (!stayManual && price?.ok) setStayText(moneyInput(price.total_minor));
  }, [price, stayManual]);

  const stay = parseMoney(stayText) ?? 0;
  const petFee = parseMoney(petText);
  const shortFee = short ? parseMoney(shortText) : null;
  const gross = grossOf(stay, pet, petFee, shortFee);
  const pct = agencyId ? parseNumber(commText) : null;
  const commission = pct != null ? Math.round((gross * pct) / 100) : 0;
  const deposit = depBy === 'none' ? 0 : parseMoney(depText) ?? 0;
  const remaining = Math.max(0, gross - deposit);
  const due = range ? addDays(range.a, -dueDays) : t;
  const start = due > t ? t : due;
  const plan = range ? paymentPlan(remaining, start === due ? due : t, due, parts) : [];
  const cancelBy = range ? cancelDeadline(range.a, fees) : null;
  const agencyName = data?.agencies.find((a) => a.id === agencyId)?.name;

  function quote(): string {
    if (!range) return '';
    const L = [
      `${villa?.name ?? 'Villa'} · ${fmtLong(range.a)} – ${fmtLong(range.b)} (${n} gece)`,
      `Giriş ${fees.check_in_time} · Çıkış ${fees.check_out_time}`,
      '',
      `Konaklama ücreti: ${money(stay, cur)}`,
    ];
    if (pet && petFee) L.push(`Evcil hayvan ücreti (tek sefer): ${money(petFee, cur)}`);
    if (shortFee) L.push(`Kısa konaklama ücreti: ${money(shortFee, cur)}`);
    L.push(`TOPLAM: ${money(gross, cur)}`, '');
    if (deposit) L.push(`Ön ödeme${depBy === 'agency' ? ' (acenteye)' : ''}: ${money(deposit, cur)}`);
    if (plan.length) {
      L.push('Ödeme planı:');
      plan.forEach((p) => L.push(`• ${fmtLong(p.date)}: ${money(p.amount_minor, cur)}`));
    }
    if (cancelBy) L.push('', `Ücretsiz iptal: ${fmtLong(cancelBy)} tarihine kadar.`);
    return L.join('\n');
  }

  return (
    <Screen title="Ücret hesapla" subtitle="Teklif ve ödeme planı" onBack={() => router.back()}>
      <ChipRow>
        {villas.map((v) => (
          <Chip key={v.id} label={v.name} selected={v.id === villaId} onPress={() => { setVillaId(v.id); setStayManual(false); }} />
        ))}
      </ChipRow>
      <PickerField label="Giriş → çıkış" value={range ? `${fmtRange(range.a, range.b)} · ${n} gece` : ''} placeholder="Tarihleri seç" onPress={() => setPickOpen(true)} />
      {conflict ? (
        <Banner kind="error" text={`Bu tarihler dolu: ${STATUS_LABEL[conflict.status]} · ${conflict.guest_name || 'Misafir'} · ${fmtRange(conflict.check_in, conflict.check_out)}`} />
      ) : range ? (
        <Banner kind="info" icon="checkmark-circle" text={`${villa?.name} bu tarihlerde boş.`} />
      ) : null}

      {range ? (
        <>
          <SectionTitle>Ücret</SectionTitle>
          <Card>
            {price?.lines.map((l) => (
              <Row key={l.label} label={`${l.label}: ${l.nights} gece × ${money(Math.round(l.weekly_minor / 7), cur)}`} value={money(l.subtotal_minor, cur)} />
            ))}
            {price?.missingMonths.length ? <Text style={{ color: c.terra, fontSize: 13 }}>{price.missingMonths.join(', ')} fiyatı girilmemiş; konaklama ücretini elle yaz.</Text> : null}
            <Field
              label="Anlaşılan konaklama ücreti"
              value={stayText}
              onChangeText={(v) => { setStayText(v); setStayManual(true); }}
              keyboardType="decimal-pad"
              suffix={SYMBOL[cur]}
              hint={stayManual && price?.ok ? `Önerilen (fiyat listesi): ${money(price.total_minor, cur)}` : 'Fiyat listesinden; anlaşılan farklıysa üzerine yaz.'}
              containerStyle={{ marginTop: 8 }}
            />
            <Toggle label="Evcil hayvan" hint="Tek seferlik ücret" value={pet} onChange={setPet} />
            {pet ? <Field label="Evcil hayvan ücreti" value={petText} onChangeText={setPetText} keyboardType="decimal-pad" suffix={SYMBOL[cur]} /> : null}
            {short ? (
              <Field label={`Kısa konaklama ücreti (${fees.short_stay_nights} geceden az)`} value={shortText} onChangeText={setShortText} keyboardType="decimal-pad" suffix={SYMBOL[cur]} />
            ) : null}
            <Divider />
            <Row label="Toplam (brüt)" value={money(gross, cur)} strong />
            <KurKarsiligi amount={gross} currency={cur} label="Bugünkü kurla" />
          </Card>

          <SectionTitle>Kanal</SectionTitle>
          <ChipRow>
            <Chip label="Direkt" selected={!agencyId} onPress={() => setAgencyId(null)} color={c.terra} />
            {(data?.agencies ?? []).map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                selected={agencyId === a.id}
                color={c.terra}
                onPress={() => {
                  setAgencyId(a.id);
                  setCommText(a.default_commission_pct != null ? String(a.default_commission_pct).replace('.', ',') : '');
                }}
              />
            ))}
          </ChipRow>
          {agencyId ? (
            <Card>
              <Field label="Komisyon" value={commText} onChangeText={setCommText} keyboardType="decimal-pad" suffix="%" />
              <Row label="Komisyon tutarı" value={money(commission, cur)} />
              <Row label="Net gelir" value={money(gross - commission, cur)} strong color={c.ok} />
            </Card>
          ) : null}

          <SectionTitle>Ödeme planı</SectionTitle>
          <Card>
            <Text style={{ color: c.text2, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Ön ödeme</Text>
            <Segmented
              value={depBy}
              onChange={setDepBy}
              options={[
                { value: 'none', label: 'Yok' },
                { value: 'agency', label: 'Acente alır' },
                { value: 'us', label: 'Biz alırız' },
              ]}
            />
            {depBy !== 'none' ? (
              <>
                <Field label="Ön ödeme tutarı" value={depText} onChangeText={setDepText} keyboardType="decimal-pad" suffix={SYMBOL[cur]} />
                <ChipRow>
                  {[20, 30, 50].map((p) => (
                    <Chip key={p} label={`%${p}`} onPress={() => setDepText(moneyInput(Math.round((gross * p) / 100 / 100) * 100))} />
                  ))}
                </ChipRow>
              </>
            ) : null}
            <Text style={{ color: c.text2, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 }}>Kalan ödeme ne zamana kadar?</Text>
            <ChipRow>
              {DUE_OPTIONS.map((o) => (
                <Chip key={o.days} label={o.label} selected={dueDays === o.days} onPress={() => setDueDays(o.days)} color={c.deep} />
              ))}
            </ChipRow>
            <Text style={{ color: c.text2, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Kaç parçada?</Text>
            <ChipRow>
              {[1, 2, 3, 4].map((p) => (
                <Chip key={p} label={String(p)} selected={parts === p} onPress={() => setParts(p)} color={c.deep} />
              ))}
            </ChipRow>
            <Divider />
            {deposit ? <Row label={`Ön ödeme${depBy === 'agency' ? ' (acenteye)' : ''} · bugün`} value={money(deposit, cur)} /> : null}
            {plan.map((p, i) => (
              <Row key={p.date + i} label={`${plan.length > 1 ? `${i + 1}. ödeme · ` : 'Kalan · '}${fmt(p.date)}`} value={money(p.amount_minor, cur)} />
            ))}
            {!plan.length && !deposit ? <Muted>Ödenecek tutar yok.</Muted> : null}
            <Divider />
            <Row label="Son iptal tarihi" value={cancelBy ? fmt(cancelBy) : '—'} color={cancelBy && cancelBy < t ? c.danger : undefined} />
            {cancelBy && cancelBy < t ? <Text style={{ color: c.danger, fontSize: 13 }}>Giriş 1 aydan yakın: iptal süresi geçmiş olur.</Text> : null}
          </Card>

          <View style={{ gap: 8, marginTop: 8 }}>
            <Button
              title="Bu bilgilerle hold aç"
              icon="time-outline"
              disabled={!!conflict}
              onPress={() =>
                router.push({
                  pathname: '/rezervasyon/[id]',
                  params: {
                    id: 'yeni',
                    villa: villaId,
                    giris: range.a,
                    cikis: range.b,
                    konaklama: String(stay),
                    onerilen: price?.ok ? String(price.total_minor) : '',
                    elle: stayManual ? '1' : '0',
                    evcil: pet ? String(petFee ?? '') : '',
                    kisa: shortFee != null ? String(shortFee) : '',
                    acente: agencyId ?? '',
                    komisyon: agencyId ? commText : '',
                    paraBirimi: cur,
                  },
                })
              }
            />
            <Button title="Teklifi paylaş" icon="share-outline" kind="secondary" onPress={() => Share.share({ message: quote() })} />
          </View>
          {agencyName ? <Muted style={{ marginTop: 8, textAlign: 'center' }}>Komisyon teklif metnine yazılmaz.</Muted> : null}
        </>
      ) : (
        <Muted style={{ marginTop: 8 }}>Villa ve tarihleri seç; konaklama ücreti aylık fiyatlardan hesaplanır, evcil hayvan ve kısa konaklama ücretleri eklenir, ödeme planı çıkar.</Muted>
      )}

      <TakvimSecici
        visible={pickOpen}
        mode="range"
        title={`${villa?.name ?? ''} · tarihler`}
        busy={busyNights(data?.reservations ?? [], villaId)}
        start={range?.a ?? null}
        end={range?.b ?? null}
        onCancel={() => setPickOpen(false)}
        onConfirm={(a, b) => {
          setRange({ a, b });
          setStayManual(false);
          setPickOpen(false);
        }}
      />
    </Screen>
  );
}
