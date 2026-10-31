import React, { useState } from 'react';
import { Alert, Linking, Share, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '../src/store';
import { useColors } from '../src/theme';
import { Badge, Banner, Button, Card, Field, Muted, Screen, SectionTitle, Segmented } from '../src/components/ui';
import type { LinkKind, ShareLink } from '../src/lib/types';

export default function PaylasimEkrani() {
  const c = useColors();
  const data = useStore((s) => s.data);
  const createLink = useStore((s) => s.createLink);
  const revokeLink = useStore((s) => s.revokeLink);
  const linkUrl = useStore((s) => s.linkUrl);
  const mode = useStore((s) => s.config?.mode);
  const [kind, setKind] = useState<LinkKind>('availability');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  const links = (data?.links ?? []).filter((l) => !l.revoked);

  async function create() {
    const l = label.trim() || (kind === 'admin' ? 'Ortak yönetici' : 'Müşteriler');
    setBusy(true);
    setMsg(null);
    try {
      const id = await createLink(l, kind);
      setLabel('');
      const url = useStore.getState().linkUrl(id);
      if (url) await Share.share({ message: kind === 'admin' ? url : `Villa müsaitlik takvimi / Availability: ${url}` });
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function share(l: ShareLink) {
    const url = linkUrl(l.id);
    if (!url) return;
    Share.share({ message: l.kind === 'admin' ? url : `Villa müsaitlik takvimi / Availability: ${url}` });
  }

  async function copy(l: ShareLink) {
    const url = linkUrl(l.id);
    if (!url) return;
    await Clipboard.setStringAsync(url);
    setMsg({ kind: 'info', text: `"${l.label}" bağlantısı kopyalandı.` });
  }

  function revoke(l: ShareLink) {
    Alert.alert('Bağlantıyı iptal et', `"${l.label}" bağlantısı hemen çalışmaz hale gelir. Gerekirse yenisini oluşturursun.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'İptal et', style: 'destructive', onPress: () => revokeLink(l.id).catch((e) => setMsg({ kind: 'error', text: (e as Error).message })) },
    ]);
  }

  return (
    <Screen title="Paylaşım bağlantıları" onBack={() => router.back()}>
      {mode === 'demo' ? <Banner kind="warn" text="Örnek veri modundasın: bağlantılar örnek sayfayı açar, gerçek kayıtları göstermez." /> : null}
      {msg ? <Banner kind={msg.kind} text={msg.text} /> : null}
      <Card>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Yeni bağlantı</Text>
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'availability', label: 'Müsaitlik' },
            { value: 'admin', label: 'Yönetici' },
          ]}
        />
        <Muted style={{ marginBottom: 12 }}>
          {kind === 'availability'
            ? 'Müşteriler ve acenteler için. Yalnızca villaların dolu/boş günlerini gösterir; isim, fiyat ve not görünmez. Türkçe ve İngilizce.'
            : 'Ortak yönetici için (iPhone dahil, uygulama gerekmez). Tüm kayıtları, ödemeleri ve arşivi salt okunur gösterir. Yalnızca güvendiğin kişiyle paylaş.'}
        </Muted>
        <Field label="Etiket" placeholder={kind === 'admin' ? 'Örn. Ortak yönetici' : 'Örn. Müşteriler, Kalkan Holidays'} value={label} onChangeText={setLabel} />
        <Button title="Oluştur ve paylaş" icon="share-social-outline" loading={busy} onPress={create} />
      </Card>

      <SectionTitle>Etkin bağlantılar ({links.length})</SectionTitle>
      {links.length === 0 ? <Muted>Henüz bağlantı yok.</Muted> : null}
      {links.map((l) => {
        const url = linkUrl(l.id);
        return (
          <Card key={l.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', flex: 1 }}>{l.label}</Text>
              <Badge label={l.kind === 'admin' ? 'Yönetici · tüm kayıtlar' : 'Müsaitlik'} bg={l.kind === 'admin' ? c.terraSoft : c.primarySoft} fg={l.kind === 'admin' ? c.terra : c.deep} />
            </View>
            <Muted style={{ fontSize: 12, marginTop: 2 }}>Oluşturulma: {new Date(l.created_at).toLocaleDateString('tr-TR')}</Muted>
            {url ? (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                <Button title="Paylaş" icon="share-outline" small style={{ flex: 1 }} onPress={() => share(l)} />
                <Button title="Kopyala" icon="copy-outline" small kind="secondary" style={{ flex: 1 }} onPress={() => copy(l)} />
                <Button title="Aç" icon="open-outline" small kind="secondary" onPress={() => Linking.openURL(url)} />
              </View>
            ) : (
              <Muted style={{ marginTop: 8 }}>Bu bağlantının adresi bu telefonda kayıtlı değil. Gerekirse iptal edip yenisini oluştur.</Muted>
            )}
            <Button title="İptal et" kind="ghost" small onPress={() => revoke(l)} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
          </Card>
        );
      })}
    </Screen>
  );
}
