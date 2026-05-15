import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/TranslationContext";
import api from "../api/api";
import { Button, ShareUserModal } from "../components/ui";
import { colors, borderRadius, fontSize, spacing, shadows } from "../theme";
import type { ShoppingList } from "../types";

export default function ShoppingScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [shareTarget, setShareTarget] = useState<ShoppingList | null>(null);

  const load = async () => {
    try {
      const data = await api.getLists();
      setLists(data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const createList = async () => {
    if (!newName.trim()) return;
    try {
      const created = await api.createList({ name: newName.trim() });
      setLists((prev) => [...prev, created]);
      setNewName("");
      setShowNewForm(false);
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    }
  };

  const deleteList = (list: ShoppingList) => {
    Alert.alert(
      t("common.confirmDelete", "Delete"),
      t("shopping.confirmDelete", "Delete this list?"),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("common.delete", "Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteList(list.id);
              setLists((prev) => prev.filter((l) => l.id !== list.id));
            } catch (err: unknown) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed",
              );
            }
          },
        },
      ],
    );
  };

  const handleShare = async (selectedUser: { id: string }) => {
    if (!shareTarget) return;
    try {
      const updated = await api.shareList(shareTarget.id, selectedUser.id);
      setLists((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setShareTarget(null);
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    }
  };

  const activeLists = lists.filter((l) => l.status !== "archived");

  const renderItem = ({ item }: { item: ShoppingList }) => {
    const productCount = item.products?.length ?? 0;
    const checkedCount = item.products?.filter((p) => p.checked).length ?? 0;

    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => nav.navigate("ShoppingDetail", { listId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.listHeader}>
          <Text style={styles.listName}>{item.name}</Text>
          <View style={styles.listActions}>
            {item.ownerId === user?.id && (
              <TouchableOpacity onPress={() => setShareTarget(item)}>
                <Text style={styles.actionIcon}>👥</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => deleteList(item)}>
              <Text style={styles.actionIcon}>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.listMeta}>
          {checkedCount}/{productCount} {t("shopping.products", "products")}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("nav.shopping", "Shopping Lists")}</Text>
      </View>

      <TouchableOpacity
        style={styles.addBtnRow}
        onPress={() => setShowNewForm((s) => !s)}
      >
        <Text style={styles.addBtnText}>
          ＋ {t("shopping.newList", "New List")}
        </Text>
      </TouchableOpacity>

      {showNewForm && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t("shopping.newListPlaceholder", "New list name")}
            placeholderTextColor={colors.textMuted}
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />
          <View style={styles.formActions}>
            <Button
              title={t("common.cancel", "Cancel")}
              variant="secondary"
              size="sm"
              onPress={() => setShowNewForm(false)}
            />
            <Button
              title={t("shopping.createList", "Create")}
              size="sm"
              onPress={createList}
            />
          </View>
        </View>
      )}

      <FlatList
        data={activeLists}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <Text style={styles.statusText}>
              {t("common.loading", "Loading…")}
            </Text>
          ) : (
            <Text style={styles.statusText}>
              {t("shopping.empty", "No shopping lists")}
            </Text>
          )
        }
      />

      <ShareUserModal
        visible={!!shareTarget}
        title={t("shopping.shareTitle", "Share list")}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
  },
  addBtnRow: {
    alignSelf: "center",
    marginVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    ...shadows.sm,
  },
  addBtnText: {
    color: "#fff",
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  form: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  listContent: {
    padding: spacing.lg,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listName: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  listActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionIcon: {
    fontSize: 18,
  },
  listMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusText: {
    textAlign: "center",
    color: colors.textMuted,
    paddingVertical: spacing.xxl,
  },
});
