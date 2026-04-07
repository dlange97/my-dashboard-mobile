import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useInbox } from '../context/InboxContext';
import { useTranslation } from '../context/TranslationContext';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import type { MoreStackParamList } from './types';

import CalendarScreen from '../screens/CalendarScreen';
import MapScreen from '../screens/MapScreen';
import InboxScreen from '../screens/InboxScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<MoreStackParamList>();

/* ─── More Hub Menu ─── */
function MoreMenuScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { hasPermission } = useAuth();
  const { unreadCount } = useInbox();
  const { t } = useTranslation();

  const items: Array<{ key: keyof MoreStackParamList; icon: string; label: string; permission?: string; badge?: number }> = [
    { key: 'Calendar', icon: '📅', label: t('nav.calendar', 'Calendar'), permission: 'events.view' },
    { key: 'Map', icon: '🗺️', label: t('nav.map', 'Map'), permission: 'map.view' },
    { key: 'Inbox', icon: '📬', label: t('nav.inbox', 'Inbox'), badge: unreadCount },
    { key: 'Users', icon: '👥', label: t('nav.users', 'Users'), permission: 'users.view' },
    { key: 'Settings', icon: '⚙️', label: t('nav.settings', 'Settings'), permission: 'settings.view' },
  ];

  const visible = items.filter((i) => !i.permission || hasPermission(i.permission));

  return (
    <ScrollView style={menuStyles.container} contentContainerStyle={menuStyles.content}>
      <Text style={menuStyles.heading}>{t('nav.more', 'More')}</Text>
      {visible.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={menuStyles.row}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(item.key as any)}
        >
          <Text style={menuStyles.icon}>{item.icon}</Text>
          <Text style={menuStyles.label}>{item.label}</Text>
          {item.badge != null && item.badge > 0 && (
            <View style={menuStyles.badge}>
              <Text style={menuStyles.badgeText}>{item.badge}</Text>
            </View>
          )}
          <Text style={menuStyles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const menuStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  heading: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm,
  },
  icon: { fontSize: 24, marginRight: spacing.md },
  label: { flex: 1, fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  badge: {
    backgroundColor: colors.danger, borderRadius: borderRadius.full,
    minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 6, marginRight: spacing.sm,
  },
  badgeText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },
  chevron: { fontSize: fontSize.xl, color: colors.textMuted },
});

/* ─── Stack Navigator ─── */
export default function MoreStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendar' }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Map' }} />
      <Stack.Screen name="Inbox" component={InboxScreen} options={{ title: 'Inbox' }} />
      <Stack.Screen name="Users" component={UserManagementScreen} options={{ title: 'Users' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}
