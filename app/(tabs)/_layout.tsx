import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../src/theme';
import { useStore } from '../../src/store';
import { today } from '../../src/lib/tarih';
import { awaitingCompletion, missingOf, optionDueSoon } from '../../src/lib/durum';

export default function TabsLayout() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const data = useStore((s) => s.data);
  const t = today();
  const todo = (data?.reservations ?? []).filter((r) => optionDueSoon(r, t) || awaitingCompletion(r, t) || missingOf(r, t).length > 0).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.text3,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, height: 60 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Takvim', tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color as string} size={size} /> }} />
      <Tabs.Screen
        name="bugun"
        options={{
          title: 'Bugün',
          tabBarBadge: todo > 0 ? todo : undefined,
          tabBarBadgeStyle: { backgroundColor: c.terra, color: '#fff' as string },
          tabBarIcon: ({ color, size }) => <Ionicons name="sunny" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen name="rezervasyonlar" options={{ title: 'Kayıtlar', tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color as string} size={size} /> }} />
      <Tabs.Screen name="arsiv" options={{ title: 'Arşiv', tabBarIcon: ({ color, size }) => <Ionicons name="archive" color={color as string} size={size} /> }} />
      <Tabs.Screen name="ayarlar" options={{ title: 'Ayarlar', tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color as string} size={size} /> }} />
    </Tabs>
  );
}
