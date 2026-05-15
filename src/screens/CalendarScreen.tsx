import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/TranslationContext";
import api from "../api/api";
import { colors, borderRadius, fontSize, spacing, shadows } from "../theme";
import type { AppEvent } from "../types";

export default function CalendarScreen() {
  const { hasPermission } = useAuth();
  const { t } = useTranslation();
  const canManageEvents = hasPermission("events.view");
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );

  // Create event modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createTime, setCreateTime] = useState("10:00");
  const [createDesc, setCreateDesc] = useState("");
  const [createSaving, setCreateSaving] = useState(false);

  const load = () =>
    api
      .getEvents()
      .then((data) => setEvents(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const markedDates = useMemo(() => {
    const marks: Record<
      string,
      {
        marked: boolean;
        dotColor: string;
        selected?: boolean;
        selectedColor?: string;
      }
    > = {};
    for (const ev of events) {
      if (ev.startAt) {
        const dateKey = ev.startAt.slice(0, 10);
        marks[dateKey] = { marked: true, dotColor: colors.primary };
      }
    }
    if (selectedDate) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        marked: marks[selectedDate]?.marked ?? false,
        dotColor: marks[selectedDate]?.dotColor ?? colors.primary,
        selected: true,
        selectedColor: colors.primary,
      };
    }
    return marks;
  }, [events, selectedDate]);

  const eventsForDate = useMemo(
    () => events.filter((e) => e.startAt?.slice(0, 10) === selectedDate),
    [events, selectedDate],
  );

  const openCreate = () => {
    setCreateTitle("");
    setCreateTime("10:00");
    setCreateDesc("");
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!createTitle.trim()) {
      Alert.alert("", t("events.titleRequired", "Title is required."));
      return;
    }
    setCreateSaving(true);
    try {
      const startAt = `${selectedDate}T${createTime}:00.000Z`;
      const created = await api.createEvent({
        title: createTitle.trim(),
        description: createDesc.trim(),
        startAt,
        endAt: null,
        location: null,
      });
      setEvents((prev) => [...prev, created]);
      setShowCreate(false);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create event",
      );
    } finally {
      setCreateSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Calendar
        markedDates={markedDates}
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        theme={{
          todayTextColor: colors.primary,
          arrowColor: colors.primary,
          selectedDayBackgroundColor: colors.primary,
          dotColor: colors.primary,
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 13,
        }}
      />

      <View style={styles.eventsList}>
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>
            {selectedDate
              ? format(new Date(selectedDate), "EEEE, d MMMM yyyy")
              : t("calendar.selectDate", "Select a date")}
          </Text>
          {canManageEvents && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={openCreate}
              accessibilityLabel={t("events.addEvent", "Add Event")}
            >
              <Text style={styles.addBtnText}>＋</Text>
            </TouchableOpacity>
          )}
        </View>

        {eventsForDate.length === 0 ? (
          <Text style={styles.empty}>
            {t("calendar.noEvents", "No events on this day")}
          </Text>
        ) : (
          eventsForDate.map((ev) => (
            <View key={ev.id} style={styles.eventRow}>
              <Text style={styles.eventTime}>
                {ev.startAt ? format(new Date(ev.startAt), "HH:mm") : ""}
              </Text>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{ev.title}</Text>
                {ev.description ? (
                  <Text style={styles.eventDesc} numberOfLines={1}>
                    {ev.description}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Create event modal */}
      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={modalStyles.overlay}
        >
          <TouchableOpacity
            style={modalStyles.backdrop}
            activeOpacity={1}
            onPress={() => setShowCreate(false)}
          />
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>
              {t("events.addEvent", "Add Event")}
            </Text>
            <Text style={modalStyles.subtitle}>
              {format(new Date(selectedDate), "EEEE, d MMMM yyyy")}
            </Text>
            <TextInput
              style={modalStyles.input}
              placeholder={t("events.title", "Title *")}
              placeholderTextColor={colors.textMuted}
              value={createTitle}
              onChangeText={setCreateTitle}
              autoFocus
            />
            <TextInput
              style={modalStyles.input}
              placeholder={t("events.time", "Time (HH:MM)")}
              placeholderTextColor={colors.textMuted}
              value={createTime}
              onChangeText={setCreateTime}
            />
            <TextInput
              style={[modalStyles.input, modalStyles.textarea]}
              placeholder={t("events.description", "Description (optional)")}
              placeholderTextColor={colors.textMuted}
              value={createDesc}
              onChangeText={setCreateDesc}
              multiline
              numberOfLines={3}
            />
            <View style={modalStyles.actions}>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.btnOutline]}
                onPress={() => setShowCreate(false)}
              >
                <Text style={modalStyles.btnOutlineText}>
                  {t("common.cancel", "Cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.btnPrimary]}
                onPress={handleCreate}
                disabled={createSaving}
              >
                <Text style={modalStyles.btnPrimaryText}>
                  {createSaving ? "…" : t("common.create", "Create")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

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
  eventsList: {
    flex: 1,
    padding: spacing.lg,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  dateLabel: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "700",
  },
  empty: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: "center",
    paddingVertical: spacing.xxl,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  eventTime: {
    width: 50,
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
  },
  eventDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xxl,
    paddingBottom: spacing.xxl + (Platform.OS === "ios" ? 20 : 0),
    ...shadows.lg,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  textarea: { height: 80, textAlignVertical: "top" },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  btn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  btnOutline: { borderWidth: 1, borderColor: colors.border },
  btnOutlineText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: fontSize.md,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: fontSize.md },
});
