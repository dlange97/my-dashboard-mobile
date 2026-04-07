import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import api from '../api/api';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import { Button } from '../components/ui';

export default function CheckoutScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const hash = route.params?.hash ?? '';

  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [validationError, setValidationError] = useState('');

  const [instanceName, setInstanceName] = useState('');
  const [instanceSubdomain, setInstanceSubdomain] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ subdomain: string; token: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.validateCheckout(hash);
        if (data?.valid) {
          setValid(true);
        } else {
          setValidationError(data?.reason ?? 'This invite link is invalid or has already been used.');
        }
      } catch {
        setValidationError('Failed to validate invite link. Is the server running?');
      } finally {
        setValidating(false);
      }
    })();
  }, [hash]);

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const data = await api.completeCheckout(hash, {
        instanceName,
        instanceSubdomain,
        adminEmail,
        adminPassword,
        adminFirstName: adminFirstName || undefined,
        adminLastName: adminLastName || undefined,
      });

      setSuccess({ subdomain: data.subdomain, token: data.token });
    } catch (err: any) {
      setError(err.message || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoToDashboard() {
    if (!success) return;
    await SecureStore.setItemAsync('dashboard_token', success.token);
    // Reset navigation to the root so AuthContext picks up the new token
    navigation.reset({ index: 0, routes: [{ name: 'Root' }] });
  }

  if (validating) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Validating invite link…</Text>
      </View>
    );
  }

  if (!valid) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>Invalid Invite</Text>
        <Text style={styles.desc}>{validationError}</Text>
        <Button onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.lg }}>
          Back to Login
        </Button>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.center}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.heading}>Instance Created!</Text>
        <Text style={styles.desc}>
          Your instance <Text style={{ fontWeight: '700' }}>{success.subdomain}</Text> is ready.
        </Text>
        <Button onPress={handleGoToDashboard} style={{ marginTop: spacing.lg }}>
          Go to Dashboard
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Set Up Your Instance</Text>
        <Text style={styles.desc}>Fill in the details below to create your account and instance.</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Instance Details */}
        <Text style={styles.sectionLabel}>Instance Details</Text>

        <Text style={styles.label}>Instance Name *</Text>
        <TextInput
          style={styles.input}
          value={instanceName}
          onChangeText={setInstanceName}
          placeholder="Acme Corp"
          editable={!loading}
        />

        <Text style={styles.label}>Subdomain *</Text>
        <TextInput
          style={styles.input}
          value={instanceSubdomain}
          onChangeText={(v) => setInstanceSubdomain(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="acme"
          autoCapitalize="none"
          maxLength={63}
          editable={!loading}
        />

        {/* Admin Account */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Admin Account</Text>

        <Text style={styles.label}>First Name</Text>
        <TextInput style={styles.input} value={adminFirstName} onChangeText={setAdminFirstName} placeholder="Jane" editable={!loading} />

        <Text style={styles.label}>Last Name</Text>
        <TextInput style={styles.input} value={adminLastName} onChangeText={setAdminLastName} placeholder="Doe" editable={!loading} />

        <Text style={styles.label}>Email *</Text>
        <TextInput style={styles.input} value={adminEmail} onChangeText={setAdminEmail} placeholder="admin@example.com" keyboardType="email-address" autoCapitalize="none" editable={!loading} />

        <Text style={styles.label}>Password * (min. 8 characters)</Text>
        <TextInput style={styles.input} value={adminPassword} onChangeText={setAdminPassword} placeholder="••••••••" secureTextEntry editable={!loading} />

        <Button onPress={handleSubmit} loading={loading} style={{ marginTop: spacing.xl }}>
          {loading ? 'Creating…' : 'Create Instance'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  scroll: { padding: spacing.xxl, paddingBottom: spacing.xxxl },
  heading: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  desc: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' },
  emoji: { fontSize: 48, marginBottom: spacing.md },
  loadingText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
  sectionLabel: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontSize: fontSize.md, color: colors.text,
  },
  errorText: {
    color: colors.danger, fontSize: fontSize.sm,
    backgroundColor: '#fee2e2', padding: spacing.md,
    borderRadius: borderRadius.md, marginBottom: spacing.md,
  },
});
