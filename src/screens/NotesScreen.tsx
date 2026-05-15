import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/TranslationContext";
import api from "../api/api";
import { colors, spacing, fontSize, borderRadius, shadows } from "../theme";
import type { Note } from "../types";
import type { RouteProp } from "@react-navigation/native";
import type { MoreStackParamList } from "../navigation/types";

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

// Strip HTML tags for plain-text preview
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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

// ── Note List Item ──────────────────────────────────────────────────────

function NoteItem({
  note,
  active,
  compact,
  onPress,
}: {
  note: Note;
  active: boolean;
  compact: boolean;
  onPress: () => void;
}) {
  const preview = stripHtml(note.content ?? "");
  const color = normalizeColor(note.color);
  const titleColor = getTextColorForBackground(color);
  return (
    <TouchableOpacity
      style={[styles.noteItem, active && styles.noteItemActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.noteItemTitle,
          styles.noteItemTitleBadge,
          { backgroundColor: color, color: titleColor },
          active && styles.noteItemTitleActive,
        ]}
        numberOfLines={1}
      >
        {compact
          ? (note.title || "Untitled").slice(0, 10)
          : note.title || "Untitled"}
      </Text>
      {!compact && preview ? (
        <Text style={styles.noteItemPreview} numberOfLines={2}>
          {preview}
        </Text>
      ) : null}
      {!compact && (
        <Text style={styles.noteItemDate}>{formatDate(note.createdAt)}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────

export default function NotesScreen() {
  const route = useRoute<RouteProp<MoreStackParamList, "Notes">>();
  const { width } = useWindowDimensions();
  const isPhoneLayout = width < 860;
  const { hasPermission } = useAuth();
  const { t } = useTranslation();
  const canManage =
    hasPermission("notes.manage") || hasPermission("dashboard.view");

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  // Editor state
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftColor, setDraftColor] = useState(DEFAULT_NOTE_COLOR);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_NOTE_COLOR);

  // Track if editor has unsaved changes
  const dirtyRef = useRef(false);
  const activeIdRef = useRef<number | null>(null);
  const draftTitleRef = useRef("");
  const draftContentRef = useRef("");
  const draftColorRef = useRef(DEFAULT_NOTE_COLOR);

  // Keep refs in sync
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  useEffect(() => {
    draftTitleRef.current = draftTitle;
  }, [draftTitle]);
  useEffect(() => {
    draftContentRef.current = draftContent;
  }, [draftContent]);
  useEffect(() => {
    draftColorRef.current = draftColor;
  }, [draftColor]);

  // ── Load ────────────────────────────────────────────────────────────

  useEffect(() => {
    api
      .getNotes()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setNotes(list);
        if (route.params?.noteId != null) {
          const requested = list.find(
            (note) => note.id === route.params.noteId,
          );
          if (requested) {
            setActiveId(requested.id);
            return;
          }
        }
        if (list.length > 0) setActiveId(list[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [route.params?.noteId]);

  // ── Sync editor when active note changes ────────────────────────────

  useEffect(() => {
    const note = notes.find((n) => n.id === activeId) ?? null;
    const plain = stripHtml(note?.content ?? "");
    setDraftTitle(note?.title ?? "");
    setDraftContent(plain);
    setDraftColor(normalizeColor(note?.color));
    dirtyRef.current = false;
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (route.params?.noteId == null) return;
    const requested = notes.find((note) => note.id === route.params.noteId);
    if (!requested || requested.id === activeId) return;
    setActiveId(requested.id);
  }, [activeId, notes, route.params?.noteId]);

  // ── Auto-save ───────────────────────────────────────────────────────

  const flushSave = useCallback(async () => {
    if (!dirtyRef.current || !activeIdRef.current) return;
    const id = activeIdRef.current;
    const title =
      draftTitleRef.current.trim() || t("notes.untitled", "Untitled");
    const content = draftContentRef.current;
    setSaving(true);
    try {
      const updated = await api.updateNote(id, {
        title,
        content,
        color: normalizeColor(draftColorRef.current),
      });
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      dirtyRef.current = false;
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [t]);

  // Auto-save every 3 seconds when dirty
  useEffect(() => {
    const timer = setInterval(() => {
      if (dirtyRef.current) flushSave();
    }, 3000);
    return () => clearInterval(timer);
  }, [flushSave]);

  // ── Switch tab ──────────────────────────────────────────────────────

  const switchNote = useCallback(
    (id: number) => {
      void flushSave();
      Keyboard.dismiss();
      setActiveId(id);
    },
    [flushSave],
  );

  // ── Create ──────────────────────────────────────────────────────────

  const handleCreate = async () => {
    await flushSave();
    try {
      setCreating(true);
      const created = await api.createNote({
        title: newTitle.trim() || t("notes.untitled", "Untitled"),
        content: newContent,
        color: normalizeColor(newColor),
      });
      setNewTitle("");
      setNewContent("");
      setNewColor(DEFAULT_NOTE_COLOR);
      setNotes((prev) => [created, ...prev]);
      setActiveId(created.id);
      if (isPhoneLayout) {
        setShowCreateForm(false);
      }
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create note",
      );
    } finally {
      setCreating(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────

  const handleDelete = (note: Note) => {
    Alert.alert(
      t("common.confirmDelete", "Delete"),
      t("notes.confirmDelete", "Delete this note?"),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("common.delete", "Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteNote(note.id);
              const updated = notes.filter((n) => n.id !== note.id);
              setNotes(updated);
              if (activeId === note.id) {
                setActiveId(updated[0]?.id ?? null);
              }
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

  const activeNote = notes.find((n) => n.id === activeId) ?? null;

  // ── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("nav.notes", "Notes")}</Text>
        <View style={styles.headerRight}>
          {saving && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginRight: spacing.sm }}
            />
          )}
        </View>
      </View>

      <View style={[styles.body, isPhoneLayout && styles.bodyPhone]}>
        {/* Sidebar — note list */}
        <ScrollView
          horizontal={isPhoneLayout}
          style={[styles.sidebar, isPhoneLayout && styles.sidebarPhone]}
          contentContainerStyle={[
            styles.sidebarContent,
            isPhoneLayout && styles.sidebarContentPhone,
          ]}
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
        >
          {notes.length === 0 ? (
            <Text style={styles.empty}>
              {t("notes.empty", "No notes yet.")}
            </Text>
          ) : (
            notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                active={note.id === activeId}
                compact={isPhoneLayout}
                onPress={() => switchNote(note.id)}
              />
            ))
          )}
        </ScrollView>

        {/* Editor panel */}
        <View style={[styles.editor, isPhoneLayout && styles.editorPhone]}>
          {canManage && isPhoneLayout && (
            <TouchableOpacity
              onPress={() => setShowCreateForm((v) => !v)}
              style={styles.createToggleBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.createToggleBtnText}>
                {showCreateForm
                  ? t("common.cancel", "Cancel")
                  : t("notes.newNote", "New note")}
              </Text>
            </TouchableOpacity>
          )}

          {canManage && (!isPhoneLayout || showCreateForm) && (
            <View style={styles.createPanel}>
              <Text style={styles.createPanelTitle}>
                {t("notes.newNote", "New note")}
              </Text>
              <TextInput
                style={styles.createTitleInput}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder={t("notes.titlePlaceholder", "Note title…")}
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.createContentInput}
                value={newContent}
                onChangeText={setNewContent}
                placeholder={t("notes.placeholder", "Start writing…")}
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.colorRow}>
                {NOTE_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setNewColor(color)}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      newColor === color && styles.colorSwatchActive,
                    ]}
                  />
                ))}
                <TextInput
                  value={newColor}
                  onChangeText={setNewColor}
                  style={styles.colorHexInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <TouchableOpacity
                onPress={handleCreate}
                style={[
                  styles.createBtn,
                  !(newContent.trim().length > 0) && styles.createBtnDisabled,
                ]}
                disabled={creating || newContent.trim().length === 0}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createBtnText}>
                    {t("notes.createFromDashboard", "Create note")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {activeNote ? (
            <>
              <View style={styles.editorHeader}>
                <TextInput
                  style={styles.titleInput}
                  value={draftTitle}
                  onChangeText={(v) => {
                    setDraftTitle(v);
                    dirtyRef.current = true;
                  }}
                  placeholder={t("notes.untitled", "Untitled")}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="next"
                />
                {canManage && (
                  <TouchableOpacity onPress={() => handleDelete(activeNote)}>
                    <Text style={styles.deleteIcon}>🗑</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.editorDate}>
                {formatDate(activeNote.createdAt)}
              </Text>
              <TextInput
                style={styles.contentInput}
                value={draftContent}
                onChangeText={(v) => {
                  setDraftContent(v);
                  dirtyRef.current = true;
                }}
                placeholder={t("notes.placeholder", "Start writing…")}
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.colorRow}>
                {NOTE_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => {
                      setDraftColor(color);
                      dirtyRef.current = true;
                    }}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      draftColor === color && styles.colorSwatchActive,
                    ]}
                  />
                ))}
                <TextInput
                  value={draftColor}
                  onChangeText={(value) => {
                    setDraftColor(value);
                    dirtyRef.current = true;
                  }}
                  style={styles.colorHexInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {canManage && dirtyRef.current && (
                <TouchableOpacity style={styles.saveBtn} onPress={flushSave}>
                  <Text style={styles.saveBtnText}>
                    {t("common.save", "Save")}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.noNote}>
              <Text style={styles.noNoteIcon}>📝</Text>
              <Text style={styles.noNoteText}>
                {notes.length === 0
                  ? t("notes.createFirst", "Create your first note above")
                  : t("notes.selectNote", "Select a note to view")}
              </Text>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const SIDEBAR_W = 124;
const SIDEBAR_COLLAPSED_W = 74;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  listToggleBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  listToggleBtnText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnText: {
    color: "#fff",
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "700",
  },
  body: {
    flex: 1,
    flexDirection: "row",
  },
  bodyPhone: {
    flexDirection: "column",
  },
  // ── Sidebar ──
  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  sidebarCollapsed: {
    width: SIDEBAR_COLLAPSED_W,
  },
  sidebarPhone: {
    width: "100%",
    height: 72,
    flexGrow: 0,
    flexShrink: 0,
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  sidebarContent: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  sidebarContentPhone: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: "center",
    gap: spacing.xs,
  },
  empty: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: "center",
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.sm,
  },
  noteItem: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    minWidth: 96,
  },
  noteItemActive: {
    backgroundColor: `${colors.primary}18`,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  noteItemTitle: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginBottom: 2,
  },
  noteItemTitleBadge: {
    alignSelf: "flex-start",
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    maxWidth: "100%",
  },
  noteItemTitleActive: {
    opacity: 1,
  },
  noteItemPreview: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  noteItemDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  // ── Editor ──
  editor: {
    flex: 1,
    padding: spacing.lg,
  },
  editorPhone: {
    width: "100%",
    padding: spacing.md,
  },
  createPanel: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  createToggleBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  createToggleBtnText: {
    color: "#fff",
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  createPanelTitle: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  createTitleInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
  },
  createContentInput: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  createBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  createBtnDisabled: {
    opacity: 0.45,
  },
  createBtnText: {
    color: "#fff",
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  titleInput: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    padding: 0,
  },
  deleteIcon: {
    fontSize: 20,
    color: colors.danger,
  },
  editorDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  contentInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 24,
    textAlignVertical: "top",
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  colorSwatch: {
    width: 24,
    height: 24,
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
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: "flex-end",
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: fontSize.sm,
  },
  // ── Empty ──
  noNote: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  noNoteIcon: {
    fontSize: 48,
  },
  noNoteText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
});
