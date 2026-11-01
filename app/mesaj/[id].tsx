import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Share, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '../../src/store';
import { useColors, radius } from '../../src/theme';
import { Banner, Button, Muted, Screen, Segmented } from '../../src/components/ui';
import { buildMessage, MessageKind } from '../../src/lib/sablon';

export default function MesajEkrani() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useStore((s) => s.data);
  const r = data?.reservations.find((x) => x.id === id);
  const [kind, setKind] = useState<MessageKind>(r?.status === 'option' ? 'hold' : 'confirm');
  const [text, setText] = useState('');
  const [info, setInfo] = useState<string | null>(null);

  const generated = useMemo(() => {
    if (!r || !data) return '';
    return buildMessage(kind, r, data.villas.find((v) => v.id === r.villa_id), data.agencies.find((a) => a.id === r.agency_id), data.settings);
  }, [kind, r, data]);

  useEffect(() => setText(generated), [generated]);

  if (!r || !data) {
    return (
      <Screen title="Mesaj" onBack={() => router.back()}>
        <Muted>Rezervasyon bulunamadı.</Muted>
      </Screen>
    );
  }

  const phone = (r.guest_phone ?? '').replace(/[^\d]/g, '').replace(/^0/, '90');

  async function whatsapp() {
    const enc = encodeURIComponent(text);
    const url = phone ? `https://wa.me/${phone}?text=${enc}` : `whatsapp://send?text=${enc}`;
    try {
      await Linking.openURL(url);
    } catch {
      await Share.share({ message: text });
    }
  }

  return (
    <Screen
      title="Mesaj hazırla"
      subtitle={`${r.guest_name || 'Misafir'} · WhatsApp`}
      onBack={() => router.back()}
      footer={<Button title={phone ? 'WhatsApp\'ta gönder' : 'WhatsApp\'ta paylaş'} icon="logo-whatsapp" onPress={whatsapp} />}
    >
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: 'hold', label: 'Hold bilgisi' },
          { value: 'confirm', label: 'Onay + şartlar' },
          { value: 'terms', label: 'Sadece şartlar' },
        ]}
      />
      {info ? <Banner text={info} /> : null}
      {!phone ? <Banner kind="warn" text="Misafirin telefonu kayıtlı değil. WhatsApp açılınca kişiyi (ya da acenteyi) kendin seçersin." /> : null}
      <Muted style={{ marginBottom: 8 }}>Metni göndermeden önce burada düzeltebilirsin. Kalıcı değişiklik için: Ayarlar → Ücretler ve metinler.</Muted>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        textAlignVertical="top"
        style={{ minHeight: 360, color: c.text, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: radius.m, padding: 12, fontSize: 15, lineHeight: 21 }}
      />
      <Button
        title="Kopyala"
        icon="copy-outline"
        kind="secondary"
        style={{ marginTop: 12 }}
        onPress={async () => {
          await Clipboard.setStringAsync(text);
          setInfo('Metin kopyalandı.');
        }}
      />
      <Button title="Başka uygulamayla paylaş" icon="share-outline" kind="ghost" onPress={() => Share.share({ message: text })} />
      {text !== generated ? <Button title="Değişiklikleri geri al" kind="ghost" small onPress={() => setText(generated)} /> : null}
    </Screen>
  );
}
