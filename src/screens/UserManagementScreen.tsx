import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import api from '../api/api';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import { Button } from '../components/ui';
import type { User } from '../types';

/* ─── Create User Modal ─── */
function CreateUserModal({
  visible,
  roles,
  onClose,
  onCreated,
}: {
  visible: boolean;
  roles: string[];
  onClose: () => void;
  onCreated: (u: User) => void;
}) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirm: '',
    role: roles[0] ?? 'ROLE_USER',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit() {
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.createUser({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
      });
      onCreated(data.user);
      setForm({ firstName: '', lastName: '', email: '', password: '', confirm: '', role: roles[0] ?? 'ROLE_USER' });
    } catch (err: any) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.modalScroll}>
          <Text style={styles.modalTitle}>Create New User</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>First Name</Text>
          <TextInput style={styles.input} value={form.firstName} onChangeText={(v) => set('firstName', v)} placeholder="Jan" />

          <Text style={styles.label}>Last Name</Text>
          <TextInput style={styles.input} value={form.lastName} onChangeText={(v) => set('lastName', v)} placeholder="Kowalski" />

          <Text style={styles.label}>Email *</Text>
          <TextInput style={styles.input} value={form.email} onChangeText={(v) => set('email', v)} placeholder="user@example.com" keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Password *</Text>
          <TextInput style={styles.input} value={form.password} onChangeText={(v) => set('password', v)} placeholder="Min. 8 characters" secureTextEntry />

          <Text style={styles.label}>Confirm Password *</Text>
          <TextInput style={styles.input} value={form.confirm} onChangeText={(v) => set('confirm', v)} placeholder="Repeat password" secureTextEntry />

          <Text style={styles.label}>Role</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleRow}>
            {roles.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, form.role === r && styles.roleChipActive]}
                onPress={() => set('role', r)}
              >
                <Text style={[styles.roleChipText, form.role === r && styles.roleChipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <Button variant="secondary" onPress={onClose}>Cancel</Button>
            <Button loading={loading} onPress={handleSubmit}>Create User</Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Edit User Modal ─── */
function EditUserModal({
  visible,
  user,
  roles,
  onClose,
  onSaved,
}: {
  visible: boolean;
  user: User | null;
  roles: string[];
  onClose: () => void;
  onSaved: (u: User) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('ROLE_USER');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setRole(user.roles?.[0] ?? 'ROLE_USER');
    }
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.updateUser(user.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
      });
      onSaved(data.user ?? { ...user, firstName, lastName, roles: [role] });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update user.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.modalScroll}>
          <Text style={styles.modalTitle}>Edit User</Text>
          <Text style={styles.subLabel}>{user?.email}</Text>

          <Text style={styles.label}>First Name</Text>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

          <Text style={styles.label}>Last Name</Text>
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />

          <Text style={styles.label}>Role</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleRow}>
            {roles.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, role === r && styles.roleChipActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <Button variant="secondary" onPress={onClose}>Cancel</Button>
            <Button loading={loading} onPress={handleSave}>Save</Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Main Screen ─── */
export default function UserManagementScreen() {
  const { hasPermission } = useAuth();
  const { t } = useTranslation();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState<string[]>(['ROLE_USER']);

  const [createVisible, setCreateVisible] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const canCreate = hasPermission('users.create');
  const canEdit = hasPermission('users.assign_roles');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getUsers({ page, perPage: 20, search });
      if (Array.isArray(data)) {
        setUsers(data);
        setTotalPages(1);
      } else {
        setUsers(data?.items ?? []);
        setTotalPages(Math.max(1, data?.pagination?.totalPages ?? 1));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (canEdit) {
      api.getAccessSettings().then((d: any) => {
        if (Array.isArray(d?.roles) && d.roles.length) setRoles(d.roles);
      }).catch(() => {});
    }
  }, [canEdit]);

  function handleDelete(user: User) {
    Alert.alert(
      'Deactivate user?',
      `User ${user.email} will be soft deleted and marked as inactive.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteUser(user.id);
              loadUsers();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to deactivate user.');
            }
          },
        },
      ],
    );
  }

  const renderUser = ({ item }: { item: User }) => {
    const name = `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || '—';
    const role = item.roles?.[0] ?? 'ROLE_USER';
    const isInactive = (item as any).status === 'inactive';

    return (
      <View style={styles.userCard}>
        <View style={styles.userRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <View style={styles.userBadges}>
            <View style={[styles.statusBadge, isInactive ? styles.badgeInactive : styles.badgeActive]}>
              <Text style={styles.badgeText}>{isInactive ? 'Inactive' : 'Active'}</Text>
            </View>
            <Text style={styles.userRole}>{role}</Text>
          </View>
        </View>
        <View style={styles.userActions}>
          {canEdit && (
            <TouchableOpacity onPress={() => setEditUser(item)} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
          {canEdit && !isInactive && (
            <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.actionBtn, styles.actionBtnDanger]}>
              <Text style={[styles.actionBtnText, { color: colors.danger }]}>Deactivate</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>{t('users.title', 'Users')}</Text>
        {canCreate && (
          <TouchableOpacity onPress={() => setCreateVisible(true)}>
            <Text style={styles.addBtn}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('users.searchPlaceholder', 'Search by email or name')}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={(v) => { setSearch(v); setPage(1); }}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadUsers} />}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('users.noUsers', 'No users found.')}</Text>}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity disabled={page <= 1} onPress={() => setPage((p) => p - 1)}>
            <Text style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}>← Prev</Text>
          </TouchableOpacity>
          <Text style={styles.pageMeta}>{page} / {totalPages}</Text>
          <TouchableOpacity disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)}>
            <Text style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      <CreateUserModal visible={createVisible} roles={roles} onClose={() => setCreateVisible(false)} onCreated={() => { setCreateVisible(false); loadUsers(); }} />
      <EditUserModal visible={!!editUser} user={editUser} roles={roles} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); loadUsers(); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.surface, ...shadows.sm,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  addBtn: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
  searchRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchInput: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontSize: fontSize.md, color: colors.text, ...shadows.sm,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xxl, fontSize: fontSize.md },
  userCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm,
  },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  userEmail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  userBadges: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeInactive: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  userRole: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  userActions: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.md },
  actionBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  actionBtnDanger: {},
  actionBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  pagination: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: spacing.md, gap: spacing.lg,
  },
  pageBtn: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
  pageBtnDisabled: { color: colors.textMuted },
  pageMeta: { fontSize: fontSize.sm, color: colors.textSecondary },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalScroll: { padding: spacing.xxl },
  modalTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  subLabel: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontSize: fontSize.md, color: colors.text,
  },
  roleRow: { marginTop: spacing.xs, marginBottom: spacing.md },
  roleChip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm,
  },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleChipText: { fontSize: fontSize.sm, color: colors.text },
  roleChipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.xxl },
  errorText: { color: colors.danger, fontSize: fontSize.sm, marginBottom: spacing.md, backgroundColor: '#fee2e2', padding: spacing.md, borderRadius: borderRadius.md },
});
