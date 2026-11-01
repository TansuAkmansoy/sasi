import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { useColors, space } from '../theme';
import { Banner, Button, Field, Muted } from './ui';

export function Kurulum() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const phase = useStore((s) => s.phase);
  const config = useStore((s) => s.config);
  const configure = useStore((s) => s.configure);
  const login = useStore((s) => s.login);
  const startDemo = useStore((s) => s.startDemo);
  const resetConnection = useStore((s) => s.resetConnection);
  const [url, setUrl] = useState(config?.url || 'https://olfqigbnsxsrkzlejkzm.supabase.co');
  const [key, setKey] = useState(config?.key ?? '');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setErr(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: insets.top + space.xl * 2 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: space.xl }}>
          <Image source={require('../../assets/logo-full.png')} style={{ width: 150, height: 191 }} resizeMode="contain" accessibilityLabel="Sasi" />
          <Muted style={{ textAlign: 'center', marginTop: 4 }}>Villa rezervasyonları, tek takvimde.</Muted>
        </View>

        {err ? <Banner kind="error" text={err} /> : null}

        {phase === 'setup' ? (
          <>
            <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', marginBottom: space.s }}>Bağlantı</Text>
            <Muted style={{ marginBottom: space.l }}>
              Supabase panelinde Project Settings → API (ya da "Connect") bölümündeki proje adresini ve "anon / publishable" anahtarını yapıştır. Bunu yalnızca bir kez yaparsın.
            </Muted>
            <Field label="Proje adresi" placeholder="https://xxxx.supabase.co" autoCapitalize="none" autoCorrect={false} keyboardType="url" value={url} onChangeText={setUrl} />
            <Field label="Anahtar (anon / publishable)" placeholder="sb_publishable_… ya da eyJ…" autoCapitalize="none" autoCorrect={false} value={key} onChangeText={setKey} multiline style={{ minHeight: 60 }} />
            <Button title="Devam" loading={busy} onPress={() => run(() => configure(url, key))} />
            <View style={{ height: space.xl }} />
            <Muted style={{ textAlign: 'center', marginBottom: space.s }}>Kurulumu yapmadan önce uygulamayı denemek ister misin?</Muted>
            <Button title="Örnek verilerle dene" kind="secondary" icon="play-outline" onPress={() => run(startDemo)} />
          </>
        ) : (
          <>
            <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', marginBottom: space.l }}>Giriş yap</Text>
            <Field label="E-posta" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" value={email} onChangeText={setEmail} />
            <Field label="Şifre" secureTextEntry textContentType="password" value={pass} onChangeText={setPass} onSubmitEditing={() => run(() => login(email, pass))} />
            <Button title="Giriş yap" loading={busy} onPress={() => run(() => login(email, pass))} />
            <Button title="Bağlantı bilgilerini değiştir" kind="ghost" onPress={() => run(resetConnection)} style={{ marginTop: space.m }} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
