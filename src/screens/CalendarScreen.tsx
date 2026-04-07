import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import api from '../api/api';
import { colors, borderRadius, fontSize, spacing } from '../theme';
import type { AppEvent } from '../types';

export default function CalendarScreen() {
  const { hasPermission } = useAuth();
  const { t } = useTranslation();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd'),
  );

  useEffect(() => {
    api
      .getEvents()
      .then((data) => setEvents(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markedDates = useMemo(() => {
    const marks: Record<string, { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string }> = {};
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
        <Text style={styles.dateLabel}>
          {selectedDate
            ? format(new Date(selectedDate), 'EEEE, d MMMM yyyy')
            : t('calendar.selectDate', 'Select a date')}
        </Text>

        {eventsForDate.length === 0 ? (
          <Text style={styles.empty}>
            {t('calendar.noEvents', 'No events on this day')}
          </Text>
        ) : (
          eventsForDate.map((ev) => (
            <View key={ev.id} style={styles.eventRow}>
              <Text style={styles.eventTime}>
                {ev.startAt ? format(new Date(ev.startAt), 'HH:mm') : ''}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventsList: {
    flex: 1,
    padding: spacing.lg,
  },
  dateLabel: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  empty: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  eventTime: {
    width: 50,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  eventDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
