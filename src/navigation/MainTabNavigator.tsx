import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { useInbox } from "../context/InboxContext";
import { useTranslation } from "../context/TranslationContext";
import { colors, fontSize } from "../theme";
import type { MainTabParamList } from "./types";

import DashboardScreen from "../screens/DashboardScreen";
import TodosScreen from "../screens/TodosScreen";
import EventsScreen from "../screens/EventsScreen";
import ShoppingStackNavigator from "./ShoppingStackNavigator";
import MoreStackNavigator from "./MoreStackNavigator";

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const color = focused ? colors.primary : colors.textMuted;
  return <Text style={{ fontSize: 22, color }}>{label}</Text>;
}

export default function MainTabNavigator() {
  const { hasPermission } = useAuth();
  const { unreadCount } = useInbox();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: "600" },
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarItemStyle: { paddingTop: 4 },
      }}
    >
      {hasPermission("dashboard.view") && (
        <Tab.Screen
          name="DashboardTab"
          component={DashboardScreen}
          options={{
            tabBarLabel: t("nav.dashboard", "Home"),
            tabBarIcon: ({ focused }) => (
              <TabIcon label="🏠" focused={focused} />
            ),
          }}
        />
      )}

      {hasPermission("todos.view") && (
        <Tab.Screen
          name="TodosTab"
          component={TodosScreen}
          options={{
            tabBarLabel: t("nav.todos", "Todos"),
            tabBarIcon: ({ focused }) => (
              <TabIcon label="✅" focused={focused} />
            ),
          }}
        />
      )}

      {hasPermission("shopping.view") && (
        <Tab.Screen
          name="ShoppingTab"
          component={ShoppingStackNavigator}
          options={{
            tabBarLabel: t("nav.shopping", "Shopping"),
            tabBarIcon: ({ focused }) => (
              <TabIcon label="🛒" focused={focused} />
            ),
          }}
        />
      )}

      {hasPermission("events.view") && (
        <Tab.Screen
          name="EventsTab"
          component={EventsScreen}
          options={{
            tabBarLabel: t("nav.events", "Events"),
            tabBarIcon: ({ focused }) => (
              <TabIcon label="📅" focused={focused} />
            ),
          }}
        />
      )}

      <Tab.Screen
        name="MoreTab"
        component={MoreStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const nav = navigation as any;
            nav.navigate("MoreTab", { screen: "MoreMenu" });
          },
        })}
        options={{
          tabBarLabel: t("nav.more", "More"),
          tabBarIcon: ({ focused }) => <TabIcon label="☰" focused={focused} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
    </Tab.Navigator>
  );
}
