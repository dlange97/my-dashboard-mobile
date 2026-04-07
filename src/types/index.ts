// ── User & Auth ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  status: string;
  language: string;
  dashboardLayout: Record<string, unknown> | null;
  permissions: string[];
  instanceId: string | null;
}

export interface Instance {
  id: string;
  name: string;
  slug: string;
}

export interface LoginResponse {
  token: string;
  user?: Partial<User>;
}

// ── Todos ───────────────────────────────────────────────────────────────

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  dueDate: string | null;
  ownerId: string;
  createdBy?: string;
  createdAt: string;
  sharedWithUserIds?: string[];
}

// ── Shopping ────────────────────────────────────────────────────────────

export interface ShoppingListProduct {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  checked: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  status: string;
  ownerId: string;
  sharedWithUserIds?: string[];
  products: ShoppingListProduct[];
  createdAt: string;
}

// ── Events ──────────────────────────────────────────────────────────────

export interface EventLocation {
  lat: number;
  lon: number;
  display_name?: string;
}

export interface AppEvent {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string | null;
  location: EventLocation | null;
  ownerId: string;
  sharedWithUserIds?: string[];
}

export interface MapRoute {
  id: string;
  name: string;
  eventId: string | null;
  coordinates: Array<{ lat: number; lng: number }>;
}

export interface MapPoint {
  id: string;
  name: string;
  description: string;
  lat: number;
  lon: number;
}

// ── Notifications ───────────────────────────────────────────────────────

export interface InboxNotification {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface InboxResponse {
  items: InboxNotification[];
  unreadCount: number;
}

// ── Roles & Settings ────────────────────────────────────────────────────

export interface RoleDefinition {
  id: string;
  name: string;
  slug: string;
  permissions: string[];
  isSystem: boolean;
  assignedUsersCount: number;
}

export interface JwtSessionSetting {
  id: number;
  name: string;
  ttlSeconds: number;
}

export interface NotificationChannelConfig {
  enabled: boolean;
  title: string;
  body: string;
}

export interface NotificationTemplate {
  key: string;
  channels: {
    inbox: NotificationChannelConfig;
    email: NotificationChannelConfig;
    push: NotificationChannelConfig;
  };
}

// ── Translations ────────────────────────────────────────────────────────

export interface TranslationEntry {
  translationKey: string;
  values: Record<string, string>;
}

// ── API Pagination ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface ShareableUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}
