import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useInbox } from "../context/InboxContext";
import { useTranslation } from "../context/TranslationContext";
import { colors, spacing, fontSize, borderRadius, shadows } from "../theme";
import type { InboxNotification } from "../types";

export default function InboxScreen() {
  const {
    items: notifications,
    unreadCount,
    loading,
    loadInbox: refresh,
    markRead,
    clearAll,
  } = useInbox();
  const { t } = useTranslation();

  const handlePress = useCallback(
    (item: InboxNotification) => {
      if (!item.readAt) {
        markRead(item);
      }
    },
    [markRead],
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderItem = ({ item }: { item: InboxNotification }) => (
    <TouchableOpacity
      style={[styles.card, !item.readAt && styles.unreadCard]}
      onPress={() => handlePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        {!item.readAt && <View style={styles.unreadDot} />}
        <Text
          style={[styles.cardTitle, !item.readAt && styles.unreadTitle]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
      </View>
      <Text style={styles.cardBody} numberOfLines={2}>
        {item.body}
      </Text>
      <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>
          {t("inbox.title", "Inbox")}{" "}
          {unreadCount > 0 && <Text style={styles.badge}>({unreadCount})</Text>}
        </Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAll}>
            <Text style={styles.clearBtn}>
              {t("inbox.clearAll", "Clear all")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>
            {t("inbox.empty", "No notifications")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
  },
  badge: {
    color: colors.primary,
    fontWeight: "700",
  },
  clearBtn: {
    fontSize: fontSize.sm,
    color: colors.danger,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  list: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: "700",
  },
  cardBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
