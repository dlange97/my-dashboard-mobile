import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/TranslationContext";
import { useInbox } from "../context/InboxContext";
import api from "../api/api";
import { colors, borderRadius, fontSize, spacing, shadows } from "../theme";
import type { TodoItem, ShoppingList, AppEvent, Note } from "../types";

const DEFAULT_NOTE_COLOR = "#fef3c7";
const NOTE_COLORS = [
  "#fef3c7",
  "#dbeafe",
  "#dcfce7",
  "#fce7f3",
  "#ffe4e6",
  "#ede9fe",
  "#e2e8f0",
  "#fde68a",
];

function normalizeColor(value?: string): string {
  if (typeof value !== "string") return DEFAULT_NOTE_COLOR;
  const trimmed = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(trimmed) ? trimmed : DEFAULT_NOTE_COLOR;
}

function getTextColorForBackground(hexColor?: string): string {
  const hex = normalizeColor(hexColor).slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? "#0f172a" : "#ffffff";
}

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  value: string | number;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.summaryCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.summaryIcon}>{icon}</Text>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      {subtitle ? <Text style={styles.summarySubtitle}>{subtitle}</Text> : null}
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const nav = useNavigation<any>();
  const { user, hasPermission } = useAuth();
  const { t } = useTranslation();
  const { unreadCount } = useInbox();
  const [refreshing, setRefreshing] = useState(false);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteColor, setNoteColor] = useState(DEFAULT_NOTE_COLOR);
  const [noteSaving, setNoteSaving] = useState(false);

  const load = async () => {
    const promises: Promise<void>[] = [];
    if (hasPermission("todos.view")) {
      promises.push(
        api
          .getTodos()
          .then((d) => setTodos(d ?? []))
          .catch(() => {}),
      );
    }
    if (hasPermission("shopping.view")) {
      promises.push(
        api
          .getLists()
          .then((d) => setLists(d ?? []))
          .catch(() => {}),
      );
    }
    if (hasPermission("events.view")) {
      promises.push(
        api
          .getEvents()
          .then((d) => setEvents(d ?? []))
          .catch(() => {}),
      );
    }
    if (hasPermission("dashboard.view")) {
      promises.push(
        api
          .getNotes()
          .then((d) => setNotes(d ?? []))
          .catch(() => {}),
      );
    }
    await Promise.all(promises);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const createNote = async () => {
    setNoteSaving(true);
    try {
      await api.createNote({
        title: noteTitle.trim() || t("notes.untitled", "Untitled"),
        content: noteContent,
        color: normalizeColor(noteColor),
      });
      setNoteTitle("");
      setNoteContent("");
      setNoteColor(DEFAULT_NOTE_COLOR);
      await load();
    } catch {
      // Keep existing draft if create fails.
    } finally {
      setNoteSaving(false);
    }
  };

  const pendingTodos = todos.filter((t) => !t.done).length;
  const activeEvents = events.length;
  const activeLists = lists.filter((l) => l.status !== "archived").length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.greeting}>
        {t("dashboard.hello", "Hello")}, {user?.firstName || user?.email} 👋
      </Text>

      <View style={styles.grid}>
        {hasPermission("todos.view") && (
          <SummaryCard
            icon="✅"
            title={t("nav.todos", "Todos")}
            value={pendingTodos}
            subtitle={t("dashboard.pending", "pending")}
            onPress={() => nav.navigate("TodosTab")}
          />
        )}
        {hasPermission("shopping.view") && (
          <SummaryCard
            icon="🛒"
            title={t("nav.shopping", "Shopping")}
            value={activeLists}
            subtitle={t("dashboard.activeLists", "active lists")}
            onPress={() => nav.navigate("ShoppingTab")}
          />
        )}
        {hasPermission("events.view") && (
          <SummaryCard
            icon="📅"
            title={t("nav.events", "Events")}
            value={activeEvents}
            subtitle={t("dashboard.events", "events")}
            onPress={() => nav.navigate("EventsTab")}
          />
        )}
        {hasPermission("dashboard.view") && (
          <SummaryCard
            icon="📝"
            title={t("nav.notes", "Notes")}
            value={notes.length}
            subtitle={t("dashboard.notes", "notes")}
            onPress={() => nav.navigate("MoreTab", { screen: "Notes" } as any)}
          />
        )}
        <SummaryCard
          icon="🔔"
          title={t("nav.inbox", "Inbox")}
          value={unreadCount}
          subtitle={t("dashboard.unread", "unread")}
          onPress={() => nav.navigate("MoreTab", { screen: "Inbox" } as any)}
        />
      </View>

      {hasPermission("dashboard.view") && (
        <View style={styles.notesHomePanel}>
          <View style={styles.notesHomeHeader}>
            <Text style={styles.notesHomeTitle}>{t("nav.notes", "Notes")}</Text>
            <View style={styles.notesHomeHeaderActions}>
              <TouchableOpacity
                onPress={() =>
                  nav.navigate("MoreTab", { screen: "Notes" } as any)
                }
              >
                <Text style={styles.notesHomeOpenAll}>
                  {t("common.viewAll", "View all")} →
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            style={styles.notesHomeInput}
            value={noteTitle}
            onChangeText={setNoteTitle}
            placeholder={t("notes.titlePlaceholder", "Note title…")}
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.notesHomeTextarea}
            value={noteContent}
            onChangeText={setNoteContent}
            placeholder={t("notes.placeholder", "Start writing…")}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.colorRow}>
            {NOTE_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setNoteColor(color)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  noteColor === color && styles.colorSwatchActive,
                ]}
              />
            ))}
            <TextInput
              style={styles.colorHexInput}
              value={noteColor}
              onChangeText={setNoteColor}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.notesHomeCreateBtn,
              !(noteContent.trim().length > 0) &&
                styles.notesHomeCreateBtnDisabled,
            ]}
            onPress={createNote}
            disabled={noteSaving || noteContent.trim().length === 0}
          >
            {noteSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.notesHomeCreateBtnText}>
                {t("notes.createFromDashboard", "Create note")}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.notesHomeList}>
            {(notes ?? []).slice(0, 5).map((note) => {
              const bg = normalizeColor(note.color);
              const textColor = getTextColorForBackground(bg);

              return (
                <TouchableOpacity
                  key={note.id}
                  style={styles.notesHomeListItem}
                  onPress={() =>
                    nav.navigate("MoreTab", {
                      screen: "Notes",
                      params: { noteId: note.id },
                    } as any)
                  }
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.notesHomeListTitle,
                      { backgroundColor: bg, color: textColor },
                    ]}
                    numberOfLines={1}
                  >
                    {note.title || t("notes.untitled", "Untitled")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xxl,
    marginTop: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  summaryCard: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  summaryIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize.xxxl,
    fontWeight: "700",
    color: colors.text,
  },
  summarySubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  notesHomePanel: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  notesHomeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  notesHomeHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  notesHomeTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
  },
  notesHomeOpenAll: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.primary,
  },
  notesHomeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    marginBottom: spacing.sm,
    fontSize: fontSize.md,
  },
  notesHomeTextarea: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  notesHomeCreateBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  notesHomeCreateBtnDisabled: {
    opacity: 0.45,
  },
  notesHomeCreateBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: fontSize.sm,
  },
  notesHomeList: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  notesHomeListItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  notesHomeListTitle: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    alignSelf: "flex-start",
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  colorSwatch: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorSwatchActive: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  colorHexInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minWidth: 90,
    color: colors.text,
    fontSize: fontSize.xs,
    backgroundColor: colors.surface,
  },
});
