import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import { useInbox } from '../context/InboxContext';
import api from '../api/api';
import { colors, borderRadius, fontSize, spacing, shadows } from '../theme';
import type { TodoItem, ShoppingList, AppEvent } from '../types';

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  value: string | number;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.summaryCard} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      {subtitle ? <Text style={styles.summarySubtitle}>{subtitle}</Text> : null}
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const nav = useNavigation<any>();
  const { user, hasPermission } = useAuth();
  const { t } = useTranslation();
  const { unreadCount } = useInbox();
  const [refreshing, setRefreshing] = useState(false);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);

  const load = async () => {
    const promises: Promise<void>[] = [];
    if (hasPermission('todos.view')) {
      promises.push(
        api.getTodos().then((d) => setTodos(d ?? [])).catch(() => {}),
      );
    }
    if (hasPermission('shopping.view')) {
      promises.push(
        api.getLists().then((d) => setLists(d ?? [])).catch(() => {}),
      );
    }
    if (hasPermission('events.view')) {
      promises.push(
        api.getEvents().then((d) => setEvents(d ?? [])).catch(() => {}),
      );
    }
    await Promise.all(promises);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const pendingTodos = todos.filter((t) => !t.done).length;
  const activeEvents = events.length;
  const activeLists = lists.filter((l) => l.status !== 'archived').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.greeting}>
        {t('dashboard.hello', 'Hello')}, {user?.firstName || user?.email} 👋
      </Text>

      <View style={styles.grid}>
        {hasPermission('todos.view') && (
          <SummaryCard
            icon="✅"
            title={t('nav.todos', 'Todos')}
            value={pendingTodos}
            subtitle={t('dashboard.pending', 'pending')}
            onPress={() => nav.navigate('Todos')}
          />
        )}
        {hasPermission('shopping.view') && (
          <SummaryCard
            icon="🛒"
            title={t('nav.shopping', 'Shopping')}
            value={activeLists}
            subtitle={t('dashboard.activeLists', 'active lists')}
            onPress={() => nav.navigate('Shopping')}
          />
        )}
        {hasPermission('events.view') && (
          <SummaryCard
            icon="📅"
            title={t('nav.events', 'Events')}
            value={activeEvents}
            subtitle={t('dashboard.events', 'events')}
            onPress={() => nav.navigate('Events')}
          />
        )}
        <SummaryCard
          icon="🔔"
          title={t('nav.inbox', 'Inbox')}
          value={unreadCount}
          subtitle={t('dashboard.unread', 'unread')}
          onPress={() => nav.navigate('Inbox')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xxl,
    marginTop: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  summaryIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    color: colors.text,
  },
  summarySubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
