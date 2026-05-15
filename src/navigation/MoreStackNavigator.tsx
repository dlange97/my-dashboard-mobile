import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { useInbox } from "../context/InboxContext";
import { useTranslation } from "../context/TranslationContext";
import { colors, spacing, fontSize, borderRadius, shadows } from "../theme";
import type { MoreStackParamList } from "./types";

import CalendarScreen from "../screens/CalendarScreen";
import MapScreen from "../screens/MapScreen";
import InboxScreen from "../screens/InboxScreen";
import NotesScreen from "../screens/NotesScreen";
import UserManagementScreen from "../screens/UserManagementScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator<MoreStackParamList>();

function HeaderBackButton({
  navigation,
}: {
  navigation: NativeStackNavigationProp<MoreStackParamList>;
}) {
  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={headerStyles.backButton}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={headerStyles.backButtonText}>‹</Text>
    </TouchableOpacity>
  );
}

/* ─── More Hub Menu ─── */
function MoreMenuScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { hasPermission } = useAuth();
  const { unreadCount } = useInbox();
  const { t } = useTranslation();

  const items: Array<{
    key: keyof MoreStackParamList;
    icon: string;
    label: string;
    permission?: string;
    badge?: number;
  }> = [
    { key: "Profile", icon: "👤", label: t("nav.profile", "Profile") },
    {
      key: "Notes",
      icon: "📝",
      label: t("nav.notes", "Notes"),
      permission: "dashboard.view",
    },
    {
      key: "Calendar",
      icon: "📅",
      label: t("nav.calendar", "Calendar"),
      permission: "events.view",
    },
    {
      key: "Map",
      icon: "🗺️",
      label: t("nav.map", "Map"),
      permission: "map.view",
    },
    {
      key: "Inbox",
      icon: "📬",
      label: t("nav.inbox", "Inbox"),
      badge: unreadCount,
    },
    {
      key: "Users",
      icon: "👥",
      label: t("nav.users", "Users"),
      permission: "users.view",
    },
    {
      key: "Settings",
      icon: "⚙️",
      label: t("nav.settings", "Settings"),
      permission: "settings.view",
    },
  ];

  const visible = items.filter(
    (i) => !i.permission || hasPermission(i.permission),
  );

  return (
    <ScrollView
      style={menuStyles.container}
      contentContainerStyle={menuStyles.content}
    >
      <Text style={menuStyles.heading}>{t("nav.more", "More")}</Text>
      {visible.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={menuStyles.row}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(item.key as any)}
        >
          <Text style={menuStyles.icon}>{item.icon}</Text>
          <Text style={menuStyles.label}>{item.label}</Text>
          {item.badge != null && item.badge > 0 && (
            <View style={menuStyles.badge}>
              <Text style={menuStyles.badgeText}>{item.badge}</Text>
            </View>
          )}
          <Text style={menuStyles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const menuStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  heading: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  icon: { fontSize: 24, marginRight: spacing.md },
  label: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: borderRadius.full,
    minWidth: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginRight: spacing.sm,
  },
  badgeText: { color: "#fff", fontSize: fontSize.xs, fontWeight: "700" },
  chevron: { fontSize: fontSize.xl, color: colors.textMuted },
});

/* ─── Stack Navigator ─── */
export default function MoreStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerShadowVisible: false,
        headerTitleStyle: headerStyles.title,
        headerStyle: headerStyles.header,
        headerTintColor: colors.text,
        headerLeft: () => <HeaderBackButton navigation={navigation as any} />,
      })}
    >
      <Stack.Screen
        name="MoreMenu"
        component={MoreMenuScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: "Calendar" }}
      />
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={{ title: "Map" }}
      />
      <Stack.Screen
        name="Notes"
        component={NotesScreen}
        options={{ title: "Notes" }}
      />
      <Stack.Screen
        name="Inbox"
        component={InboxScreen}
        options={{ title: "Inbox" }}
      />
      <Stack.Screen
        name="Users"
        component={UserManagementScreen}
        options={{ title: "Users" }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </Stack.Navigator>
  );
}

const headerStyles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "800",
    color: colors.text,
  },
  backButton: {
    marginLeft: -4,
    marginRight: 4,
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  backButtonText: {
    fontSize: 28,
    lineHeight: 28,
    color: colors.text,
    marginTop: -2,
  },
});
