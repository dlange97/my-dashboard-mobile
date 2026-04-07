import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import api from '../api/api';
import { Button } from '../components/ui';
import { colors, borderRadius, fontSize, spacing, shadows } from '../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const { t } = useTranslation();

  const [view, setView] = useState<'login' | 'request'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setRequestSuccess('');
    setLoginLoading(true);

    try {
      const data = await api.login(email.trim(), password);
      await login(data.token, data.user ?? { email } as any);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.networkError', 'Network error. Is the server running?'),
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRequestAccess() {
    setError('');
    setRequestSuccess('');

    if (!email.trim()) {
      setError(t('login.emailRequired', 'Enter your email before sending request access.'));
      return;
    }

    setRequestLoading(true);
    try {
      await api.requestAccess({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        message: requestMessage.trim(),
      });
      setRequestSuccess(t('login.requestSent', 'Request access sent. Admin will review your request.'));
      setView('login');
      setFirstName('');
      setLastName('');
      setRequestMessage('');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.requestFailed', 'Failed to send request access.'),
      );
    } finally {
      setRequestLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {view === 'login' ? (
            <>
              <Text style={styles.brand}>{t('nav.brand', 'My Dashboard')}</Text>
              <Text style={styles.subtitle}>
                {t('login.subtitle', 'Sign in to your account')}
              </Text>

              {!!error && <Text style={styles.error}>{error}</Text>}
              {!!requestSuccess && <Text style={styles.success}>{requestSuccess}</Text>}

              <Text style={styles.label}>{t('login.email', 'Email')}</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
              />

              <Text style={styles.label}>{t('login.password', 'Password')}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((p) => !p)}
                >
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <Button
                title={loginLoading ? t('login.signingIn', 'Signing in…') : t('login.signIn', 'Sign In')}
                onPress={handleLogin}
                loading={loginLoading}
                disabled={loginLoading || requestLoading}
                style={styles.mainBtn}
              />

              <Button
                title={t('login.requestAccess', 'Request Access')}
                variant="secondary"
                onPress={() => { setError(''); setRequestSuccess(''); setView('request'); }}
                disabled={loginLoading || requestLoading}
                style={styles.secondaryBtn}
              />

              <Text style={styles.footer}>
                {t('login.footerNote', 'Account creation is managed by administrators.')}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.requestHeader}>
                <Text style={styles.brand}>{t('login.requestAccess', 'Request Access')}</Text>
                <TouchableOpacity onPress={() => { setError(''); setView('login'); }}>
                  <Text style={styles.backLink}>{t('login.backToLogin', '← Back to login')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.subtitle}>
                {t('login.requestSubtitle', 'Send your details to administrator for approval.')}
              </Text>

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Text style={styles.label}>{t('login.email', 'Email')} *</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>{t('login.firstName', 'First name')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Jan"
                    placeholderTextColor={colors.textMuted}
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>{t('login.lastName', 'Last name')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Kowalski"
                    placeholderTextColor={colors.textMuted}
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>

              <Text style={styles.label}>{t('login.requestMessage', 'Message')}</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Write a short message…"
                placeholderTextColor={colors.textMuted}
                value={requestMessage}
                onChangeText={setRequestMessage}
                multiline
                numberOfLines={3}
              />

              <View style={styles.requestActions}>
                <Button
                  title={t('common.cancel', 'Cancel')}
                  variant="secondary"
                  onPress={() => setView('login')}
                />
                <Button
                  title={requestLoading ? t('login.sending', 'Sending…') : t('login.sendRequest', 'Send Request')}
                  onPress={handleRequestAccess}
                  loading={requestLoading}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    ...shadows.lg,
  },
  brand: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
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
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  eyeBtn: {
    padding: spacing.sm,
  },
  eyeText: {
    fontSize: fontSize.xl,
  },
  mainBtn: {
    marginTop: spacing.lg,
  },
  secondaryBtn: {
    marginTop: spacing.sm,
  },
  error: {
    backgroundColor: '#fef2f2',
    color: colors.danger,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  success: {
    backgroundColor: '#f0fdf4',
    color: colors.success,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  footer: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  backLink: {
    color: colors.primary,
    fontSize: fontSize.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
