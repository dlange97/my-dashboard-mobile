import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/TranslationContext";
import api from "../api/api";
import { colors, spacing, fontSize, borderRadius, shadows } from "../theme";
import type { TodoItem, ShoppingList, AppEvent } from "../types";
import { PageHeader, ScreenBackdrop, SurfaceCard } from "../components/ui";

// ── Helpers ──────────────────────────────────────────────────────────────────

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[pillStyles.pill, { backgroundColor: color + "22" }]}>
      <Text style={[pillStyles.text, { color }]}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

function StatCard({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <View
      style={[statStyles.card, { borderTopColor: color, borderTopWidth: 3 }]}
    >
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    marginHorizontal: spacing.xs,
    ...shadows.sm,
  },
  value: { fontSize: fontSize.xxl, fontWeight: "800" },
  label: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
});

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.wrapper}>
      <Text style={sectionStyles.title}>{title}</Text>
      {subtitle ? <Text style={sectionStyles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrapper: { marginBottom: spacing.xl },
  title: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout, hasPermission } = useAuth();
  const { t, locale, changeLocale } = useTranslation();

  const [todoStats, setTodoStats] = useState<{
    total: number;
    done: number;
  } | null>(null);
  const [shoppingCount, setShoppingCount] = useState<number | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [todos, shopping, events] = await Promise.allSettled([
          hasPermission("todos.view")
            ? api.getTodos()
            : Promise.resolve([] as TodoItem[]),
          hasPermission("shopping.view")
            ? api.getLists()
            : Promise.resolve([] as ShoppingList[]),
          hasPermission("events.view")
            ? api.getEvents()
            : Promise.resolve([] as AppEvent[]),
        ]);

        if (todos.status === "fulfilled") {
          const t = todos.value as TodoItem[];
          setTodoStats({
            total: t.length,
            done: t.filter((x) => x.done).length,
          });
        }
        if (shopping.status === "fulfilled") {
          setShoppingCount((shopping.value as ShoppingList[]).length);
        }
        if (events.status === "fulfilled") {
          const now = new Date();
          const upcoming = (events.value as AppEvent[])
            .filter((e) => new Date(e.startAt) >= now)
            .sort(
              (a, b) =>
                new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
            )
            .slice(0, 3);
          setUpcomingEvents(upcoming);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = user
    ? (
        (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")
      ).toUpperCase() ||
      user.email?.[0]?.toUpperCase() ||
      "?"
    : "?";

  const fullName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : (user?.email ?? t("profile.unknownUser", "Unknown user"));

  const roles: string[] = user?.roles ?? [];
  const displayRole =
    roles
      .filter((r) => r !== "ROLE_USER")
      .map((r) => r.replace(/^ROLE_/, "").replace(/_/g, " "))
      .join(", ") || "User";

  const handleLanguageChange = async (newLocale: string) => {
    if (newLocale === locale) return;
    await changeLocale(newLocale);
    try {
      await api.updateMyLanguage(newLocale);
    } catch {
      // keep local language selection even if backend update fails
    }
  };

  return (
    <ScreenBackdrop contentStyle={styles.content}>
      <PageHeader
        eyebrow={t("nav.profile", "Profile")}
        title={fullName}
        subtitle={displayRole}
      />

      <SurfaceCard style={styles.avatarCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Pill label={displayRole} color={colors.primary} />
      </SurfaceCard>

      <Section
        title={t("profile.language", "Language")}
        subtitle={t("profile.languageHint", "Visible app language switch")}
      >
        <View style={styles.languageRow}>
          {[
            { code: "en", label: "English" },
            { code: "pl", label: "Polski" },
          ].map((item) => {
            const active = locale === item.code;
            return (
              <TouchableOpacity
                key={item.code}
                onPress={() => void handleLanguageChange(item.code)}
                style={[styles.langBtn, active && styles.langBtnActive]}
              >
                <Text
                  style={[
                    styles.langBtnText,
                    active && styles.langBtnTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Section>

      {/* ── Stats ── */}
      {loading ? (
        <ActivityIndicator
          color={colors.primary}
          style={{ marginVertical: spacing.xl }}
        />
      ) : (
        <Section title={t("profile.stats", "My Stats")}>
          <View style={styles.statsRow}>
            {todoStats !== null && (
              <StatCard
                value={`${todoStats.done}/${todoStats.total}`}
                label={t("profile.todosDone", "Todos done")}
                color={colors.success}
              />
            )}
            {shoppingCount !== null && (
              <StatCard
                value={shoppingCount}
                label={t("profile.shoppingLists", "Shopping lists")}
                color={colors.warning}
              />
            )}
            {todoStats !== null && todoStats.total > 0 && (
              <StatCard
                value={`${Math.round((todoStats.done / todoStats.total) * 100)}%`}
                label={t("profile.progress", "Progress")}
                color={colors.info}
              />
            )}
          </View>
        </Section>
      )}

      {/* ── Upcoming Events ── */}
      {upcomingEvents.length > 0 && (
        <Section title={t("profile.upcomingEvents", "Upcoming Events")}>
          {upcomingEvents.map((ev) => (
            <View key={ev.id} style={styles.eventRow}>
              <View style={styles.eventDot} />
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {ev.title}
                </Text>
                <Text style={styles.eventDate}>
                  {new Date(ev.startAt).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>
          ))}
        </Section>
      )}

      {/* ── Account info ── */}
      <Section title={t("profile.account", "Account")}>
        <View style={styles.infoCard}>
          {[
            { label: t("profile.email", "Email"), value: user?.email ?? "—" },
            { label: t("profile.role", "Role"), value: displayRole },
          ].map(({ label, value }) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      {/* ── Logout ── */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={logout}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>{t("profile.logout", "Sign out")}</Text>
      </TouchableOpacity>
    </ScreenBackdrop>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 88;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  avatarCard: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  avatarText: { fontSize: 36, fontWeight: "800", color: colors.textInverse },
  name: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  statsRow: { flexDirection: "row", marginHorizontal: -spacing.xs },
  languageRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  langBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  langBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  langBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.text,
  },
  langBtnTextActive: {
    color: "#fff",
  },

  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginRight: spacing.md,
  },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: fontSize.md, fontWeight: "600", color: colors.text },
  eventDate: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "500",
    maxWidth: "60%",
    textAlign: "right",
  },

  logoutBtn: {
    backgroundColor: colors.danger + "15",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.danger + "40",
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.danger,
  },
});
