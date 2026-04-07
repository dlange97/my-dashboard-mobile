import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, borderRadius, fontSize, spacing, shadows } from '../../theme';
import Button from './Button';
import api from '../../api/api';
import type { ShareableUser } from '../../types';

interface Props {
  visible: boolean;
  title: string;
  currentUserId?: string;
  alreadySharedUserIds?: string[];
  onClose: () => void;
  onConfirm: (user: ShareableUser) => void;
}

export default function ShareUserModal({
  visible,
  title,
  currentUserId,
  alreadySharedUserIds = [],
  onClose,
  onConfirm,
}: Props) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<ShareableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ShareableUser | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getShareableUsers({ page: 1, perPage: 50, search });
      const list = Array.isArray(response)
        ? response
        : Array.isArray((response as { items: ShareableUser[] })?.items)
          ? (response as { items: ShareableUser[] }).items
          : [];
      setUsers(list);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (!visible) return;
    loadUsers();
  }, [visible, loadUsers]);

  useEffect(() => {
    if (!visible) {
      setSearch('');
      setSelected(null);
      setUsers([]);
    }
  }, [visible]);

  const filteredUsers = users.filter(
    (u) => u.id !== currentUserId && !alreadySharedUserIds.includes(u.id),
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>{title}</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search users…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />

          {loading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              style={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.userRow,
                    selected?.id === item.id && styles.userRowSelected,
                  ]}
                  onPress={() => setSelected(item)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(item.firstName?.[0] ?? item.email[0]).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </View>
                  {selected?.id === item.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>No users found</Text>
              }
            />
          )}

          <View style={styles.actions}>
            <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.btn} />
            <Button
              title="Share"
              onPress={() => selected && onConfirm(selected)}
              disabled={!selected}
              style={styles.btn}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xxl,
    maxHeight: '80%',
    ...shadows.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  loader: {
    marginVertical: spacing.xxl,
  },
  list: {
    maxHeight: 300,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  userRowSelected: {
    backgroundColor: colors.borderLight,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  checkmark: {
    fontSize: fontSize.xl,
    color: colors.primary,
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingVertical: spacing.xxl,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  btn: {
    minWidth: 100,
  },
});
