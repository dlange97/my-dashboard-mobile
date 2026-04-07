import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import api from '../api/api';
import type { Instance } from '../types';
import { colors, borderRadius, fontSize, spacing, shadows } from '../theme';

export default function InstancePickerScreen() {
  const { selectInstance, logout } = useAuth();
  const { t } = useTranslation();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getMyInstances()
      .then((data) => setInstances(data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('instance.selectTitle', 'Select Instance')}</Text>
        <Text style={styles.subtitle}>
          {t('instance.selectSubtitle', 'Choose which dashboard to open')}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <FlatList
            data={instances}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.instanceRow}
                onPress={() => selectInstance(item.id)}
              >
                <View style={styles.instanceIcon}>
                  <Text style={styles.instanceIconText}>
                    {(item.name?.[0] ?? item.slug?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.instanceInfo}>
                  <Text style={styles.instanceName}>{item.name ?? item.slug}</Text>
                  <Text style={styles.instanceSlug}>{item.slug}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {t('instance.noInstances', 'No instances found.')}
              </Text>
            }
          />
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>{t('nav.logout', 'Logout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    ...shadows.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
  },
  loader: {
    marginVertical: spacing.xxl,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  instanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  instanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  instanceIconText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: fontSize.lg,
  },
  instanceInfo: {
    flex: 1,
  },
  instanceName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  instanceSlug: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: fontSize.xxl,
    color: colors.textMuted,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingVertical: spacing.xxl,
  },
  logoutBtn: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
