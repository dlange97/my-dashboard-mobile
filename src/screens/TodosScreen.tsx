import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import api from '../api/api';
import { Button, Pagination, ShareUserModal } from '../components/ui';
import { colors, borderRadius, fontSize, spacing, shadows } from '../theme';
import type { TodoItem } from '../types';

const PAGE_SIZE = 10;

function dueDateTime(item: TodoItem): number {
  if (!item?.dueDate) return Number.POSITIVE_INFINITY;
  const ts = Date.parse(item.dueDate);
  return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
}

export default function TodosScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // New todo form
  const [showForm, setShowForm] = useState(false);
  const [newText, setNewText] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  // Share
  const [shareTarget, setShareTarget] = useState<TodoItem | null>(null);

  const load = async () => {
    try {
      const data = await api.getTodos();
      setTodos(data ?? []);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const addTodo = async () => {
    if (!newText.trim()) return;
    try {
      const created = await api.createTodo({ text: newText.trim(), dueDate: newDueDate || null });
      setTodos((prev) => [...prev, created]);
      setNewText('');
      setNewDueDate('');
      setShowForm(false);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create todo');
    }
  };

  const toggleTodo = async (item: TodoItem) => {
    try {
      const updated = await api.toggleTodo(item.id);
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to toggle');
    }
  };

  const deleteTodo = (item: TodoItem) => {
    Alert.alert(
      t('common.confirmDelete', 'Delete'),
      t('todo.confirmDelete', 'Delete this task?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTodo(item.id);
              setTodos((prev) => prev.filter((t) => t.id !== item.id));
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
            }
          },
        },
      ],
    );
  };

  const handleShare = async (selectedUser: { id: string }) => {
    if (!shareTarget) return;
    try {
      const updated = await api.shareTodo(shareTarget.id, selectedUser.id);
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setShareTarget(null);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to share');
    }
  };

  const sorted = useMemo(
    () => [...todos].sort((a, b) => dueDateTime(a) - dueDateTime(b)),
    [todos],
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const renderItem = ({ item }: { item: TodoItem }) => (
    <View style={styles.todoRow}>
      <TouchableOpacity style={styles.checkbox} onPress={() => toggleTodo(item)}>
        <Text style={styles.checkboxText}>{item.done ? '☑' : '☐'}</Text>
      </TouchableOpacity>
      <View style={styles.todoInfo}>
        <Text style={[styles.todoText, item.done && styles.todoDone]}>
          {item.text}
        </Text>
        {item.dueDate && (
          <Text style={styles.todoDue}>{item.dueDate.slice(0, 10)}</Text>
        )}
      </View>
      <View style={styles.todoActions}>
        {item.ownerId === user?.id && (
          <TouchableOpacity onPress={() => setShareTarget(item)}>
            <Text style={styles.actionIcon}>👥</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => deleteTodo(item)}>
          <Text style={styles.actionIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('todo.title', 'To-Do')}</Text>
        <TouchableOpacity onPress={() => setShowForm((s) => !s)}>
          <Text style={styles.addBtn}>+</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t('todo.placeholder', 'What needs to be done?')}
            placeholderTextColor={colors.textMuted}
            value={newText}
            onChangeText={setNewText}
            autoFocus
          />
          <TextInput
            style={styles.input}
            placeholder={t('todo.dueDatePlaceholder', 'Due date (YYYY-MM-DD)')}
            placeholderTextColor={colors.textMuted}
            value={newDueDate}
            onChangeText={setNewDueDate}
          />
          <View style={styles.formActions}>
            <Button title={t('common.cancel', 'Cancel')} variant="secondary" size="sm" onPress={() => setShowForm(false)} />
            <Button title={t('todo.add', 'Add')} size="sm" onPress={addTodo} />
          </View>
        </View>
      )}

      {loading ? (
        <Text style={styles.statusText}>{t('common.loading', 'Loading…')}</Text>
      ) : error ? (
        <Text style={[styles.statusText, { color: colors.danger }]}>{error}</Text>
      ) : (
        <FlatList
          data={paged}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <Text style={styles.statusText}>{t('todo.empty', 'No tasks')}</Text>
          }
          ListFooterComponent={<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        />
      )}

      <ShareUserModal
        visible={!!shareTarget}
        title={t('todo.shareTitle', 'Share task')}
        currentUserId={user?.id}
        alreadySharedUserIds={shareTarget?.sharedWithUserIds ?? []}
        onClose={() => setShareTarget(null)}
        onConfirm={handleShare}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  addBtn: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: '700',
  },
  form: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  statusText: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingVertical: spacing.xxl,
    fontSize: fontSize.md,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  checkbox: {
    marginRight: spacing.md,
  },
  checkboxText: {
    fontSize: 22,
  },
  todoInfo: {
    flex: 1,
  },
  todoText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  todoDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  todoDue: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  todoActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionIcon: {
    fontSize: 18,
  },
});
