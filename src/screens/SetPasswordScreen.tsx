import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { AuthStackParamList } from "../navigation/types";
import api from "../api/api";
import { useTranslation } from "../context/TranslationContext";
import { Button, ScreenBackdrop, SurfaceCard } from "../components/ui";
import { borderRadius, colors, fontSize, spacing } from "../theme";

type SetPasswordRoute = RouteProp<AuthStackParamList, "SetPassword">;

export default function SetPasswordScreen() {
  const route = useRoute<SetPasswordRoute>();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  const token = route.params?.token ?? "";

  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function validateToken() {
      try {
        const data = await api.validateInvite(token);
        if (!active) return;

        if (data?.valid) {
          setValid(true);
          setEmail(data.email ?? "");
        } else {
          setValidationError(
            data?.reason ??
              t(
                "setPassword.invalid",
                "This invitation link is invalid or has already been used.",
              ),
          );
        }
      } catch (err: unknown) {
        if (!active) return;
        setValidationError(
          err instanceof Error
            ? err.message
            : t(
                "setPassword.invalid",
                "This invitation link is invalid or has already been used.",
              ),
        );
      } finally {
        if (active) setValidating(false);
      }
    }

    validateToken();

    return () => {
      active = false;
    };
  }, [token, t]);

  async function handleSubmit() {
    setError("");

    if (password.length < 8) {
      setError(
        t("setPassword.tooShort", "Password must be at least 8 characters."),
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(t("setPassword.mismatch", "Passwords do not match."));
      return;
    }

    setLoading(true);
    try {
      await api.acceptInvite(token, password);
      setSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              "setPassword.error",
              "Could not set your password. Please try again.",
            ),
      );
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.infoText}>
          {t("setPassword.validating", "Validating your invitation…")}
        </Text>
      </View>
    );
  }

  if (!valid) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>
          {t("setPassword.invalidTitle", "Invalid invitation")}
        </Text>
        <Text style={styles.desc}>{validationError}</Text>
        <Button onPress={() => navigation.navigate("Login")}>
          {t("setPassword.backToLogin", "Back to login")}
        </Button>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>
          {t("setPassword.successTitle", "Password set")}
        </Text>
        <Text style={styles.desc}>
          {t(
            "setPassword.successBody",
            "Your password has been set. You can now sign in.",
          )}
        </Text>
        <Button onPress={() => navigation.navigate("Login")}>
          {t("setPassword.goToLogin", "Go to login")}
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenBackdrop
        scrollProps={{ keyboardShouldPersistTaps: "handled" }}
        contentStyle={styles.scroll}
      >
        <SurfaceCard>
          <Text style={styles.heading}>
            {t("setPassword.title", "Set your password")}
          </Text>
          <Text style={styles.desc}>
            {t(
              "setPassword.subtitle",
              "Choose a password to activate your account.",
            )}
            {email ? ` (${email})` : ""}
          </Text>

          <Text style={styles.label}>
            {t("setPassword.passwordLabel", "Password")}
          </Text>
          <TextInput
            style={styles.input}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>
            {t("setPassword.confirmLabel", "Confirm password")}
          </Text>
          <TextInput
            style={styles.input}
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity
            onPress={() => setShowPassword((p) => !p)}
            style={styles.showPasswordRow}
          >
            <Text style={styles.showPasswordText}>
              {showPassword
                ? t("setPassword.hide", "Hide password")
                : t("setPassword.show", "Show password")}
            </Text>
          </TouchableOpacity>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <Button onPress={handleSubmit} loading={loading} disabled={loading}>
            {loading
              ? t("setPassword.saving", "Saving…")
              : t("setPassword.submit", "Set password")}
          </Button>
        </SurfaceCard>
      </ScreenBackdrop>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: "center" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  desc: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  infoText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  label: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
  },
  showPasswordRow: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    alignSelf: "flex-start",
  },
  showPasswordText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  errorText: {
    color: colors.danger,
    marginBottom: spacing.md,
    fontSize: fontSize.sm,
  },
});
