import React, { useState } from 'react';
import { onay } from '../../src/lib/onay';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useStore } from '../../src/store';
import { useColors } from '../../src/theme';
import { Button, Card, Field, IconName, Screen, SectionTitle, Muted } from '../../src/components/ui';

function Item(props: { icon: IconName; title: string; text?: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Card onPress={props.onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
      <Ionicons name={props.icon} size={22} color={c.primary} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{props.title}</Text>
        {props.text ? <Text style={{ color: c.text2, fontSize: 13, marginTop: 2 }}>{props.text}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={c.text3} />
    </Card>
  );
}

export default function AyarlarEkrani() {
  const c = useColors();
  const config = useStore((s) => s.config);
  const data = useStore((s) => s.data);
  const signOut = useStore((s) => s.signOut);
  const resetConnection = useStore((s) => s.resetConnection);
  const setShareBase = useStore((s) => s.setShareBase);
  const [base, setBase] = useState(config?.shareBase ?? '');
  const [showAdv, setShowAdv] = useState(false);

  return (
    <Screen title="Ayarlar">
      <SectionTitle>Fiyat ve kayıt</SectionTitle>
      <Item icon="pricetags-outline" title="Villalar ve aylık fiyatlar" text="Her ay için haftalık ücret" onPress={() => router.push('/fiyatlar')} />
      <Item icon="document-text-outline" title="Ücretler ve metinler" text="Evcil hayvan ve kısa konaklama ücreti, kiralama şartları, WhatsApp mesajları" onPress={() => router.push('/metinler')} />
      <Item icon="calculator-outline" title="Ücret hesapla" text="Teklif ve ödeme planı" onPress={() => router.push('/hesapla')} />
      <Item icon="briefcase-outline" title="Acenteler" text={`${data?.agencies.length ?? 0} acente · varsayılan komisyon oranları`} onPress={() => router.push('/acenteler')} />

      <SectionTitle>Takvim</SectionTitle>
      <Item icon="logo-google" title="Google Takvim aktarımı" text="Rezervasyonları Google Takvim'e otomatik işle" onPress={() => router.push('/takvim-aktarim')} />

      <SectionTitle>Paylaşım</SectionTitle>
      <Item
        icon="share-social-outline"
        title="Paylaşım bağlantıları"
        text="Müşterilere müsaitlik bağlantısı, ortak yöneticiye iPhone uygulaması"
        onPress={() => router.push('/paylasim')}
      />

      <SectionTitle>Hesap</SectionTitle>
      <Card>
        <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }}>{config?.mode === 'demo' ? 'Örnek veri modu' : 'Supabase'}</Text>
        <Muted style={{ marginTop: 2 }}>{config?.mode === 'demo' ? 'Veriler yalnızca bu telefonda, deneme amaçlı.' : config?.url}</Muted>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {config?.mode === 'demo' ? (
            <Button title="Gerçek kuruluma geç" small style={{ flex: 1 }} onPress={resetConnection} />
          ) : (
            <Button
              title="Çıkış yap"
              kind="secondary"
              small
              style={{ flex: 1 }}
              onPress={() =>
                onay('Çıkış yap', 'Tekrar girmek için e-posta ve şifren gerekecek.', [
                  { text: 'Vazgeç', style: 'cancel' },
                  { text: 'Çıkış yap', style: 'destructive', onPress: signOut },
                ])
              }
            />
          )}
        </View>
      </Card>

      <Pressable onPress={() => setShowAdv(!showAdv)} style={{ paddingVertical: 12 }}>
        <Text style={{ color: c.text2, fontWeight: '600' }}>{showAdv ? '▾' : '▸'} Gelişmiş</Text>
      </Pressable>
      {showAdv ? (
        <Card>
          <Field label="Paylaşım sayfası adresi" value={base} onChangeText={setBase} autoCapitalize="none" autoCorrect={false} hint="Paylaşım bağlantıları bu adresle oluşturulur." />
          <Button title="Kaydet" small kind="secondary" onPress={() => setShareBase(base)} />
          {config?.mode !== 'demo' ? (
            <Button
              title="Bağlantı bilgilerini sıfırla"
              kind="danger"
              small
              style={{ marginTop: 12 }}
              onPress={() =>
                onay('Bağlantıyı sıfırla', 'Supabase adresi ve anahtarı bu telefondan silinir. Kayıtların sunucuda kalır.', [
                  { text: 'Vazgeç', style: 'cancel' },
                  { text: 'Sıfırla', style: 'destructive', onPress: resetConnection },
                ])
              }
            />
          ) : null}
        </Card>
      ) : null}
      <Text style={{ color: c.text3, textAlign: 'center', marginTop: 24, fontSize: 12 }}>Sasi {Constants.expoConfig?.version ?? ''}</Text>
    </Screen>
  );
}
