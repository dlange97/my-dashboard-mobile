import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/TranslationContext";
import api from "../api/api";
import { Button, Pagination, ShareUserModal } from "../components/ui";
import { colors, borderRadius, fontSize, spacing, shadows } from "../theme";
import type { AppEvent } from "../types";

const DEFAULT_PICKER_REGION: Region = {
  latitude: 52.2297,
  longitude: 21.0122,
  latitudeDelta: 4,
  longitudeDelta: 4,
};

function parseLatLon(latRaw: unknown, lonRaw: unknown) {
  const lat = Number(
    String(latRaw ?? "")
      .trim()
      .replace(",", "."),
  );
  const lon = Number(
    String(lonRaw ?? "")
      .trim()
      .replace(",", "."),
  );
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

// ── Event Detail Modal ──────────────────────────────────────────────────

function EventDetailModal({
  event,
  visible,
  onClose,
  onEdit,
  canManage,
}: {
  event: AppEvent | null;
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  canManage: boolean;
}) {
  const { t } = useTranslation();
  if (!event) return null;

  const parsedLocation = parseLatLon(event.location?.lat, event.location?.lon);
  const hasLocation = parsedLocation != null;
  const lat = parsedLocation?.lat ?? null;
  const lon = parsedLocation?.lon ?? null;

  const openMaps = () => {
    if (!parsedLocation) return;
    const lat = parsedLocation.lat;
    const lon = parsedLocation.lon;
    const label = encodeURIComponent(event.title);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lon}`,
      android: `geo:${lat},${lon}?q=${lat},${lon}(${label})`,
    });
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={detailStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={detailStyles.sheet} onStartShouldSetResponder={() => true}>
          {/* handle */}
          <View style={detailStyles.handle} />

          {/* Title row */}
          <View style={detailStyles.titleRow}>
            <View style={detailStyles.dot} />
            <Text style={detailStyles.title} numberOfLines={2}>
              {event.title}
            </Text>
          </View>

          {/* Date */}
          <View style={detailStyles.row}>
            <Text style={detailStyles.rowIcon}>🕐</Text>
            <View>
              <Text style={detailStyles.rowLabel}>
                {t("events.previewStart", "Start")}
              </Text>
              <Text style={detailStyles.rowValue}>
                {format(new Date(event.startAt), "d MMM yyyy, HH:mm")}
              </Text>
            </View>
          </View>

          {event.endAt && (
            <View style={detailStyles.row}>
              <Text style={detailStyles.rowIcon}>🏁</Text>
              <View>
                <Text style={detailStyles.rowLabel}>
                  {t("events.previewEnd", "End")}
                </Text>
                <Text style={detailStyles.rowValue}>
                  {format(new Date(event.endAt), "d MMM yyyy, HH:mm")}
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          {!!event.description && (
            <View style={detailStyles.row}>
              <Text style={detailStyles.rowIcon}>📝</Text>
              <View style={{ flex: 1 }}>
                <Text style={detailStyles.rowLabel}>
                  {t("events.form.descriptionLabel", "Description")}
                </Text>
                <Text style={detailStyles.rowValue}>{event.description}</Text>
              </View>
            </View>
          )}

          {/* Location */}
          {(hasLocation || event.location?.display_name) && (
            <View style={[detailStyles.row, detailStyles.locationRow]}>
              <Text style={detailStyles.rowIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={detailStyles.rowLabel}>
                  {t("events.previewLocation", "Location")}
                </Text>
                <Text
                  style={[
                    detailStyles.rowValue,
                    hasLocation && detailStyles.locationLink,
                  ]}
                >
                  {event.location?.display_name ??
                    `${Number(event.location!.lat).toFixed(5)}, ${Number(event.location!.lon).toFixed(5)}`}
                </Text>

                {hasLocation && lat != null && lon != null && (
                  <TouchableOpacity
                    onPress={openMaps}
                    activeOpacity={0.85}
                    style={detailStyles.mapPreview}
                  >
                    <MapView
                      style={StyleSheet.absoluteFillObject}
                      pointerEvents="none"
                      initialRegion={{
                        latitude: lat,
                        longitude: lon,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      rotateEnabled={false}
                      pitchEnabled={false}
                      toolbarEnabled={false}
                    >
                      <Marker coordinate={{ latitude: lat, longitude: lon }} />
                    </MapView>
                    <Text style={detailStyles.openMapsHint}>
                      {t("events.openInMaps", "Tap to open in Maps")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={detailStyles.actions}>
            <Button
              title={t("common.close", "Close")}
              variant="secondary"
              onPress={onClose}
            />
            {canManage && (
              <Button title={t("common.edit", "Edit")} onPress={onEdit} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xxl,
    paddingTop: spacing.md,
    ...shadows.lg,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 99,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 99,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  rowIcon: {
    fontSize: 18,
    marginTop: 2,
    width: 24,
    textAlign: "center",
  },
  rowLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: "500",
  },
  locationRow: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginLeft: -spacing.sm,
  },
  locationLink: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
  openMapsHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  mapPreview: {
    marginTop: spacing.sm,
    height: 130,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: "flex-end",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});

// ── Event Form Modal ────────────────────────────────────────────────────

function EventFormModal({
  visible,
  initial,
  onSave,
  onCancel,
}: {
  visible: boolean;
  initial?: AppEvent | null;
  onSave: (data: Partial<AppEvent>) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationLat, setLocationLat] = useState("");
  const [locationLon, setLocationLon] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [pickedRegion, setPickedRegion] = useState<Region | null>(null);
  const [pickedLat, setPickedLat] = useState<number | null>(null);
  const [pickedLon, setPickedLon] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title ?? "");
      setDescription(initial.description ?? "");
      setStartDate(initial.startAt?.slice(0, 10) ?? "");
      setStartTime(initial.startAt?.slice(11, 16) ?? "");
      setEndDate(initial.endAt?.slice(0, 10) ?? "");
      setEndTime(initial.endAt?.slice(11, 16) ?? "");
      setLocationName(initial.location?.display_name ?? "");
      setLocationLat(
        initial.location?.lat != null ? String(initial.location.lat) : "",
      );
      setLocationLon(
        initial.location?.lon != null ? String(initial.location.lon) : "",
      );
      const initialCoords = parseLatLon(
        initial.location?.lat,
        initial.location?.lon,
      );
      if (initialCoords) {
        const lat = initialCoords.lat;
        const lon = initialCoords.lon;
        setPickedLat(lat);
        setPickedLon(lon);
        setPickedRegion({
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        });
      } else {
        setPickedLat(null);
        setPickedLon(null);
        setPickedRegion(DEFAULT_PICKER_REGION);
      }
    } else {
      setTitle("");
      setDescription("");
      setStartDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      setLocationName("");
      setLocationLat("");
      setLocationLon("");
      setPickedLat(null);
      setPickedLon(null);
      setPickedRegion(DEFAULT_PICKER_REGION);
    }
    setGeocoding(false);
    setPickerVisible(false);
  }, [initial, visible]);

  useEffect(() => {
    const raw = locationName.trim();
    if (raw.length < 3) return;

    const timeout = setTimeout(async () => {
      try {
        setGeocoding(true);
        const query = encodeURIComponent(raw);
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`;
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "my-dashboard-mobile",
          },
        });
        const data: Array<{ lat: string; lon: string; display_name?: string }> =
          await res.json();
        if (!Array.isArray(data) || data.length === 0) return;

        const lat = Number(data[0].lat);
        const lon = Number(data[0].lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        setLocationLat(String(lat));
        setLocationLon(String(lon));
        setPickedLat(lat);
        setPickedLon(lon);
        setPickedRegion({
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        });
      } catch {
        // silent geocode failure
      } finally {
        setGeocoding(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [locationName]);

  const openMapPicker = () => {
    const coords = parseLatLon(locationLat, locationLon);

    if (coords) {
      setPickedLat(coords.lat);
      setPickedLon(coords.lon);
      setPickedRegion({
        latitude: coords.lat,
        longitude: coords.lon,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      });
    } else if (!pickedRegion) {
      setPickedRegion(DEFAULT_PICKER_REGION);
    }
    setPickerVisible(true);
  };

  const confirmPickedLocation = () => {
    if (pickedLat == null || pickedLon == null) {
      Alert.alert(
        t("common.validation", "Validation"),
        t("events.form.tapMapFirst", "Tap on the map to choose location."),
      );
      return;
    }
    setLocationLat(String(pickedLat));
    setLocationLon(String(pickedLon));
    setPickerVisible(false);
  };

  const handleSave = () => {
    if (!title.trim() || !startDate) return;
    const latRaw = locationLat.trim().replace(",", ".");
    const lonRaw = locationLon.trim().replace(",", ".");
    const hasAnyCoord = latRaw.length > 0 || lonRaw.length > 0;

    if ((latRaw && !lonRaw) || (!latRaw && lonRaw)) {
      Alert.alert(
        t("common.validation", "Validation"),
        t(
          "events.form.locationCoordsPair",
          "Provide both latitude and longitude.",
        ),
      );
      return;
    }

    let location: AppEvent["location"] | null = null;
    if (hasAnyCoord) {
      const coords = parseLatLon(latRaw, lonRaw);
      if (!coords) {
        Alert.alert(
          t("common.validation", "Validation"),
          t(
            "events.form.locationCoordsInvalid",
            "Latitude must be between -90 and 90, and longitude between -180 and 180.",
          ),
        );
        return;
      }
      location = {
        lat: coords.lat,
        lon: coords.lon,
        ...(locationName.trim() ? { display_name: locationName.trim() } : {}),
      };
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      startAt: startDate + (startTime ? `T${startTime}:00` : "T00:00:00"),
      endAt: endDate
        ? endDate + (endTime ? `T${endTime}:00` : "T23:59:00")
        : null,
      location,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={formStyles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <ScrollView
          contentContainerStyle={formStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={formStyles.card} onStartShouldSetResponder={() => true}>
            <Text style={formStyles.heading}>
              {initial
                ? t("events.form.editTitle", "Edit Event")
                : t("events.form.createTitle", "New Event")}
            </Text>

            <Text style={formStyles.label}>
              {t("events.form.titleLabel", "Title *")}
            </Text>
            <TextInput
              style={formStyles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t("events.form.titlePlaceholder", "Event title")}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <Text style={formStyles.label}>
              {t("events.form.descriptionLabel", "Description")}
            </Text>
            <TextInput
              style={[formStyles.input, { minHeight: 60 }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t(
                "events.form.descriptionPlaceholder",
                "Optional details…",
              )}
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <View style={formStyles.row}>
              <View style={formStyles.halfField}>
                <Text style={formStyles.label}>
                  {t("events.form.startDateLabel", "Start Date *")}
                </Text>
                <TextInput
                  style={formStyles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={formStyles.halfField}>
                <Text style={formStyles.label}>
                  {t("events.form.startTimeLabel", "Start Time")}
                </Text>
                <TextInput
                  style={formStyles.input}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <Text style={formStyles.label}>
              {t("events.form.locationNameLabel", "Location name")}
            </Text>
            <TextInput
              style={formStyles.input}
              value={locationName}
              onChangeText={setLocationName}
              placeholder={t(
                "events.form.locationNamePlaceholder",
                "e.g. Main Square",
              )}
              placeholderTextColor={colors.textMuted}
            />
            <View style={formStyles.locationActionsRow}>
              <TouchableOpacity
                style={formStyles.mapPickBtn}
                activeOpacity={0.8}
                onPress={openMapPicker}
              >
                <Text style={formStyles.mapPickBtnText}>
                  {t("events.form.pickFromMap", "Pick from map")}
                </Text>
              </TouchableOpacity>
              {geocoding && (
                <View style={formStyles.geocodeIndicator}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={formStyles.geocodeText}>
                    {t("events.form.findingLocation", "Finding location…")}
                  </Text>
                </View>
              )}
            </View>

            <View style={formStyles.row}>
              <View style={formStyles.halfField}>
                <Text style={formStyles.label}>
                  {t("events.form.latitudeLabel", "Latitude")}
                </Text>
                <TextInput
                  style={formStyles.input}
                  value={locationLat}
                  onChangeText={setLocationLat}
                  placeholder="52.2297"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={formStyles.halfField}>
                <Text style={formStyles.label}>
                  {t("events.form.longitudeLabel", "Longitude")}
                </Text>
                <TextInput
                  style={formStyles.input}
                  value={locationLon}
                  onChangeText={setLocationLon}
                  placeholder="21.0122"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={formStyles.row}>
              <View style={formStyles.halfField}>
                <Text style={formStyles.label}>
                  {t("events.form.endDateLabel", "End Date")}
                </Text>
                <TextInput
                  style={formStyles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={formStyles.halfField}>
                <Text style={formStyles.label}>
                  {t("events.form.endTimeLabel", "End Time")}
                </Text>
                <TextInput
                  style={formStyles.input}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={formStyles.actions}>
              <Button
                title={t("common.cancel", "Cancel")}
                variant="secondary"
                onPress={onCancel}
              />
              <Button
                title={
                  initial
                    ? t("events.form.saveChanges", "Save Changes")
                    : t("events.add", "Add Event")
                }
                onPress={handleSave}
              />
            </View>
          </View>
        </ScrollView>
      </TouchableOpacity>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={pickerStyles.overlay}>
          <View style={pickerStyles.sheet}>
            <Text style={pickerStyles.title}>
              {t("events.form.pickFromMap", "Pick from map")}
            </Text>
            <Text style={pickerStyles.subtitle}>
              {t(
                "events.form.mapPickHint",
                "Tap on the map to choose event location.",
              )}
            </Text>

            {pickedRegion && (
              <MapView
                style={pickerStyles.map}
                initialRegion={pickedRegion}
                onPress={(ev) => {
                  setPickedLat(ev.nativeEvent.coordinate.latitude);
                  setPickedLon(ev.nativeEvent.coordinate.longitude);
                }}
              >
                {pickedLat != null && pickedLon != null && (
                  <Marker
                    coordinate={{ latitude: pickedLat, longitude: pickedLon }}
                  />
                )}
              </MapView>
            )}

            <View style={pickerStyles.coordsRow}>
              <Text style={pickerStyles.coordsText}>
                {pickedLat != null && pickedLon != null
                  ? `${pickedLat.toFixed(5)}, ${pickedLon.toFixed(5)}`
                  : t("events.form.noLocationPicked", "No point selected")}
              </Text>
            </View>

            <View style={pickerStyles.actions}>
              <Button
                title={t("common.cancel", "Cancel")}
                variant="secondary"
                onPress={() => setPickerVisible(false)}
              />
              <Button
                title={t("common.apply", "Apply")}
                onPress={confirmPickedLocation}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const formStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xxl,
    ...shadows.lg,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  locationActionsRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  mapPickBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  mapPickBtnText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: fontSize.sm,
  },
  geocodeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  geocodeText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  map: {
    height: 260,
    borderRadius: borderRadius.md,
  },
  coordsRow: {
    marginTop: spacing.xs,
  },
  coordsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});

// ── Events List Screen ──────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function EventsScreen() {
  const { user, hasPermission } = useAuth();
  const { t } = useTranslation();
  const canManage = hasPermission("events.manage");
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  // Form
  const [formVisible, setFormVisible] = useState(false);
  const [editEvent, setEditEvent] = useState<AppEvent | null>(null);

  // Detail preview
  const [detailEvent, setDetailEvent] = useState<AppEvent | null>(null);

  // Share
  const [shareTarget, setShareTarget] = useState<AppEvent | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getEvents();
      setEvents(data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleSave = async (data: Partial<AppEvent>) => {
    try {
      if (editEvent) {
        const updated = await api.updateEvent(editEvent.id, data);
        setEvents((prev) =>
          prev.map((e) => (e.id === updated.id ? updated : e)),
        );
      } else {
        const created = await api.createEvent(data);
        setEvents((prev) => [...prev, created]);
      }
      setFormVisible(false);
      setEditEvent(null);
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    }
  };

  const handleDelete = (event: AppEvent) => {
    Alert.alert(
      t("common.confirmDelete", "Delete"),
      t("events.confirmDelete", "Delete this event?"),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("common.delete", "Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteEvent(event.id);
              setEvents((prev) => prev.filter((e) => e.id !== event.id));
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
      const updated = await api.shareEvent(shareTarget.id, selectedUser.id);
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setShareTarget(null);
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to share",
      );
    }
  };

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const paged = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const renderItem = ({ item }: { item: AppEvent }) => {
    const startDate = item.startAt ? new Date(item.startAt) : null;
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => setDetailEvent(item)}
        activeOpacity={0.75}
      >
        <View style={styles.eventLeft}>
          {startDate && (
            <View style={styles.dateBadge}>
              <Text style={styles.dateDay}>{format(startDate, "d")}</Text>
              <Text style={styles.dateMonth}>{format(startDate, "MMM")}</Text>
            </View>
          )}
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <View style={styles.eventMeta}>
              {item.startAt && (
                <Text style={styles.metaText}>
                  🕐 {format(new Date(item.startAt), "HH:mm")}
                  {item.endAt && ` – ${format(new Date(item.endAt), "HH:mm")}`}
                </Text>
              )}
              {item.location?.display_name && (
                <Text style={styles.metaText} numberOfLines={1}>
                  📍 {item.location.display_name.split(",")[0]}
                </Text>
              )}
            </View>
            {item.description ? (
              <Text style={styles.eventDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </View>
        {canManage && (
          <View style={styles.eventActions}>
            {item.ownerId === user?.id && (
              <TouchableOpacity onPress={() => setShareTarget(item)}>
                <Text style={styles.actionIcon}>👥</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                setEditEvent(item);
                setFormVisible(true);
              }}
            >
              <Text style={styles.actionIcon}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Text style={styles.actionIcon}>🗑</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("nav.events", "Events")}</Text>
      </View>

      {canManage && (
        <TouchableOpacity
          style={styles.addBtnRow}
          onPress={() => {
            setEditEvent(null);
            setFormVisible(true);
          }}
        >
          <Text style={styles.addBtnText}>
            ＋ {t("events.add", "Add Event")}
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={paged}
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
              {t("events.empty", "No events")}
            </Text>
          )
        }
        ListFooterComponent={
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        }
      />

      <EventDetailModal
        event={detailEvent}
        visible={!!detailEvent}
        onClose={() => setDetailEvent(null)}
        canManage={canManage}
        onEdit={() => {
          setEditEvent(detailEvent);
          setDetailEvent(null);
          setFormVisible(true);
        }}
      />

      <EventFormModal
        visible={formVisible}
        initial={editEvent}
        onSave={handleSave}
        onCancel={() => {
          setFormVisible(false);
          setEditEvent(null);
        }}
      />

      <ShareUserModal
        visible={!!shareTarget}
        title={t("events.shareTitle", "Share event")}
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
  headerTitle: {
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
  listContent: {
    padding: spacing.lg,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  eventLeft: {
    flexDirection: "row",
    flex: 1,
  },
  dateBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  dateDay: {
    color: colors.textInverse,
    fontWeight: "700",
    fontSize: fontSize.lg,
    lineHeight: 20,
  },
  dateMonth: {
    color: colors.textInverse,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
  },
  eventMeta: {
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  eventDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  eventActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionIcon: {
    fontSize: 18,
  },
  statusText: {
    textAlign: "center",
    color: colors.textMuted,
    paddingVertical: spacing.xxl,
    fontSize: fontSize.md,
  },
});
