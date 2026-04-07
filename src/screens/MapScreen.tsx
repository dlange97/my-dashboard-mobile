import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import api from '../api/api';
import { colors, borderRadius, fontSize, spacing, shadows } from '../theme';
import type { AppEvent, MapRoute, MapPoint } from '../types';

const INITIAL_REGION: Region = {
  latitude: 52.2297,
  longitude: 21.0122,
  latitudeDelta: 5,
  longitudeDelta: 5,
};

const ROUTE_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#dc2626'];

export default function MapScreen() {
  const { hasPermission } = useAuth();
  const { t } = useTranslation();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [routes, setRoutes] = useState<MapRoute[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

  useEffect(() => {
    const promises: Promise<void>[] = [];

    if (hasPermission('events.view')) {
      promises.push(api.getEvents().then((d) => setEvents(d ?? [])).catch(() => {}));
      promises.push(api.getMapPoints().then((d) => setPoints(d ?? [])).catch(() => {}));
    }
    if (hasPermission('map.view')) {
      promises.push(api.getRoutes().then((d) => setRoutes(d ?? [])).catch(() => {}));
    }

    Promise.all(promises).finally(() => setLoading(false));
  }, []);

  const eventsWithLocation = events.filter((e) => e.location?.lat && e.location?.lon);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={INITIAL_REGION} showsUserLocation>
        {/* Event markers */}
        {eventsWithLocation.map((ev) => (
          <Marker
            key={ev.id}
            coordinate={{
              latitude: ev.location!.lat,
              longitude: ev.location!.lon,
            }}
            title={ev.title}
            description={ev.location?.display_name?.split(',')[0]}
            onPress={() => setSelectedEvent(ev)}
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
            pinColor={colors.warning}
          />
        ))}

        {/* Routes */}
        {routes.map((route, index) => (
          <Polyline
            key={route.id}
            coordinates={route.coordinates.map((c) => ({
              latitude: c.lat,
              longitude: c.lng,
            }))}
            strokeColor={ROUTE_COLORS[index % ROUTE_COLORS.length]}
            strokeWidth={3}
          />
        ))}
      </MapView>

      {/* Event preview bottom sheet */}
      {selectedEvent && (
        <View style={styles.preview}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>{selectedEvent.title}</Text>
            <TouchableOpacity onPress={() => setSelectedEvent(null)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedEvent.description && (
            <Text style={styles.previewDesc} numberOfLines={2}>
              {selectedEvent.description}
            </Text>
          )}
          {selectedEvent.location?.display_name && (
            <Text style={styles.previewLocation}>
              📍 {selectedEvent.location.display_name}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  preview: {
    position: 'absolute',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
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
  previewLocation: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
