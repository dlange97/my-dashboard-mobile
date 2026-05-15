import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import MapView, { Marker, Polyline, type Region } from "react-native-maps";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/TranslationContext";
import api from "../api/api";
import { colors, borderRadius, fontSize, spacing, shadows } from "../theme";
import type { AppEvent, MapRoute, MapPoint } from "../types";

const INITIAL_REGION: Region = {
  latitude: 52.2297,
  longitude: 21.0122,
  latitudeDelta: 5,
  longitudeDelta: 5,
};

const ROUTE_COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#dc2626"];

// ── GeoJSON coordinate extractor ─────────────────────────────────────────────

function extractPolylineCoords(
  route: MapRoute,
): Array<{ latitude: number; longitude: number }> {
  const gj = route.geoJson as any;
  if (gj) {
    if (gj.type === "FeatureCollection" && Array.isArray(gj.features)) {
      const result: Array<{ latitude: number; longitude: number }> = [];
      for (const feature of gj.features) {
        if (
          feature?.geometry?.type === "LineString" &&
          Array.isArray(feature.geometry.coordinates)
        ) {
          for (const [lon, lat] of feature.geometry.coordinates) {
            if (typeof lat === "number" && typeof lon === "number") {
              result.push({ latitude: lat, longitude: lon });
            }
          }
        }
      }
      return result;
    }
    if (
      gj.type === "Feature" &&
      gj.geometry?.type === "LineString" &&
      Array.isArray(gj.geometry.coordinates)
    ) {
      return (gj.geometry.coordinates as [number, number][]).map(
        ([lon, lat]) => ({ latitude: lat, longitude: lon }),
      );
    }
    if (gj.type === "LineString" && Array.isArray(gj.coordinates)) {
      return (gj.coordinates as [number, number][]).map(([lon, lat]) => ({
        latitude: lat,
        longitude: lon,
      }));
    }
  }
  // Fallback: flat coordinates array (used in tests / legacy)
  return (route.coordinates ?? []).map((c) => ({
    latitude: c.lat,
    longitude: c.lng,
  }));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HintBanner({
  mode,
  onCancel,
}: {
  mode: "point" | "event";
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={hintStyles.banner}>
      <Text style={hintStyles.text}>
        {mode === "point"
          ? t("map.tapToAddPoint", "📌 Tap map to place a point")
          : t("map.tapToAddEvent", "➕ Tap map to add an event")}
      </Text>
      <TouchableOpacity onPress={onCancel}>
        <Text style={hintStyles.cancel}>{t("common.cancel", "Cancel")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const hintStyles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    zIndex: 20,
  },
  text: { color: "#fff", fontSize: fontSize.sm, fontWeight: "600", flex: 1 },
  cancel: {
    color: "#fff",
    fontSize: fontSize.sm,
    fontWeight: "700",
    marginLeft: spacing.md,
  },
});

// ── Map Point Form Modal ──────────────────────────────────────────────────────

interface PointFormState {
  id: string | null;
  name: string;
  description: string;
}

function PointFormModal({
  form,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  form: PointFormState;
  saving: boolean;
  onChange: (f: PointFormState) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={sheetStyles.overlay}
      >
        <TouchableOpacity
          style={sheetStyles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.title}>
            {form.id
              ? t("map.editPoint", "Edit Point")
              : t("map.addPoint", "Add Point")}
          </Text>
          <TextInput
            style={sheetStyles.input}
            placeholder={t("map.pointName", "Point name *")}
            placeholderTextColor={colors.textMuted}
            value={form.name}
            onChangeText={(v) => onChange({ ...form, name: v })}
            autoFocus
          />
          <TextInput
            style={[sheetStyles.input, sheetStyles.textarea]}
            placeholder={t("map.pointDesc", "Description (optional)")}
            placeholderTextColor={colors.textMuted}
            value={form.description}
            onChangeText={(v) => onChange({ ...form, description: v })}
            multiline
            numberOfLines={3}
          />
          <View style={sheetStyles.actions}>
            <TouchableOpacity
              style={[sheetStyles.btn, sheetStyles.btnOutline]}
              onPress={onClose}
            >
              <Text style={sheetStyles.btnOutlineText}>
                {t("common.cancel", "Cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sheetStyles.btn, sheetStyles.btnPrimary]}
              onPress={onSave}
              disabled={saving}
            >
              <Text style={sheetStyles.btnPrimaryText}>
                {saving ? "…" : t("common.save", "Save")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Create Event Form Modal ───────────────────────────────────────────────────

interface EventFormState {
  title: string;
  description: string;
  date: string;
  time: string;
}

function EventFormModal({
  form,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  form: EventFormState;
  saving: boolean;
  onChange: (f: EventFormState) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={sheetStyles.overlay}
      >
        <TouchableOpacity
          style={sheetStyles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.title}>
            {t("map.addEvent", "Add Event")}
          </Text>
          <TextInput
            style={sheetStyles.input}
            placeholder={t("events.title", "Title *")}
            placeholderTextColor={colors.textMuted}
            value={form.title}
            onChangeText={(v) => onChange({ ...form, title: v })}
            autoFocus
          />
          <TextInput
            style={sheetStyles.input}
            placeholder={t("events.date", "Date (YYYY-MM-DD)")}
            placeholderTextColor={colors.textMuted}
            value={form.date}
            onChangeText={(v) => onChange({ ...form, date: v })}
          />
          <TextInput
            style={sheetStyles.input}
            placeholder={t("events.time", "Time (HH:MM)")}
            placeholderTextColor={colors.textMuted}
            value={form.time}
            onChangeText={(v) => onChange({ ...form, time: v })}
          />
          <TextInput
            style={[sheetStyles.input, sheetStyles.textarea]}
            placeholder={t("events.description", "Description (optional)")}
            placeholderTextColor={colors.textMuted}
            value={form.description}
            onChangeText={(v) => onChange({ ...form, description: v })}
            multiline
            numberOfLines={3}
          />
          <View style={sheetStyles.actions}>
            <TouchableOpacity
              style={[sheetStyles.btn, sheetStyles.btnOutline]}
              onPress={onClose}
            >
              <Text style={sheetStyles.btnOutlineText}>
                {t("common.cancel", "Cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sheetStyles.btn, sheetStyles.btnPrimary]}
              onPress={onSave}
              disabled={saving}
            >
              <Text style={sheetStyles.btnPrimaryText}>
                {saving ? "…" : t("common.create", "Create")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
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
  textarea: {
    height: 80,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  btn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnOutlineText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: fontSize.md,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: fontSize.md,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MapScreen() {
  const { hasPermission } = useAuth();
  const { t } = useTranslation();
  const canManagePoints = hasPermission("events.view");
  const canManageEvents = hasPermission("events.view");

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [routes, setRoutes] = useState<MapRoute[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);

  // Add mode: null | 'point' | 'event'
  const [addMode, setAddMode] = useState<null | "point" | "event">(null);

  // Pending coordinate (where the user tapped)
  const [pendingCoord, setPendingCoord] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  // Forms
  const [pointForm, setPointForm] = useState<PointFormState | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    const promises: Promise<void>[] = [];
    if (hasPermission("events.view")) {
      promises.push(
        api
          .getEvents()
          .then((d) => setEvents(d ?? []))
          .catch(() => {}),
      );
      promises.push(
        api
          .getMapPoints()
          .then((d) => setPoints(d ?? []))
          .catch(() => {}),
      );
    }
    if (hasPermission("map.view") || hasPermission("events.view")) {
      promises.push(
        api
          .getRoutes()
          .then((d) => setRoutes(d ?? []))
          .catch(() => {}),
      );
    }
    Promise.all(promises).finally(() => setLoading(false));
  }, []);

  // ── Map press handler ────────────────────────────────────────────────────

  const handleMapPress = (e: any) => {
    if (!addMode) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const coord = { lat: latitude, lon: longitude };
    setPendingCoord(coord);
    setAddMode(null);
    if (addMode === "point") {
      setPointForm({ id: null, name: "", description: "" });
    } else {
      setEventForm({
        title: "",
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
        time: "10:00",
      });
    }
  };

  // ── Map point CRUD ───────────────────────────────────────────────────────

  const savePoint = async () => {
    if (!pointForm || !pendingCoord) return;
    if (!pointForm.name.trim()) {
      Alert.alert("", t("map.pointNameRequired", "Point name is required."));
      return;
    }
    setFormSaving(true);
    try {
      const payload = {
        name: pointForm.name.trim(),
        description: pointForm.description.trim(),
        lat: pendingCoord.lat,
        lon: pendingCoord.lon,
      };
      if (pointForm.id) {
        const updated = await api.updateMapPoint(pointForm.id, payload);
        setPoints((prev) =>
          prev.map((p) => (p.id === pointForm.id ? updated : p)),
        );
      } else {
        const created = await api.createMapPoint(payload);
        setPoints((prev) => [created, ...prev]);
      }
      setPointForm(null);
      setPendingCoord(null);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to save point",
      );
    } finally {
      setFormSaving(false);
    }
  };

  const deletePoint = async (point: MapPoint) => {
    try {
      await api.deleteMapPoint(point.id);
      setPoints((prev) => prev.filter((p) => p.id !== point.id));
      setSelectedPoint(null);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to delete point",
      );
    }
  };

  const openEditPoint = (point: MapPoint) => {
    setPendingCoord({ lat: point.lat, lon: point.lon });
    setPointForm({
      id: point.id,
      name: point.name,
      description: point.description ?? "",
    });
    setSelectedPoint(null);
  };

  const confirmDeletePoint = (point: MapPoint) => {
    Alert.alert(
      t("map.deletePoint", "Delete Point"),
      t(
        "map.deletePointConfirm",
        "Are you sure you want to delete this point?",
      ),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("common.delete", "Delete"),
          style: "destructive",
          onPress: () => deletePoint(point),
        },
      ],
    );
  };

  // ── Event creation from map ──────────────────────────────────────────────

  const saveEvent = async () => {
    if (!eventForm || !pendingCoord) return;
    if (!eventForm.title.trim()) {
      Alert.alert("", t("events.titleRequired", "Title is required."));
      return;
    }
    setFormSaving(true);
    try {
      const startAt = `${eventForm.date}T${eventForm.time}:00.000Z`;
      const created = await api.createEvent({
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        startAt,
        endAt: null,
        location: {
          lat: pendingCoord.lat,
          lon: pendingCoord.lon,
          display_name: `${pendingCoord.lat.toFixed(4)}, ${pendingCoord.lon.toFixed(4)}`,
        },
      });
      setEvents((prev) => [created, ...prev]);
      setEventForm(null);
      setPendingCoord(null);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create event",
      );
    } finally {
      setFormSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const eventsWithLocation = events.filter(
    (e) => e.location?.lat && e.location?.lon,
  );

  return (
    <View style={styles.container}>
      <MapView
        testID="map-view"
        style={styles.map}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        onPress={addMode ? handleMapPress : undefined}
      >
        {/* Event markers */}
        {eventsWithLocation.map((ev) => (
          <Marker
            key={ev.id}
            coordinate={{
              latitude: Number(ev.location!.lat),
              longitude: Number(ev.location!.lon),
            }}
            title={ev.title}
            description={ev.location?.display_name?.split(",")[0]}
            onPress={() => {
              setSelectedPoint(null);
              setSelectedEvent(ev);
            }}
            pinColor={colors.primary}
          />
        ))}

        {/* Map Points (POIs) */}
        {points.map((pt) => (
          <Marker
            key={`point-${pt.id}`}
            coordinate={{ latitude: pt.lat, longitude: pt.lon }}
            title={pt.name}
            description={pt.description}
            onPress={() => {
              setSelectedEvent(null);
              setSelectedPoint(pt);
            }}
            pinColor={colors.warning}
          />
        ))}

        {/* Routes */}
        {routes.map((route, index) => {
          const coords = extractPolylineCoords(route);
          if (coords.length < 2) return null;
          return (
            <Polyline
              testID="map-polyline"
              key={route.id}
              coordinates={coords}
              strokeColor={
                route.color ?? ROUTE_COLORS[index % ROUTE_COLORS.length]
              }
              strokeWidth={3}
            />
          );
        })}
      </MapView>

      {/* Hint banner (shown when in add mode) */}
      {addMode && (
        <HintBanner mode={addMode} onCancel={() => setAddMode(null)} />
      )}

      {/* Floating action buttons */}
      {(canManagePoints || canManageEvents) && !addMode && (
        <View style={styles.fab}>
          {canManagePoints && (
            <TouchableOpacity
              testID="fab-add-point"
              style={styles.fabBtn}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedEvent(null);
                setSelectedPoint(null);
                setAddMode("point");
              }}
              accessibilityLabel={t("map.addPoint", "Add Point")}
            >
              <Text style={styles.fabIcon}>📌</Text>
            </TouchableOpacity>
          )}
          {canManageEvents && (
            <TouchableOpacity
              testID="fab-add-event"
              style={styles.fabBtn}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedEvent(null);
                setSelectedPoint(null);
                setAddMode("event");
              }}
              accessibilityLabel={t("map.addEvent", "Add Event")}
            >
              <Text style={styles.fabIcon}>➕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Event preview sheet */}
      {selectedEvent && (
        <View style={styles.preview}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>{selectedEvent.title}</Text>
            <TouchableOpacity onPress={() => setSelectedEvent(null)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedEvent.description ? (
            <Text style={styles.previewDesc} numberOfLines={2}>
              {selectedEvent.description}
            </Text>
          ) : null}
          {selectedEvent.location?.display_name && (
            <Text style={styles.previewMeta}>
              📍 {selectedEvent.location.display_name}
            </Text>
          )}
          <Text style={styles.previewMeta}>
            📅 {format(new Date(selectedEvent.startAt), "d MMM yyyy, HH:mm")}
          </Text>
        </View>
      )}

      {/* Point preview sheet */}
      {selectedPoint && (
        <View style={styles.preview}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>📌 {selectedPoint.name}</Text>
            <TouchableOpacity onPress={() => setSelectedPoint(null)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedPoint.description ? (
            <Text style={styles.previewDesc}>{selectedPoint.description}</Text>
          ) : null}
          <Text style={styles.previewMeta}>
            {selectedPoint.lat.toFixed(5)}, {selectedPoint.lon.toFixed(5)}
          </Text>
          {canManagePoints && (
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.previewActionBtn}
                onPress={() => openEditPoint(selectedPoint)}
              >
                <Text style={styles.previewActionEdit}>
                  {t("common.edit", "Edit")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewActionBtn}
                onPress={() => confirmDeletePoint(selectedPoint)}
              >
                <Text style={styles.previewActionDelete}>
                  {t("common.delete", "Delete")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Point form modal */}
      {pointForm && (
        <PointFormModal
          form={pointForm}
          saving={formSaving}
          onChange={setPointForm}
          onSave={savePoint}
          onClose={() => {
            setPointForm(null);
            setPendingCoord(null);
          }}
        />
      )}

      {/* Event form modal */}
      {eventForm && (
        <EventFormModal
          form={eventForm}
          saving={formSaving}
          onChange={setEventForm}
          onSave={saveEvent}
          onClose={() => {
            setEventForm(null);
            setPendingCoord(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  map: { flex: 1 },
  fab: {
    position: "absolute",
    bottom: spacing.xxl,
    right: spacing.lg,
    gap: spacing.md,
  },
  fabBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.lg,
  },
  fabIcon: { fontSize: 22 },
  preview: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xxl,
    ...shadows.lg,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  closeBtn: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
    padding: spacing.sm,
  },
  previewDesc: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  previewMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  previewActions: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  previewActionBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewActionEdit: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: fontSize.sm,
  },
  previewActionDelete: {
    color: colors.danger,
    fontWeight: "600",
    fontSize: fontSize.sm,
  },
});
