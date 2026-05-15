import type { NavigatorScreenParams } from "@react-navigation/native";

// ── Auth Stack (unauthenticated) ────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  Checkout: { hash: string };
};

// ── Main Tabs ───────────────────────────────────────────────────────────
export type MainTabParamList = {
  DashboardTab: undefined;
  TodosTab: undefined;
  ShoppingTab: NavigatorScreenParams<ShoppingStackParamList>;
  EventsTab: undefined;
  MoreTab: NavigatorScreenParams<MoreStackParamList>;
};

// ── Shopping Stack (nested in tab) ──────────────────────────────────────
export type ShoppingStackParamList = {
  ShoppingLists: undefined;
  ShoppingDetail: { listId: string; listName: string };
};

// ── More Stack (nested in tab) ──────────────────────────────────────────
export type MoreStackParamList = {
  MoreMenu: undefined;
  Calendar: undefined;
  Map: undefined;
  Inbox: undefined;
  Notes: { noteId?: number } | undefined;
  Users: undefined;
  UserManagement: undefined;
  Settings: undefined;
  Profile: undefined;
};

// ── Root Stack ──────────────────────────────────────────────────────────
export type RootStackParamList = {
  InstancePicker: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};
