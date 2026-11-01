import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onay } from '../../src/lib/onay';
import { Alert, BackHandler, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../src/store';
import { useColors, space, radius, statusColors } from '../../src/theme';
import {
  Badge,
  Banner,
  Button,
  Card,
  Chip,
  ChipRow,
  Divider,
  Field,
  IconButton,
  Muted,
  PickerField,
  Progress,
  Row,
  Screen,
  SectionTitle,
  Segmented,
  Toggle,
} from '../../src/components/ui';
import { TakvimSecici } from '../../src/components/TakvimSecici';
import type { Currency, HistoryEntry, Payment, PaymentKind, PaymentMethod, RefundStatus, Reservation } from '../../src/lib/types';
import { CURRENCIES, METHOD_LABEL, PAYMENT_KIND_LABEL, REFUND_LABEL, STATUS_LABEL } from '../../src/lib/types';
import { addDays, fmt, fmtRange, nights, today } from '../../src/lib/tarih';
import { money, moneyInput, parseMoney, parseNumber, SYMBOL } from '../../src/lib/para';
import { calcPrice } from '../../src/lib/fiyat';
import { awaitingCompletion, busyNights, commissionOf, findConflict, missingOf, moneyOf, MISSING_LABEL, optionExpired } from '../../src/lib/durum';
import { ConflictError } from '../../src/data/backend';
import { grossOf, holdUntilFromNow, isShortStay, localDateOf, localTimeOf, stayOf } from '../../src/lib/ucret';
import { googleCalendarUrl } from '../../src/lib/gtakvim';
import { KurKarsiligi } from '../../src/components/KurKarsiligi';
import { getRates } from '../../src/data/kur';
import { crossRate } from '../../src/lib/kur';

type Form = Omit<Reservation, 'payments'>;

function emptyForm(villaId: string, currency: Currency, checkIn: string, checkOut: string): Form {
  const hold = holdUntilFromNow(24);
  return {
    villa_id: villaId,
    status: 'option',
    check_in: checkIn,
    check_out: checkOut,
    option_until: localDateOf(hold),
    hold_until: hold,
    stay_minor: null,
    suggested_minor: null,
    pet: false,
    pet_fee_minor: null,
    short_stay_fee_minor: null,
    guest_name: '',
    guest_phone: null,
    guest_email: null,
    guests_count: null,
    currency,
    gross_minor: 0,
    manual_price: false,
    agency_id: null,
    commission_pct: null,
    commission_minor: null,
    invoice_date: null,
    registry_done: false,
    registry_date: null,
    note: null,
    cancel_date: null,
    cancel_reason: null,
    refund_status: null,
    deduction_minor: null,
  };
}

const FIELD_LABEL: Record<string, string> = {
  villa_id: 'Villa', status: 'Durum', check_in: 'Giriş', check_out: 'Çıkış', option_until: 'Hold bitiş günü', hold_until: 'Hold bitişi',
  stay_minor: 'Anlaşılan konaklama ücreti', suggested_minor: 'Önerilen ücret', pet: 'Evcil hayvan', pet_fee_minor: 'Evcil hayvan ücreti', short_stay_fee_minor: 'Kısa konaklama ücreti', guest_name: 'Misafir',
  guest_phone: 'Telefon', guest_email: 'E-posta', guests_count: 'Kişi sayısı', currency: 'Para birimi', gross_minor: 'Brüt ücret',
  manual_price: 'Elle fiyat', agency_id: 'Acente', commission_pct: 'Komisyon %', commission_minor: 'Komisyon tutarı',
  invoice_date: 'Fatura tarihi', registry_done: 'Konaklama defteri', registry_date: 'Defter tarihi', note: 'Not',
  cancel_date: 'İptal tarihi', cancel_reason: 'İptal nedeni', refund_status: 'İade durumu', deduction_minor: 'Kesinti',
};

export default function RezervasyonEkrani() {
  const c = useColors();
  const params = useLocalSearchParams<{
    id: string; villa?: string; giris?: string; cikis?: string;
    // Ücret hesaplama ekranından gelenler
    konaklama?: string; onerilen?: string; elle?: string; evcil?: string; kisa?: string; acente?: string; komisyon?: string; paraBirimi?: string;
  }>();
  const isNew = params.id === 'yeni';
  const data = useStore((s) => s.data);
  const backend = useStore((s) => s.backend);
  const saveReservation = useStore((s) => s.saveReservation);
  const offline = useStore((s) => s.offline);
  const t = today();

  const villas = (data?.villas ?? []).filter((v) => v.active);
  const existing = !isNew ? data?.reservations.find((r) => r.id === params.id) : undefined;

  const initial = useMemo(() => {
    if (existing) {
      const { payments, ...f } = existing;
      return { form: { ...f, stay_minor: stayOf(existing) } as Form, payments };
    }
    const v = villas.find((x) => x.id === params.villa) ?? villas[0];
    const ci = params.giris ?? '';
    const co = params.cikis ?? (ci ? addDays(ci, 7) : '');
    const f = emptyForm(v?.id ?? '', v?.currency ?? 'EUR', ci, co);
    if (params.konaklama) {
      const num = (x?: string) => (x ? Number(x) : null);
      f.stay_minor = num(params.konaklama);
      f.suggested_minor = num(params.onerilen);
      f.manual_price = params.elle === '1';
      f.pet = !!params.evcil;
      f.pet_fee_minor = num(params.evcil);
      f.short_stay_fee_minor = num(params.kisa);
      f.agency_id = params.acente || null;
      f.commission_pct = params.komisyon ? Number(params.komisyon.replace(',', '.')) : null;
      if (params.paraBirimi) f.currency = params.paraBirimi as Currency;
      f.gross_minor = grossOf(f.stay_minor ?? 0, f.pet, f.pet_fee_minor, f.short_stay_fee_minor);
    }
    return { form: f, payments: [] as Payment[] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, existing?.updated_at]);

  const [form, setForm] = useState<Form>(initial.form);
  const [payments, setPayments] = useState<Payment[]>(initial.payments);
  const [grossText, setGrossText] = useState(moneyInput(initial.form.stay_minor || null));
  const [petText, setPetText] = useState(moneyInput(initial.form.pet_fee_minor));
  const [shortText, setShortText] = useState(moneyInput(initial.form.short_stay_fee_minor));
  const [commMode, setCommMode] = useState<'pct' | 'amount'>(initial.form.commission_minor != null ? 'amount' : 'pct');
  const [commText, setCommText] = useState(
    initial.form.commission_minor != null ? moneyInput(initial.form.commission_minor) : initial.form.commission_pct != null ? String(initial.form.commission_pct).replace('.', ',') : '',
  );
  const [picker, setPicker] = useState<null | 'range' | 'option' | 'invoice' | 'registry' | 'cancel'>(null);
  const [payEdit, setPayEdit] = useState<{ index: number | null; p: Payment } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [saving, setSaving] = useState(false);
  // Kayıtlı rezervasyonda fiyat, ancak villa/tarih/para birimi değiştirilirse yeniden hesaplanır
  const [priceTouched, setPriceTouched] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const baseline = useRef(JSON.stringify({ f: initial.form, p: initial.payments }));

  useEffect(() => {
    setForm(initial.form);
    setPayments(initial.payments);
    setGrossText(moneyInput(initial.form.stay_minor || null));
    setPetText(moneyInput(initial.form.pet_fee_minor));
    setShortText(moneyInput(initial.form.short_stay_fee_minor));
    baseline.current = JSON.stringify({ f: initial.form, p: initial.payments });
  }, [initial]);

  useEffect(() => {
    if (!existing?.id || !backend) return;
    backend.history(existing.id).then(setHistory).catch(() => setHistory([]));
  }, [existing?.id, existing?.updated_at, backend]);

  const dirty = JSON.stringify({ f: form, p: payments }) !== baseline.current;

  function leave() {
    if (!dirty) return router.back();
    onay('Kaydedilmemiş değişiklikler', 'Değişiklikler kaydedilmedi. Çıkmak istiyor musun?', [
      { text: 'Düzenlemeye devam', style: 'cancel' },
      { text: 'Kaydetmeden çık', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!dirty) return false;
      leave();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // ---- fiyat ----
  const price = useMemo(
    () => calcPrice(form.villa_id, form.check_in, form.check_out, data?.prices ?? []),
    [form.villa_id, form.check_in, form.check_out, data?.prices],
  );
  const priceUsable = price.ok && price.currency === form.currency;

  useEffect(() => {
    if (form.manual_price || !priceUsable || !(isNew || priceTouched)) return;
    if (form.stay_minor !== price.total_minor) {
      setForm((f) => ({ ...f, stay_minor: price.total_minor }));
      setGrossText(moneyInput(price.total_minor));
    }
  }, [priceUsable, price.total_minor, form.manual_price, form.stay_minor, isNew, priceTouched]);

  // Brüt = konaklama + ekstralar (her zaman)
  useEffect(() => {
    const g = grossOf(form.stay_minor ?? 0, form.pet, form.pet_fee_minor, form.short_stay_fee_minor);
    if (g !== form.gross_minor) setForm((f) => ({ ...f, gross_minor: g }));
  }, [form.stay_minor, form.pet, form.pet_fee_minor, form.short_stay_fee_minor, form.gross_minor]);

  // Kısa konaklama: 5 geceden azsa varsayılan ücreti öner, uzarsa kaldır
  const fees = data?.settings.fees;
  const nightsN = form.check_in && form.check_out ? nights(form.check_in, form.check_out) : 0;
  const shortStay = !!fees && isShortStay(nightsN, fees);
  useEffect(() => {
    if (!fees || !(isNew || priceTouched)) return;
    if (shortStay && form.short_stay_fee_minor == null && fees.short_stay_fee_minor != null && fees.currency === form.currency) {
      setForm((f) => ({ ...f, short_stay_fee_minor: fees.short_stay_fee_minor }));
      setShortText(moneyInput(fees.short_stay_fee_minor));
    }
    if (!shortStay && nightsN > 0 && form.short_stay_fee_minor != null) {
      setForm((f) => ({ ...f, short_stay_fee_minor: null }));
      setShortText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortStay, nightsN, isNew, priceTouched, form.currency]);

  // ---- komisyon ----
  useEffect(() => {
    if (!form.agency_id) return;
    const n = commMode === 'pct' ? parseNumber(commText) : parseMoney(commText);
    setForm((f) => ({
      ...f,
      commission_pct: commMode === 'pct' ? n : null,
      commission_minor: commMode === 'amount' ? n : null,
    }));
  }, [commText, commMode, form.agency_id]);

  const busy = useMemo(() => busyNights(data?.reservations ?? [], form.villa_id, existing?.id), [data, form.villa_id, existing?.id]);
  const resLike: Reservation = { ...form, payments };
  const m = moneyOf(resLike);
  const conflict = form.check_in && form.check_out && ['option', 'confirmed', 'completed'].includes(form.status)
    ? findConflict(data?.reservations ?? [], form.villa_id, form.check_in, form.check_out, existing?.id)
    : undefined;
  const villaName = (id: string) => data?.villas.find((v) => v.id === id)?.name ?? '—';

  function validate(f: Form): string | null {
    if (!f.villa_id) return 'Villa seç.';
    if (!f.check_in || !f.check_out) return 'Giriş ve çıkış tarihlerini seç.';
    if (f.check_out <= f.check_in) return 'Çıkış, girişten sonra olmalı.';
    if (!f.guest_name.trim()) return 'Misafirin adını yaz.';
    if (f.status === 'option' && !f.option_until) return 'Hold bitişini seç (24 saat, 48 saat ya da tarih).';
    if (f.agency_id && commText.trim() && (commMode === 'pct' ? parseNumber(commText) : parseMoney(commText)) == null) return 'Komisyon değeri okunamadı.';
    return null;
  }

  async function save(override?: Partial<Form>, after?: 'back' | 'stay'): Promise<boolean> {
    const f: Form = { ...form, ...override, guest_name: form.guest_name.trim() };
    // Önerilen ücret: fiyat listesinden o an hesaplanan. Tarih/villa değişmediyse eski değer korunur.
    if ((isNew || priceTouched) && priceUsable) f.suggested_minor = price.total_minor;
    if (!f.agency_id) {
      f.commission_pct = null;
      f.commission_minor = null;
    }
    const v = validate(f);
    if (v) {
      setErr(v);
      return false;
    }
    if (['option', 'confirmed', 'completed'].includes(f.status)) {
      const cf = findConflict(data?.reservations ?? [], f.villa_id, f.check_in, f.check_out, existing?.id);
      if (cf) {
        setErr(`Bu tarihler dolu: ${cf.guest_name || 'Misafir'} · ${fmtRange(cf.check_in, cf.check_out)}. Takvimden başka tarih seç.`);
        return false;
      }
    }
    setErr(null);
    setSaving(true);
    try {
      const id = await saveReservation(f, payments);
      baseline.current = JSON.stringify({ f, p: payments });
      setForm(f);
      if (after === 'stay' && isNew) router.replace({ pathname: '/rezervasyon/[id]', params: { id } });
      else if (after !== 'stay') router.back();
      return true;
    } catch (e) {
      setErr(e instanceof ConflictError ? e.message : (e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  // ---- durum eylemleri ----
  function confirmOption() {
    save({ status: 'confirmed', option_until: null, hold_until: null }, 'stay');
  }
  function releaseOption() {
    onay('Hold\'u bırak', 'Tarihler boşalır ve başkasına satılabilir. Kayıt "Hold bırakıldı" olarak saklanır.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Bırak', style: 'destructive', onPress: () => save({ status: 'option_released' }, 'stay') },
    ]);
  }
  function complete() {
    const miss = missingOf({ ...resLike, status: 'completed' }, t);
    const go = () => save({ status: 'completed' }, 'stay');
    if (!miss.length) return go();
    onay('Eksik bilgi var', `${miss.map((x) => '• ' + MISSING_LABEL[x]).join('\n')}\n\nYine de arşive alınsın mı? Sonra da düzenleyebilirsin.`, [
      { text: 'Düzenle', style: 'cancel' },
      { text: 'Yine de tamamla', onPress: go },
    ]);
  }
  function reactivate() {
    save({ status: 'confirmed', cancel_date: null, cancel_reason: null, refund_status: null, deduction_minor: null }, 'stay');
  }
  function startCancel() {
    setCancelling(true);
    setForm((f) => ({ ...f, cancel_date: f.cancel_date ?? t, refund_status: f.refund_status ?? (m.net_received > 0 ? 'pending' : 'none') }));
  }

  if (!isNew && !existing) {
    return (
      <Screen title="Rezervasyon" onBack={() => router.back()}>
        <Muted>Bu kayıt bulunamadı. Silinmiş ya da henüz yüklenmemiş olabilir.</Muted>
      </Screen>
    );
  }

  const st = existing?.status ?? form.status;
  const stCol = statusColors(c, st);
  const showCancelPanel = cancelling || form.status === 'cancelled';

  return (
    <Screen
      title={isNew ? 'Yeni rezervasyon' : form.guest_name || 'Rezervasyon'}
      subtitle={!isNew ? `${villaName(form.villa_id)} · ${STATUS_LABEL[st]}` : undefined}
      onBack={leave}
      right={
        !isNew && existing ? (
          <IconButton icon="calendar-outline" label="Google Takvim'e ekle" onPress={() => Linking.openURL(googleCalendarUrl(existing, villaName(existing.villa_id), data!.settings.fees))} />
        ) : undefined
      }
      footer={
        <Button
          title={cancelling ? 'İptali kaydet' : isNew ? 'Rezervasyonu kaydet' : 'Değişiklikleri kaydet'}
          kind={cancelling ? 'danger' : 'primary'}
          icon={cancelling ? 'close-circle-outline' : 'checkmark'}
          loading={saving}
          disabled={offline || (!dirty && !isNew && !cancelling)}
          onPress={() => (cancelling ? save({ status: 'cancelled' }, 'stay').then((ok) => ok && setCancelling(false)) : save(undefined, isNew ? 'back' : 'stay'))}
        />
      }
    >
      {offline ? <Banner kind="warn" icon="cloud-offline-outline" text="Çevrimdışısın. Çifte satışı önlemek için kayıt bağlantı gelince yapılabilir." /> : null}
      {err ? <Banner kind="error" text={err} /> : null}

      {/* Durum ve eylemler */}
      {!isNew ? (
        <Card style={{ borderColor: stCol.border, borderWidth: 1.5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge label={STATUS_LABEL[st]} bg={st === 'confirmed' ? c.primarySoft : stCol.bg} fg={st === 'confirmed' ? c.deep : stCol.fg} border={stCol.border} />
            {existing && optionExpired(existing, t) ? <Badge label="Hold süresi doldu" bg={c.dangerSoft} fg={c.danger} icon="time-outline" /> : null}
            {existing && awaitingCompletion(existing, t) ? <Badge label="Konaklama bitti" bg={c.terraSoft} fg={c.terra} /> : null}
          </View>
          {st === 'option' ? (
            <>
              <Muted style={{ marginTop: 8 }}>Hold bitişi: {holdText(existing?.hold_until ?? null, existing?.option_until ?? null)}</Muted>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Button title="Onayla, tarihleri kapat" icon="checkmark-circle-outline" small style={{ flex: 2 }} onPress={confirmOption} />
                <Button title="Bırak" kind="danger" small style={{ flex: 1 }} onPress={releaseOption} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button title="+24 saat uzat" kind="secondary" small style={{ flex: 1 }} onPress={() => { const h = holdUntilFromNow(24); save({ hold_until: h, option_until: localDateOf(h) }, 'stay'); }} />
                <Button title="+48 saat uzat" kind="secondary" small style={{ flex: 1 }} onPress={() => { const h = holdUntilFromNow(48); save({ hold_until: h, option_until: localDateOf(h) }, 'stay'); }} />
              </View>
            </>
          ) : null}
          {st === 'confirmed' && existing && awaitingCompletion(existing, t) ? (
            <>
              <Muted style={{ marginTop: 8 }}>Konaklama bitti. Son bilgileri (ödeme, fatura, defter) kontrol edip arşive al.</Muted>
              <Button title="Konaklamayı tamamla" icon="archive-outline" small style={{ marginTop: 12 }} onPress={complete} />
            </>
          ) : null}
          {st === 'completed' ? (
            <>
              <Muted style={{ marginTop: 8 }}>Arşivde. Bilgileri düzenleyip kaydedebilirsin.</Muted>
              <Button title="Arşivden çıkar" kind="secondary" small style={{ marginTop: 12 }} onPress={() => save({ status: 'confirmed' }, 'stay')} />
            </>
          ) : null}
          {st === 'cancelled' || st === 'option_released' ? (
            <Button title="Yeniden etkinleştir" kind="secondary" small style={{ marginTop: 12 }} onPress={reactivate} />
          ) : null}
        </Card>
      ) : (
        <Segmented
          value={form.status === 'option' ? 'option' : 'confirmed'}
          onChange={(v) =>
            setForm((f) => {
              if (v === 'confirmed') return { ...f, status: v, option_until: null, hold_until: null };
              const h = f.hold_until ?? holdUntilFromNow(24);
              return { ...f, status: v, hold_until: h, option_until: localDateOf(h) };
            })
          }
          options={[
            { value: 'option', label: 'Hold (talep)' },
            { value: 'confirmed', label: 'Onaylı (tarihleri kapat)' },
          ]}
        />
      )}
      {isNew && form.status === 'option' ? (
        <Card>
          <Text style={{ color: c.text2, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Hold süresi</Text>
          <ChipRow>
            <Chip label="24 saat" onPress={() => { const h = holdUntilFromNow(24); setForm((f) => ({ ...f, hold_until: h, option_until: localDateOf(h) })); }} selected={holdHours(form.hold_until) === 24} />
            <Chip label="48 saat" onPress={() => { const h = holdUntilFromNow(48); setForm((f) => ({ ...f, hold_until: h, option_until: localDateOf(h) })); }} selected={holdHours(form.hold_until) === 48} />
            <Chip label="Tarih seç" icon="calendar-outline" onPress={() => setPicker('option')} />
          </ChipRow>
          <Muted>Bitiş: {holdText(form.hold_until, form.option_until)}. Bitmeden 2 saat önce ve bittiğinde hatırlatma gelir; kararı sen verirsin.</Muted>
        </Card>
      ) : null}

      {!isNew && existing ? (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          <Button title="Mesaj / WhatsApp" icon="logo-whatsapp" small style={{ flex: 1 }} onPress={() => router.push({ pathname: '/mesaj/[id]', params: { id: existing.id! } })} />
          <Button
            title="Google Takvim"
            icon="calendar-outline"
            kind="secondary"
            small
            style={{ flex: 1 }}
            onPress={() => Linking.openURL(googleCalendarUrl(existing, villaName(existing.villa_id), data!.settings.fees))}
          />
        </View>
      ) : null}

      {/* Villa ve tarih */}
      <SectionTitle>Villa ve tarih</SectionTitle>
      <ChipRow>
        {villas.map((v) => (
          <Chip
            key={v.id}
            label={v.name}
            selected={form.villa_id === v.id}
            onPress={() => {
              setPriceTouched(true);
              setForm((f) => ({ ...f, villa_id: v.id, currency: isNew && payments.length === 0 && !f.manual_price ? v.currency : f.currency }));
            }}
          />
        ))}
      </ChipRow>
      <PickerField
        label="Giriş → çıkış"
        value={form.check_in && form.check_out ? `${fmtRange(form.check_in, form.check_out)} · ${nights(form.check_in, form.check_out)} gece` : ''}
        placeholder="Tarihleri seç"
        onPress={() => setPicker('range')}
      />
      {conflict ? (
        <Banner kind="error" text={`Çakışma: ${conflict.guest_name || 'Misafir'} · ${fmtRange(conflict.check_in, conflict.check_out)} (${STATUS_LABEL[conflict.status]})`} />
      ) : form.check_in ? (
        <Text style={{ color: c.text3, fontSize: 12, marginTop: -6, marginBottom: 8 }}>Giriş 16:00 · Çıkış 10:00</Text>
      ) : null}
      {!isNew && form.status === 'option' ? (
        <PickerField label="Hold bitişi" value={holdText(form.hold_until, form.option_until)} icon="time-outline" onPress={() => setPicker('option')} />
      ) : null}

      {/* Misafir */}
      <SectionTitle>Misafir</SectionTitle>
      <Field label="Ad soyad" value={form.guest_name} onChangeText={(v) => set('guest_name', v)} autoCapitalize="words" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Field containerStyle={{ flex: 2 }} label="Telefon" value={form.guest_phone ?? ''} onChangeText={(v) => set('guest_phone', v || null)} keyboardType="phone-pad" />
        <Field
          containerStyle={{ flex: 1 }}
          label="Kişi"
          value={form.guests_count != null ? String(form.guests_count) : ''}
          onChangeText={(v) => set('guests_count', v ? parseInt(v.replace(/\D/g, ''), 10) || null : null)}
          keyboardType="number-pad"
        />
      </View>
      {form.guest_phone ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: -4, marginBottom: 12 }}>
          <Button title="Ara" icon="call-outline" kind="secondary" small style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${form.guest_phone}`)} />
          <Button
            title="WhatsApp"
            icon="logo-whatsapp"
            kind="secondary"
            small
            style={{ flex: 1 }}
            onPress={() => Linking.openURL(`https://wa.me/${(form.guest_phone ?? '').replace(/[^\d]/g, '').replace(/^0/, '90')}`)}
          />
        </View>
      ) : null}
      <Field label="E-posta" value={form.guest_email ?? ''} onChangeText={(v) => set('guest_email', v || null)} keyboardType="email-address" autoCapitalize="none" />

      {/* Fiyat */}
      <SectionTitle>Fiyat</SectionTitle>
      <ChipRow>
        {CURRENCIES.map((cur) => (
          <Chip key={cur} label={`${SYMBOL[cur]} ${cur}`} selected={form.currency === cur} onPress={() => { setPriceTouched(true); set('currency', cur); }} />
        ))}
      </ChipRow>
      <Card>
        {price.nights > 0 ? (
          <>
            {price.lines.map((l) => (
              <Row key={l.label} label={`${l.label}: ${l.nights} gece × ${money(Math.round(l.weekly_minor / 7), price.currency ?? form.currency)}`} value={money(l.subtotal_minor, price.currency ?? form.currency)} />
            ))}
            {price.missingMonths.length ? <Text style={{ color: c.terra, fontSize: 13, marginTop: 4 }}>{price.missingMonths.join(', ')} için fiyat girilmemiş (Ayarlar → Aylık fiyatlar).</Text> : null}
            {price.ok && price.currency !== form.currency ? (
              <Text style={{ color: c.terra, fontSize: 13, marginTop: 4 }}>
                Fiyat listesi {price.currency} cinsinden; {form.currency} için tutarı elle gir. Hesaplanan: {money(price.total_minor, price.currency!)}
              </Text>
            ) : null}
            {priceUsable ? <Row label="Hesaplanan toplam" value={money(price.total_minor, form.currency)} /> : null}
            <Divider />
          </>
        ) : (
          <Muted style={{ marginBottom: 8 }}>Tarih seçince fiyat haftalık ücretlerden otomatik hesaplanır.</Muted>
        )}
        <Field
          label={`Anlaşılan konaklama ücreti${nightsN ? ` (${nightsN} gece)` : ''}`}
          value={grossText}
          onChangeText={(v) => {
            setGrossText(v);
            const n = parseMoney(v);
            setForm((f) => ({ ...f, stay_minor: n ?? 0, manual_price: true }));
          }}
          keyboardType="decimal-pad"
          suffix={SYMBOL[form.currency]}
          hint={form.manual_price ? 'Müşteriyle anlaşılan ücret; fiyat listesi değişse de bu kayıtta kalır.' : priceUsable ? 'Fiyat listesinden; anlaşılan farklıysa üzerine yaz.' : undefined}
          containerStyle={{ marginBottom: 4 }}
        />
        {form.manual_price && priceUsable && form.stay_minor !== price.total_minor ? (
          <Button
            title={`Hesaplanana dön (${money(price.total_minor, form.currency)})`}
            kind="ghost"
            small
            onPress={() => {
              setForm((f) => ({ ...f, manual_price: false, stay_minor: price.total_minor }));
              setGrossText(moneyInput(price.total_minor));
            }}
          />
        ) : null}
        <Divider />
        <Toggle
          label="Evcil hayvan gelecek"
          hint="Tek seferlik ücret"
          value={form.pet}
          onChange={(v) => {
            setForm((f) => {
              const fee = v && f.pet_fee_minor == null && fees?.pet_fee_minor != null && fees.currency === f.currency ? fees.pet_fee_minor : f.pet_fee_minor;
              if (fee !== f.pet_fee_minor) setPetText(moneyInput(fee));
              return { ...f, pet: v, pet_fee_minor: fee };
            });
          }}
        />
        {form.pet ? (
          <Field
            label="Evcil hayvan ücreti (tek sefer)"
            value={petText}
            onChangeText={(v) => { setPetText(v); set('pet_fee_minor', parseMoney(v)); }}
            keyboardType="decimal-pad"
            suffix={SYMBOL[form.currency]}
            containerStyle={{ marginTop: 6 }}
          />
        ) : null}
        {shortStay || form.short_stay_fee_minor != null ? (
          <Field
            label={`Kısa konaklama ücreti${shortStay ? ` (${fees?.short_stay_nights ?? 5} geceden az)` : ''}`}
            value={shortText}
            onChangeText={(v) => { setShortText(v); set('short_stay_fee_minor', parseMoney(v)); }}
            keyboardType="decimal-pad"
            suffix={SYMBOL[form.currency]}
            hint={shortStay && form.short_stay_fee_minor == null ? 'Bu konaklama kısa; ücreti gir.' : undefined}
            containerStyle={{ marginTop: 6 }}
          />
        ) : null}
        <Divider />
        <Row label="Toplam (brüt)" value={money(form.gross_minor, form.currency)} strong />
        {(() => {
          const sug = (isNew || priceTouched) && priceUsable ? price.total_minor : form.suggested_minor;
          if (sug == null || form.stay_minor == null || sug === form.stay_minor) return null;
          const diff = form.stay_minor - sug;
          return (
            <>
              <Row label="Önerilen (fiyat listesi)" value={money(sug, form.currency)} />
              <Row
                label="Anlaşılan fark"
                value={`${diff > 0 ? '+' : '−'}${money(Math.abs(diff), form.currency)} (${diff > 0 ? '+' : '−'}%${Math.abs(Math.round((diff / sug) * 1000) / 10).toString().replace('.', ',')})`}
                color={diff < 0 ? c.terra : c.ok}
              />
            </>
          );
        })()}
        <KurKarsiligi amount={form.gross_minor} currency={form.currency} label="Bugünkü kurla" />
        {existing?.created_at ? (
          <KurKarsiligi amount={form.gross_minor} currency={form.currency} date={localDateOf(existing.created_at)} label={`Rezervasyon günü kuruyla (${fmt(localDateOf(existing.created_at))})`} />
        ) : null}
      </Card>

      {/* Acente */}
      <SectionTitle>Kanal</SectionTitle>
      <ChipRow>
        <Chip label="Direkt" selected={!form.agency_id} onPress={() => set('agency_id', null)} color={c.terra} />
        {(data?.agencies ?? []).map((a) => (
          <Chip
            key={a.id}
            label={a.name}
            selected={form.agency_id === a.id}
            color={c.terra}
            onPress={() => {
              set('agency_id', a.id);
              if (!commText.trim() && a.default_commission_pct != null) {
                setCommMode('pct');
                setCommText(String(a.default_commission_pct).replace('.', ','));
              }
            }}
          />
        ))}
        <Chip label="+ Acente" onPress={() => router.push('/acenteler')} icon="add" />
      </ChipRow>
      {form.agency_id ? (
        <Card>
          <Segmented
            value={commMode}
            onChange={(v) => {
              setCommMode(v);
              setCommText('');
            }}
            options={[
              { value: 'pct', label: 'Oran (%)' },
              { value: 'amount', label: 'Tutar' },
            ]}
          />
          <Field label="Komisyon" value={commText} onChangeText={setCommText} keyboardType="decimal-pad" suffix={commMode === 'pct' ? '%' : SYMBOL[form.currency]} />
          <Row label="Komisyon tutarı" value={money(commissionOf(form), form.currency)} />
          <Row label="Net gelir" value={money(form.gross_minor - commissionOf(form), form.currency)} strong color={c.ok} />
        </Card>
      ) : null}

      {/* Ödemeler */}
      <SectionTitle
        right={
          <Button
            title="Ödeme ekle"
            icon="add"
            kind="ghost"
            small
            onPress={() =>
              setPayEdit({
                index: null,
                p: { kind: payments.some((p) => p.kind === 'deposit') ? 'balance' : 'deposit', amount_minor: 0, currency: form.currency, rate: null, method: 'transfer', paid_on: t },
              })
            }
          />
        }
      >
        Ödemeler
      </SectionTitle>
      <Card>
        <Row label="Alınan" value={`${money(m.net_received, form.currency)} / ${money(form.gross_minor, form.currency)}`} strong />
        <Progress value={m.net_received} max={form.gross_minor} />
        {m.remaining > 0 && form.status !== 'cancelled' ? <Row label="Kalan" value={money(m.remaining, form.currency)} color={c.terra} /> : null}
        {m.unconverted ? <Text style={{ color: c.terra, fontSize: 13 }}>Kuru girilmemiş farklı para birimli ödeme var; toplama katılmadı.</Text> : null}
        {payments.length ? <Divider /> : null}
        {payments.map((p, i) => (
          <Pressable key={p.id ?? `n${i}`} onPress={() => setPayEdit({ index: i, p })} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
            <Ionicons name={p.kind === 'refund' ? 'arrow-undo-outline' : 'cash-outline'} size={20} color={p.kind === 'refund' ? c.danger : c.primary} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: '600' }}>{PAYMENT_KIND_LABEL[p.kind]}</Text>
              <Text style={{ color: c.text2, fontSize: 13 }}>
                {fmt(p.paid_on)} · {METHOD_LABEL[p.method]}
                {p.currency !== form.currency && p.rate ? ` · kur ${String(p.rate).replace('.', ',')}` : ''}
              </Text>
            </View>
            <Text style={{ color: p.kind === 'refund' ? c.danger : c.text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {p.kind === 'refund' ? '−' : ''}
              {money(p.amount_minor, p.currency)}
            </Text>
          </Pressable>
        ))}
        {!payments.length ? <Muted>Henüz ödeme yok.</Muted> : null}
      </Card>

      {/* Resmi işler */}
      <SectionTitle>Fatura ve konaklama defteri</SectionTitle>
      <Card>
        <PickerField label="Fatura tarihi" value={form.invoice_date ? fmt(form.invoice_date) : ''} placeholder="Fatura kesilmedi" icon="document-text-outline" onPress={() => setPicker('invoice')} onClear={() => set('invoice_date', null)} />
        <Toggle
          label="Konaklama defterine işlendi"
          hint="Misafir bildirimi yapıldı mı?"
          value={form.registry_done}
          onChange={(v) => setForm((f) => ({ ...f, registry_done: v, registry_date: v ? f.registry_date ?? (f.check_in && f.check_in <= t ? f.check_in : t) : null }))}
        />
        {form.registry_done ? (
          <PickerField label="Defter kayıt tarihi" value={fmt(form.registry_date)} icon="book-outline" onPress={() => setPicker('registry')} style={{ marginTop: 8, marginBottom: 0 }} />
        ) : null}
      </Card>

      <Field label="Not" value={form.note ?? ''} onChangeText={(v) => set('note', v || null)} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} containerStyle={{ marginTop: space.l }} />

      {/* İptal */}
      {showCancelPanel ? (
        <>
          <SectionTitle>İptal</SectionTitle>
          <Card style={{ borderColor: c.danger }}>
            <PickerField label="İptal tarihi" value={fmt(form.cancel_date)} onPress={() => setPicker('cancel')} />
            <Field label="Neden" value={form.cancel_reason ?? ''} onChangeText={(v) => set('cancel_reason', v || null)} />
            <Field
              label="Kesinti (alıkonan tutar)"
              value={moneyInput(form.deduction_minor)}
              onChangeText={(v) => set('deduction_minor', parseMoney(v))}
              keyboardType="decimal-pad"
              suffix={SYMBOL[form.currency]}
            />
            <Text style={{ color: c.text2, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>İade durumu</Text>
            <ChipRow>
              {(['pending', 'refunded', 'none'] as RefundStatus[]).map((x) => (
                <Chip key={x} label={REFUND_LABEL[x]} selected={form.refund_status === x} onPress={() => set('refund_status', x)} color={c.danger} />
              ))}
            </ChipRow>
            <Row label="Alınan" value={money(m.received, form.currency)} />
            <Row label="İade edilen" value={money(m.refunded, form.currency)} />
            <Muted style={{ marginTop: 6 }}>İade yaptığında yukarıdaki Ödemeler'e "İade" türünde bir ödeme ekle.</Muted>
            {cancelling && existing?.status !== 'cancelled' ? (
              <Button title="Vazgeç" kind="ghost" small onPress={() => { setCancelling(false); setForm((f) => ({ ...f, cancel_date: existing?.cancel_date ?? null, refund_status: existing?.refund_status ?? null })); }} style={{ marginTop: 8 }} />
            ) : null}
          </Card>
        </>
      ) : !isNew && (st === 'confirmed' || st === 'option') ? (
        <Button title="Rezervasyonu iptal et" kind="danger" icon="close-circle-outline" style={{ marginTop: space.l }} onPress={startCancel} />
      ) : null}

      {/* Geçmiş */}
      {!isNew ? (
        <>
          <SectionTitle>Değişiklik geçmişi</SectionTitle>
          {history === null ? (
            <Muted>Yükleniyor…</Muted>
          ) : history.length === 0 ? (
            <Muted>Kayıt yok.</Muted>
          ) : (
            history.map((h) => <HistoryItem key={h.id} h={h} villaName={villaName} agencyName={(id) => data?.agencies.find((a) => a.id === id)?.name ?? '—'} currency={form.currency} />)
          )}
          {existing?.created_at ? <Text style={{ color: c.text3, fontSize: 12, marginTop: 8 }}>Oluşturulma: {new Date(existing.created_at).toLocaleString('tr-TR')}</Text> : null}
        </>
      ) : null}

      {/* Seçiciler */}
      <TakvimSecici
        visible={picker === 'range'}
        mode="range"
        title={`${villaName(form.villa_id)} · tarihler`}
        busy={['option', 'confirmed', 'completed'].includes(form.status) ? busy : new Set()}
        start={form.check_in || null}
        end={form.check_out || null}
        onCancel={() => setPicker(null)}
        onConfirm={(a, b) => {
          setPriceTouched(true);
          setForm((f) => ({ ...f, check_in: a, check_out: b }));
          setPicker(null);
          setErr(null);
        }}
      />
      <TakvimSecici
        visible={picker === 'option' || picker === 'invoice' || picker === 'registry' || picker === 'cancel'}
        mode="single"
        title={{ option: 'Hold bitiş günü', invoice: 'Fatura tarihi', registry: 'Defter kayıt tarihi', cancel: 'İptal tarihi' }[picker as 'option'] ?? 'Tarih'}
        value={picker === 'option' ? form.option_until : picker === 'invoice' ? form.invoice_date : picker === 'registry' ? form.registry_date : form.cancel_date}
        onCancel={() => setPicker(null)}
        onConfirm={(d) => {
          if (picker === 'option') {
            const now = new Date();
            const [y, mo, da] = d.split('-').map(Number);
            const h = new Date(y, mo - 1, da, now.getHours(), now.getMinutes()).toISOString();
            setForm((f) => ({ ...f, option_until: d, hold_until: h }));
          }
          if (picker === 'invoice') set('invoice_date', d);
          if (picker === 'registry') set('registry_date', d);
          if (picker === 'cancel') set('cancel_date', d);
          setPicker(null);
        }}
      />
      <OdemeDuzenle
        edit={payEdit}
        resCurrency={form.currency}
        onClose={() => setPayEdit(null)}
        onSave={(p) => {
          setPayments((list) => (payEdit?.index == null ? [...list, p] : list.map((x, i) => (i === payEdit.index ? p : x))));
          setPayEdit(null);
        }}
        onDelete={() => {
          setPayments((list) => list.filter((_, i) => i !== payEdit?.index));
          setPayEdit(null);
        }}
      />
    </Screen>
  );
}

function fmtValue(key: string, v: unknown, ctx: { villaName: (id: string) => string; agencyName: (id: string) => string; currency: Currency }): string {
  if (v == null || v === '') return '—';
  if (key === 'villa_id') return ctx.villaName(String(v));
  if (key === 'agency_id') return ctx.agencyName(String(v));
  if (key === 'status') return STATUS_LABEL[v as keyof typeof STATUS_LABEL] ?? String(v);
  if (key === 'refund_status') return REFUND_LABEL[v as RefundStatus] ?? String(v);
  if (key.endsWith('_minor')) return money(Number(v), ctx.currency);
  if (typeof v === 'boolean') return v ? 'Evet' : 'Hayır';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return fmt(v);
  return String(v);
}

function HistoryItem(props: { h: HistoryEntry; villaName: (id: string) => string; agencyName: (id: string) => string; currency: Currency }) {
  const c = useColors();
  const { h } = props;
  const when = new Date(h.changed_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const entries = h.changes ? Object.entries(h.changes).filter(([k]) => FIELD_LABEL[k]) : [];
  return (
    <View style={{ flexDirection: 'row', marginBottom: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary, marginTop: 6, marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text2, fontSize: 12 }}>
          {when}
          {h.actor ? ` · ${h.actor.split('@')[0]}` : ''}
        </Text>
        {h.action === 'created' ? (
          <Text style={{ color: c.text, fontSize: 14 }}>Kayıt oluşturuldu</Text>
        ) : (
          entries.map(([k, ch]) => (
            <Text key={k} style={{ color: c.text, fontSize: 14 }}>
              {FIELD_LABEL[k]}: <Text style={{ color: c.text3 }}>{fmtValue(k, ch.old, props)}</Text> → {fmtValue(k, ch.new, props)}
            </Text>
          ))
        )}
      </View>
    </View>
  );
}

function OdemeDuzenle(props: {
  edit: { index: number | null; p: Payment } | null;
  resCurrency: Currency;
  onClose: () => void;
  onSave: (p: Payment) => void;
  onDelete: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState<Payment | null>(null);
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [dateOpen, setDateOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (props.edit) {
      setP(props.edit.p);
      setAmount(props.edit.p.amount_minor ? moneyInput(props.edit.p.amount_minor) : '');
      setRate(props.edit.p.rate != null ? String(props.edit.p.rate).replace('.', ',') : '');
      setErr(null);
    }
  }, [props.edit]);

  if (!props.edit || !p) return null;
  const foreign = p.currency !== props.resCurrency;

  function submit() {
    const a = parseMoney(amount);
    if (!a || a <= 0) return setErr('Tutarı yaz.');
    const r = foreign ? parseNumber(rate) : null;
    if (foreign && rate.trim() && (r == null || r <= 0)) return setErr('Kur okunamadı.');
    props.onSave({ ...p!, amount_minor: a, rate: foreign ? r : null });
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={props.onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.l, borderTopRightRadius: radius.l, maxHeight: '90%' }}>
          <ScrollView contentContainerStyle={{ padding: space.l, paddingBottom: insets.bottom + space.l }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.m }}>
              <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', flex: 1 }}>{props.edit.index == null ? 'Ödeme ekle' : 'Ödemeyi düzenle'}</Text>
              <Pressable onPress={props.onClose} hitSlop={10} accessibilityLabel="Kapat">
                <Ionicons name="close" size={26} color={c.text2} />
              </Pressable>
            </View>
            {err ? <Banner kind="error" text={err} /> : null}
            <Text style={{ color: c.text2, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Tür</Text>
            <ChipRow>
              {(Object.keys(PAYMENT_KIND_LABEL) as PaymentKind[]).map((k) => (
                <Chip key={k} label={PAYMENT_KIND_LABEL[k]} selected={p.kind === k} onPress={() => setP({ ...p, kind: k })} color={k === 'refund' ? c.danger : undefined} />
              ))}
            </ChipRow>
            <Field label="Tutar" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" suffix={SYMBOL[p.currency]} autoFocus={props.edit.index == null} />
            <ChipRow>
              {CURRENCIES.map((cur) => (
                <Chip key={cur} label={cur} selected={p.currency === cur} onPress={() => setP({ ...p, currency: cur })} />
              ))}
            </ChipRow>
            {foreign && !rate.trim() ? (
              <Button
                title={`TCMB kurunu kullan (${fmt(p.paid_on)})`}
                kind="ghost"
                small
                icon="swap-horizontal"
                onPress={async () => {
                  const r = await getRates(p.paid_on);
                  if (r) setRate(String(Math.round(crossRate(p.currency, props.resCurrency, r) * 10000) / 10000).replace('.', ','));
                  else setErr('TCMB kuru alınamadı; kuru elle yaz.');
                }}
              />
            ) : null}
            {foreign ? (
              <Field
                label={`Kur: 1 ${p.currency} = ? ${props.resCurrency}`}
                value={rate}
                onChangeText={setRate}
                keyboardType="decimal-pad"
                hint={`Kalan ödeme hesabı ${props.resCurrency} cinsinden yapılır. Kuru boş bırakırsan ödeme toplama katılmaz.`}
              />
            ) : null}
            <Text style={{ color: c.text2, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Ödeme türü</Text>
            <ChipRow>
              {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((k) => (
                <Chip key={k} label={METHOD_LABEL[k]} selected={p.method === k} onPress={() => setP({ ...p, method: k })} color={c.deep} />
              ))}
            </ChipRow>
            <PickerField label="Tarih" value={fmt(p.paid_on)} onPress={() => setDateOpen(true)} />
            <Button title="Tamam" onPress={submit} />
            {props.edit.index != null ? <Button title="Ödemeyi sil" kind="danger" onPress={props.onDelete} style={{ marginTop: 8 }} /> : null}
            <Muted style={{ marginTop: 10, textAlign: 'center' }}>Değişiklikler rezervasyonu kaydedince saklanır.</Muted>
          </ScrollView>
        </View>
      </View>
      <TakvimSecici visible={dateOpen} mode="single" title="Ödeme tarihi" value={p.paid_on} onCancel={() => setDateOpen(false)} onConfirm={(d) => { setP({ ...p, paid_on: d }); setDateOpen(false); }} />
    </Modal>
  );
}

function holdHours(holdUntil: string | null): number | null {
  if (!holdUntil) return null;
  const h = Math.round((Date.parse(holdUntil) - Date.now()) / 3600_000);
  return h === 24 || h === 23 ? 24 : h === 48 || h === 47 ? 48 : null;
}

function holdText(holdUntil: string | null, optionUntil: string | null): string {
  if (holdUntil) {
    const left = Date.parse(holdUntil) - Date.now();
    const leftTxt = left <= 0 ? 'süresi doldu' : left < 3600_000 ? `${Math.max(1, Math.round(left / 60000))} dk kaldı` : `${Math.round(left / 3600_000)} saat kaldı`;
    return `${fmt(localDateOf(holdUntil))} ${localTimeOf(holdUntil)} (${leftTxt})`;
  }
  return optionUntil ? fmt(optionUntil) : '—';
}
