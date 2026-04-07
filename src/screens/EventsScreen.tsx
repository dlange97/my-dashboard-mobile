import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import api from '../api/api';
import { Button, Pagination, ShareUserModal } from '../components/ui';
import { colors, borderRadius, fontSize, spacing, shadows } from '../theme';
import type { AppEvent } from '../types';

// ── Event Form Modal ────────────────────────────────────────────────────

function EventFormModal({
  visible,
  initial,
  onSave,
  onCancel,
}: {
  visible: boolean;
  initial?: AppEvent | null;
  onSave: (data: Partial<AppEvent>) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (initial) {
      setTitle(initial.title ?? '');
      setDescription(initial.description ?? '');
      setStartDate(initial.startAt?.slice(0, 10) ?? '');
      setStartTime(initial.startAt?.slice(11, 16) ?? '');
      setEndDate(initial.endAt?.slice(0, 10) ?? '');
      setEndTime(initial.endAt?.slice(11, 16) ?? '');
    } else {
      setTitle('');
      setDescription('');
      setStartDate('');
      setStartTime('');
      setEndDate('');
      setEndTime('');
    }
  }, [initial, visible]);

  const handleSave = () => {
    if (!title.trim() || !startDate) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      startAt: startDate + (startTime ? `T${startTime}:00` : 'T00:00:00'),
      endAt: endDate ? endDate + (endTime ? `T${endTime}:00` : 'T23:59:00') : null,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity style={formStyles.overlay} activeOpacity={1} onPress={onCancel}>
        <ScrollView
          contentContainerStyle={formStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={formStyles.card} onStartShouldSetResponder={() => true}>
            <Text style={formStyles.heading}>
              {initial ? t('events.form.editTitle', 'Edit Event') : t('events.form.createTitle', 'New Event')}
            </Text>

            <Text style={formStyles.label}>{t('events.form.titleLabel', 'Title *')}</Text>
            <TextInput
              style={formStyles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('events.form.titlePlaceholder', 'Event title')}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <Text style={formStyles.label}>{t('events.form.descriptionLabel', 'Description')}</Text>
            <TextInput
              style={[formStyles.input, { minHeight: 60 }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('events.form.descriptionPlaceholder', 'Optional details…')}
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <View style={formStyles.row}>
              <View style={formStyles.halfField}>
                <Text style={formStyles.label}>{t('events.form.startDateLabel', 'Start Date *')}</Text>
                <TextInput
                  style={formStyles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={formStyles.halfField}>
                <Text style={formStyles.label}>{t('events.form.startTimeLabel', 'Start Time')}</Text>
                <TextInput
                  style={formStyles.input}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={formStyles.row}>
              <View style={formStyles.halfField}>
                <Text style={formStyles.label}>{t('events.form.endDateLabel', 'End Date')}</Text>
                <TextInput
                  style={formStyles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={formStyles.halfField}>
                <Text style={formStyles.label}>{t('events.form.endTimeLabel', 'End Time')}</Text>
                <TextInput
                  style={formStyles.input}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={formStyles.actions}>
              <Button title={t('common.cancel', 'Cancel')} variant="secondary" onPress={onCancel} />
              <Button
                title={initial ? t('events.form.saveChanges', 'Save Changes') : t('events.add', 'Add Event')}
                onPress={handleSave}
              />
            </View>
          </View>
        </ScrollView>
      </TouchableOpacity>
    </Modal>
  );
}

const formStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xxl,
    ...shadows.lg,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
});

// ── Events List Screen ──────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function EventsScreen() {
  const { user, hasPermission } = useAuth();
  const { t } = useTranslation();
  const canManage = hasPermission('events.manage');
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  // Form
  const [formVisible, setFormVisible] = useState(false);
  const [editEvent, setEditEvent] = useState<AppEvent | null>(null);

  // Share
  const [shareTarget, setShareTarget] = useState<AppEvent | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getEvents();
      setEvents(data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleSave = async (data: Partial<AppEvent>) => {
    try {
      if (editEvent) {
        const updated = await api.updateEvent(editEvent.id, data);
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      } else {
        const created = await api.createEvent(data);
        setEvents((prev) => [...prev, created]);
      }
      setFormVisible(false);
      setEditEvent(null);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleDelete = (event: AppEvent) => {
    Alert.alert(t('common.confirmDelete', 'Delete'), t('events.confirmDelete', 'Delete this event?'), [
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      {
        text: t('common.delete', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteEvent(event.id);
            setEvents((prev) => prev.filter((e) => e.id !== event.id));
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
          }
        },
      },
    ]);
  };

  const handleShare = async (selectedUser: { id: string }) => {
    if (!shareTarget) return;
    try {
      const updated = await api.shareEvent(shareTarget.id, selectedUser.id);
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setShareTarget(null);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to share');
    }
  };

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const paged = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const renderItem = ({ item }: { item: AppEvent }) => {
    const startDate = item.startAt ? new Date(item.startAt) : null;
    return (
      <View style={styles.eventCard}>
        <View style={styles.eventLeft}>
          {startDate && (
            <View style={styles.dateBadge}>
              <Text style={styles.dateDay}>{format(startDate, 'd')}</Text>
              <Text style={styles.dateMonth}>{format(startDate, 'MMM')}</Text>
            </View>
          )}
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <View style={styles.eventMeta}>
              {item.startAt && (
                <Text style={styles.metaText}>
                  🕐 {format(new Date(item.startAt), 'HH:mm')}
                  {item.endAt && ` – ${format(new Date(item.endAt), 'HH:mm')}`}
                </Text>
              )}
              {item.location?.display_name && (
                <Text style={styles.metaText} numberOfLines={1}>
                  📍 {item.location.display_name.split(',')[0]}
                </Text>
              )}
            </View>
            {item.description ? (
              <Text style={styles.eventDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </View>
        {canManage && (
          <View style={styles.eventActions}>
            {item.ownerId === user?.id && (
              <TouchableOpacity onPress={() => setShareTarget(item)}>
                <Text style={styles.actionIcon}>👥</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                setEditEvent(item);
                setFormVisible(true);
              }}
            >
              <Text style={styles.actionIcon}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Text style={styles.actionIcon}>🗑</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('nav.events', 'Events')}</Text>
        {canManage && (
          <TouchableOpacity
            onPress={() => {
              setEditEvent(null);
              setFormVisible(true);
            }}
          >
            <Text style={styles.addBtn}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={paged}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.statusText}>{t('common.loading', 'Loading…')}</Text>
          ) : (
            <Text style={styles.statusText}>{t('events.empty', 'No events')}</Text>
          )
        }
        ListFooterComponent={<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
      />

      <EventFormModal
        visible={formVisible}
        initial={editEvent}
        onSave={handleSave}
        onCancel={() => {
          setFormVisible(false);
          setEditEvent(null);
        }}
      />

      <ShareUserModal
        visible={!!shareTarget}
        title={t('events.shareTitle', 'Share event')}
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
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  addBtn: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.lg,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  eventLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  dateBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  dateDay: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: fontSize.lg,
    lineHeight: 20,
  },
  dateMonth: {
    color: colors.textInverse,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  eventMeta: {
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  eventDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionIcon: {
    fontSize: 18,
  },
  statusText: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingVertical: spacing.xxl,
    fontSize: fontSize.md,
  },
});
