import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../src/store';
import { useColors, radius } from '../src/theme';
import { Banner, Button, Card, Chip, ChipRow, Field, Muted, Screen, SectionTitle } from '../src/components/ui';
import { CURRENCIES, Currency, TextSettings } from '../src/lib/types';
import { moneyInput, parseMoney, SYMBOL } from '../src/lib/para';
import { DEFAULT_TEXTS, VARIABLES } from '../src/lib/sablon';

const TEXT_FIELDS: { key: keyof TextSettings; title: string; hint: string }[] = [
  { key: 'terms', title: 'Kiralama şartları', hint: 'İptal, ön ödeme, ödeme, giriş-çıkış ve evcil hayvan prosedürü. Acenteye ve misafire gönderilir.' },
  { key: 'usage', title: 'Villa kullanım bilgileri', hint: 'Üç villa için ortak kurallar. Onay mesajına eklenir.' },
  { key: 'tpl_hold', title: 'Hold mesajı', hint: 'Talep alınıp tarihler hold\'a alınınca gönderilir.' },
  { key: 'tpl_confirm', title: 'Onay mesajı', hint: 'Rezervasyon onaylanıp tarihler kapatılınca gönderilir.' },
];

export default function MetinlerEkrani() {
  const c = useColors();
  const settings = useStore((s) => s.data?.settings);
  const saveSetting = useStore((s) => s.saveSetting);
  const [cur, setCur] = useState<Currency>('EUR');
  const [pet, setPet] = useState('');
  const [short, setShort] = useState('');
  const [shortN, setShortN] = useState('5');
  const [inT, setInT] = useState('16:00');
  const [outT, setOutT] = useState('10:00');
  const [cancelM, setCancelM] = useState('1');
  const [texts, setTexts] = useState<TextSettings>(DEFAULT_TEXTS);
  const [showVars, setShowVars] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!settings) return;
    const f = settings.fees;
    setCur(f.currency);
    setPet(moneyInput(f.pet_fee_minor));
    setShort(moneyInput(f.short_stay_fee_minor));
    setShortN(String(f.short_stay_nights));
    setInT(f.check_in_time);
    setOutT(f.check_out_time);
    setCancelM(String(f.cancel_months));
    setTexts(settings.texts);
  }, [settings]);

  async function save() {
    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!hhmm.test(inT) || !hhmm.test(outT)) return setMsg({ kind: 'error', text: 'Saatleri 16:00 biçiminde yaz.' });
    const n = parseInt(shortN, 10);
    const cm = parseInt(cancelM, 10);
    if (!(n >= 1 && n <= 30) || !(cm >= 0 && cm <= 12)) return setMsg({ kind: 'error', text: 'Gece ve ay sayılarını kontrol et.' });
    setSaving(true);
    setMsg(null);
    try {
      await saveSetting('fees', {
        currency: cur,
        pet_fee_minor: parseMoney(pet),
        short_stay_fee_minor: parseMoney(short),
        short_stay_nights: n,
        check_in_time: inT,
        check_out_time: outT,
        cancel_months: cm,
      });
      await saveSetting('texts', texts);
      setMsg({ kind: 'info', text: 'Kaydedildi.' });
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Ücretler ve metinler" onBack={() => router.back()} footer={<Button title="Kaydet" icon="checkmark" loading={saving} onPress={save} />}>
      {msg ? <Banner kind={msg.kind} text={msg.text} /> : null}

      <SectionTitle>Bu sezonun ücretleri</SectionTitle>
      <Card>
        <Muted style={{ marginBottom: 10 }}>Yeni rezervasyonda otomatik önerilir; her rezervasyonda değiştirilebilir. Sezon değişince buradan güncelle.</Muted>
        <ChipRow>
          {CURRENCIES.map((x) => (
            <Chip key={x} label={`${SYMBOL[x]} ${x}`} selected={cur === x} onPress={() => setCur(x)} />
          ))}
        </ChipRow>
        <Field label="Evcil hayvan ücreti (tek sefer)" value={pet} onChangeText={setPet} keyboardType="decimal-pad" suffix={SYMBOL[cur]} placeholder="Boş: her seferinde gir" />
        <Field label="Kısa konaklama ücreti" value={short} onChangeText={setShort} keyboardType="decimal-pad" suffix={SYMBOL[cur]} placeholder="Boş: her seferinde gir" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Field containerStyle={{ flex: 1 }} label="Kısa konaklama: kaç geceden az" value={shortN} onChangeText={setShortN} keyboardType="number-pad" suffix="gece" />
          <Field containerStyle={{ flex: 1 }} label="İptal: girişten kaç ay önce" value={cancelM} onChangeText={setCancelM} keyboardType="number-pad" suffix="ay" />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Field containerStyle={{ flex: 1 }} label="Giriş saati" value={inT} onChangeText={setInT} keyboardType="numbers-and-punctuation" />
          <Field containerStyle={{ flex: 1 }} label="Çıkış saati" value={outT} onChangeText={setOutT} keyboardType="numbers-and-punctuation" />
        </View>
      </Card>

      <SectionTitle right={<Button title={showVars ? 'Gizle' : 'Alanlar'} kind="ghost" small onPress={() => setShowVars(!showVars)} />}>Metinler</SectionTitle>
      <Muted style={{ marginBottom: 10 }}>Süslü parantezli alanlar ({'{misafir}'}, {'{toplam}'} gibi) gönderirken rezervasyon bilgileriyle dolar. Örnek metinleri kendi kurallarına göre düzenle.</Muted>
      {showVars ? (
        <Card>
          {VARIABLES.map((v) => (
            <View key={v.key} style={{ flexDirection: 'row', paddingVertical: 3 }}>
              <Text style={{ color: c.primary, fontWeight: '700', width: 190, fontSize: 13 }}>{`{${v.key}}`}</Text>
              <Text style={{ color: c.text2, flex: 1, fontSize: 13 }}>{v.label}</Text>
            </View>
          ))}
        </Card>
      ) : null}
      {TEXT_FIELDS.map((f) => (
        <Card key={f.key}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>{f.title}</Text>
            {texts[f.key] !== DEFAULT_TEXTS[f.key] ? (
              <Pressable onPress={() => setTexts((t) => ({ ...t, [f.key]: DEFAULT_TEXTS[f.key] }))} hitSlop={8}>
                <Text style={{ color: c.text3, fontSize: 13 }}>Örneğe dön</Text>
              </Pressable>
            ) : null}
          </View>
          <Muted style={{ fontSize: 13, marginVertical: 6 }}>{f.hint}</Muted>
          <TextInput
            value={texts[f.key]}
            onChangeText={(v) => setTexts((t) => ({ ...t, [f.key]: v }))}
            multiline
            textAlignVertical="top"
            style={{ minHeight: 160, color: c.text, backgroundColor: c.bg, borderColor: c.border, borderWidth: 1, borderRadius: radius.s, padding: 10, fontSize: 14, lineHeight: 20 }}
          />
        </Card>
      ))}
    </Screen>
  );
}
