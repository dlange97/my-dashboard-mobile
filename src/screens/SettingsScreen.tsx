import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import api from '../api/api';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import { Button } from '../components/ui';
import type { RoleDefinition, JwtSessionSetting, NotificationTemplate, TranslationEntry } from '../types';

/* ─── Section wrapper (accordion) ─── */
function Section({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.container}>
      <TouchableOpacity style={sectionStyles.header} onPress={onToggle} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={sectionStyles.title}>{title}</Text>
          {subtitle ? <Text style={sectionStyles.subtitle}>{subtitle}</Text> : null}
        </View>
        <Text style={sectionStyles.arrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && <View style={sectionStyles.body}>{children}</View>}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  arrow: { fontSize: fontSize.md, color: colors.textMuted },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});

/* ═══════════════════════════════════════════════════
   ACCESS SETTINGS (Roles & Permissions)
   ═══════════════════════════════════════════════════ */
function AccessSettingsContent() {
  const [loading, setLoading] = useState(true);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAccessSettings();
      setAllPermissions(data?.permissions ?? []);
      if (Array.isArray(data?.roleDefinitions)) {
        setRoles(data.roleDefinitions);
      } else {
        setRoles(
          (data?.roles ?? []).map((slug: string) => ({
            id: null as any,
            name: slug,
            slug,
            permissions: data?.rolePermissions?.[slug] ?? [],
            isSystem: true,
            assignedUsersCount: 0,
          })),
        );
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load role settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(role: RoleDefinition) {
    if (role.isSystem || role.assignedUsersCount > 0) return;
    Alert.alert('Remove role?', `Remove role "${role.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteRole(role.id);
            setRoles((prev) => prev.filter((r) => r.id !== role.id));
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to remove role.');
          }
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator color={colors.primary} />;
  if (error) return <Text style={s.errorText}>{error}</Text>;

  return (
    <View>
      {roles.map((role) => (
        <View key={role.id ?? role.slug} style={s.roleCard}>
          <View style={s.roleHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.roleName}>{role.name}</Text>
              <Text style={s.roleSlug}>{role.slug}</Text>
            </View>
            <Text style={[s.badge, role.isSystem ? s.badgeSystem : s.badgeCustom]}>
              {role.isSystem ? 'System' : 'Custom'}
            </Text>
          </View>
          <Text style={s.roleMeta}>Assigned users: {role.assignedUsersCount ?? 0}</Text>
          <View style={s.permRow}>
            {allPermissions.map((p) => (
              <View key={p} style={[s.permTag, role.permissions.includes(p) && s.permTagActive]}>
                <Text style={[s.permTagText, role.permissions.includes(p) && s.permTagTextActive]}>{p}</Text>
              </View>
            ))}
          </View>
          {!role.isSystem && role.assignedUsersCount === 0 && (
            <TouchableOpacity onPress={() => handleDelete(role)} style={{ marginTop: spacing.sm }}>
              <Text style={{ color: colors.danger, fontSize: fontSize.sm }}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   JWT SESSION SETTINGS (admin only)
   ═══════════════════════════════════════════════════ */
function JwtSessionContent() {
  const [items, setItems] = useState<JwtSessionSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('Default JWT Session');
  const [newDays, setNewDays] = useState('30');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getJwtSessionSettings();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load JWT settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    const ttlDays = Number(newDays);
    if (!Number.isFinite(ttlDays) || ttlDays <= 0) { setError('Enter a valid number of days.'); return; }
    setSaving(true);
    try {
      await api.createJwtSessionSetting({ name: newName.trim() || 'Default JWT Session', ttlDays });
      setNewDays('30');
      await load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    Alert.alert('Delete?', 'Remove this JWT session setting?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try { await api.deleteJwtSessionSetting(id); await load(); }
          catch (err: any) { Alert.alert('Error', err.message); }
          finally { setSaving(false); }
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator color={colors.primary} />;

  return (
    <View>
      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <View style={s.jwtCreateRow}>
        <TextInput style={[s.input, { flex: 2 }]} value={newName} onChangeText={setNewName} placeholder="Setting name" />
        <TextInput style={[s.input, { flex: 1, marginHorizontal: spacing.sm }]} value={newDays} onChangeText={setNewDays} placeholder="Days" keyboardType="numeric" />
        <Button size="sm" onPress={handleCreate} loading={saving}>Add</Button>
      </View>

      {items.map((item) => {
        const days = Math.max(1, Math.round((item.ttlSeconds ?? 0) / 86400));
        return (
          <View key={item.id} style={s.jwtCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.roleName}>{item.name}</Text>
              <Text style={s.roleSlug}>{days} days</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={{ color: colors.danger, fontSize: fontSize.sm }}>Delete</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   NOTIFICATION SETTINGS
   ═══════════════════════════════════════════════════ */
function NotificationSettingsContent() {
  const [template, setTemplate] = useState<NotificationTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.getNotificationTemplate()
      .then(setTemplate)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function setChannel(ch: string, field: string, value: any) {
    setTemplate((prev) =>
      prev
        ? {
            ...prev,
            channels: {
              ...prev.channels,
              [ch]: { ...(prev.channels as any)[ch], [field]: value },
            },
          }
        : prev,
    );
  }

  async function save() {
    if (!template) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const ch = template.channels;
      const data = await api.updateNotificationTemplate({
        inboxEnabled: !!ch.inbox.enabled,
        inboxTitle: ch.inbox.title,
        inboxBody: ch.inbox.body,
        emailEnabled: !!ch.email.enabled,
        emailTitle: ch.email.title,
        emailBody: ch.email.body,
        pushEnabled: !!ch.push.enabled,
        pushTitle: ch.push.title,
        pushBody: ch.push.body,
      });
      setTemplate(data ?? template);
      setSuccess('Template saved.');
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  if (loading) return <ActivityIndicator color={colors.primary} />;
  if (!template) return <Text style={s.errorText}>No template loaded.</Text>;

  const channels: [string, string][] = [['inbox', 'Inbox'], ['email', 'Email'], ['push', 'Push']];

  return (
    <View>
      {error ? <Text style={s.errorText}>{error}</Text> : null}
      {success ? <Text style={s.successText}>{success}</Text> : null}

      {channels.map(([key, label]) => {
        const ch = (template.channels as any)[key];
        return (
          <View key={key} style={s.channelCard}>
            <View style={s.channelHeader}>
              <Text style={s.roleName}>{label}</Text>
              <Switch value={!!ch?.enabled} onValueChange={(v) => setChannel(key, 'enabled', v)} />
            </View>
            <Text style={s.label}>Title</Text>
            <TextInput style={s.input} value={ch?.title ?? ''} onChangeText={(v) => setChannel(key, 'title', v)} />
            <Text style={s.label}>Body</Text>
            <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={ch?.body ?? ''} onChangeText={(v) => setChannel(key, 'body', v)} multiline />
          </View>
        );
      })}

      <Button onPress={save} loading={saving} style={{ marginTop: spacing.md }}>Save Template</Button>
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   TRANSLATION SETTINGS (admin only)
   ═══════════════════════════════════════════════════ */
function TranslationSettingsContent() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<TranslationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editEn, setEditEn] = useState('');
  const [editPl, setEditPl] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAdminTranslations();
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.translationKey.toLowerCase().includes(q) ||
      (r.values?.en ?? '').toLowerCase().includes(q) ||
      (r.values?.pl ?? '').toLowerCase().includes(q)
    );
  });

  function startEdit(row: TranslationEntry) {
    setEditKey(row.translationKey);
    setEditEn(row.values?.en ?? '');
    setEditPl(row.values?.pl ?? '');
  }

  async function saveEdit() {
    if (!editKey) return;
    setSaving(true);
    try {
      const updated = await api.updateTranslation(editKey, { values: { en: editEn.trim(), pl: editPl.trim() } });
      setRows((prev) => prev.map((r) => (r.translationKey === editKey ? updated : r)));
      setEditKey(null);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(key: string) {
    Alert.alert('Delete?', 'Delete this translation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteTranslation(key);
            setRows((prev) => prev.filter((r) => r.translationKey !== key));
          } catch (err: any) { Alert.alert('Error', err.message); }
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator color={colors.primary} />;

  return (
    <View>
      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <TextInput
        style={s.input}
        placeholder={t('translations.search', 'Search keys…')}
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      <Text style={[s.roleSlug, { marginTop: spacing.sm, marginBottom: spacing.md }]}>
        {filtered.length} / {rows.length} entries
      </Text>

      {/* Edit modal */}
      {editKey && (
        <View style={s.editBlock}>
          <Text style={[s.roleName, { marginBottom: spacing.sm }]}>{editKey}</Text>
          <Text style={s.label}>EN</Text>
          <TextInput style={s.input} value={editEn} onChangeText={setEditEn} />
          <Text style={s.label}>PL</Text>
          <TextInput style={s.input} value={editPl} onChangeText={setEditPl} />
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
            <Button variant="secondary" onPress={() => setEditKey(null)}>Cancel</Button>
            <Button loading={saving} onPress={saveEdit}>Save</Button>
          </View>
        </View>
      )}

      {filtered.map((row) => (
        <View key={row.translationKey} style={s.translRow}>
          <Text style={s.translKey}>{row.translationKey}</Text>
          <Text style={s.translVal}>EN: {row.values?.en ?? '—'}</Text>
          <Text style={s.translVal}>PL: {row.values?.pl ?? '—'}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs }}>
            <TouchableOpacity onPress={() => startEdit(row)}>
              <Text style={{ color: colors.primary, fontSize: fontSize.sm }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(row.translationKey)}>
              <Text style={{ color: colors.danger, fontSize: fontSize.sm }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN SETTINGS SCREEN
   ═══════════════════════════════════════════════════ */
export default function SettingsScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [openSection, setOpenSection] = useState('access');

  const isAdmin = Array.isArray(user?.roles) && user!.roles.includes('ROLE_ADMIN');

  function toggle(id: string) {
    setOpenSection((prev) => (prev === id ? '' : id));
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      <Text style={s.title}>{t('settings.title', 'Settings')}</Text>

      <Section
        title={t('settings.access', '🔐 Access & Roles')}
        subtitle={t('settings.accessSubtitle', 'Manage roles and permissions')}
        open={openSection === 'access'}
        onToggle={() => toggle('access')}
      >
        <AccessSettingsContent />
      </Section>

      {isAdmin && (
        <Section
          title={t('settings.jwtSession', '🪪 JWT Session')}
          subtitle={t('settings.jwtSessionSubtitle', 'Token expiry configuration')}
          open={openSection === 'jwt-session'}
          onToggle={() => toggle('jwt-session')}
        >
          <JwtSessionContent />
        </Section>
      )}

      <Section
        title={t('settings.notifications', '🔔 Notifications')}
        subtitle={t('settings.notificationsSubtitle', 'Message templates and delivery channels')}
        open={openSection === 'notifications'}
        onToggle={() => toggle('notifications')}
      >
        <NotificationSettingsContent />
      </Section>

      {isAdmin && (
        <Section
          title={t('settings.translations', '🌐 Translations')}
          subtitle={t('settings.translationsSubtitle', 'Manage UI translation keys')}
          open={openSection === 'translations'}
          onToggle={() => toggle('translations')}
        >
          <TranslationSettingsContent />
        </Section>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },

  // Shared
  errorText: { color: colors.danger, fontSize: fontSize.sm, backgroundColor: '#fee2e2', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  successText: { color: colors.success, fontSize: fontSize.sm, backgroundColor: '#dcfce7', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginTop: spacing.sm, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.md, color: colors.text,
  },

  // Roles
  roleCard: {
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  roleHeader: { flexDirection: 'row', alignItems: 'center' },
  roleName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  roleSlug: { fontSize: fontSize.xs, color: colors.textMuted },
  roleMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full, fontSize: fontSize.xs, overflow: 'hidden' },
  badgeSystem: { backgroundColor: '#dbeafe', color: colors.primary },
  badgeCustom: { backgroundColor: '#fef3c7', color: '#b45309' },
  permRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm },
  permTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  permTagActive: { backgroundColor: '#dbeafe', borderColor: colors.primary },
  permTagText: { fontSize: 10, color: colors.textMuted },
  permTagTextActive: { color: colors.primary },

  // JWT
  jwtCreateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  jwtCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.sm,
  },

  // Notifications
  channelCard: {
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md,
  },
  channelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },

  // Translations
  editBlock: {
    backgroundColor: '#fef9c3', borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md,
  },
  translRow: {
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.xs,
  },
  translKey: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  translVal: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
});
