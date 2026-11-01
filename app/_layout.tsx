import React, { useEffect } from 'react';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '../src/store';
import { useColors } from '../src/theme';
import { Kurulum } from '../src/components/Kurulum';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const c = useColors();
  const scheme = useColorScheme();
  const phase = useStore((s) => s.phase);
  const boot = useStore((s) => s.boot);

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    if (phase !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [phase]);

  // Hold bildirimine dokununca ilgili rezervasyonu aç
  useEffect(() => {
    if (phase !== 'ready') return;
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const id = resp.notification.request.content.data?.reservationId;
      if (typeof id === 'string') router.push({ pathname: '/rezervasyon/[id]', params: { id } });
    });
    return () => sub.remove();
  }, [phase]);

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {phase === 'loading' ? (
        <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : phase === 'setup' || phase === 'login' ? (
        <Kurulum />
      ) : (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="rezervasyon/[id]" />
          <Stack.Screen name="musaitlik" />
          <Stack.Screen name="fiyatlar" />
          <Stack.Screen name="acenteler" />
          <Stack.Screen name="paylasim" />
          <Stack.Screen name="mesaj/[id]" />
          <Stack.Screen name="hesapla" />
          <Stack.Screen name="metinler" />
        </Stack>
      )}
    </SafeAreaProvider>
  );
}
