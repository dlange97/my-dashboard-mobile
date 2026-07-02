import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import type {
  LoginResponse,
  User,
  TodoItem,
  ShoppingList,
  AppEvent,
  MapRoute,
  MapPoint,
  Note,
  InboxResponse,
  InboxNotification,
  RoleDefinition,
  JwtSessionSetting,
  NotificationTemplate,
  TranslationEntry,
  PaginatedResponse,
  ShareableUser,
  Instance,
} from "../types";

const TOKEN_KEY = "dashboard_token";
const INSTANCE_KEY = "dashboard_instance_id";

// Base URL is configurable via env; set EXPO_PUBLIC_API_URL in .env
const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

const client = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ── Request interceptor: attach auth headers ────────────────────────────

client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const instanceId = await SecureStore.getItemAsync(INSTANCE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (instanceId) {
    config.headers["X-Instance-Id"] = instanceId;
  }
  return config;
});

// ── Logout callback (set by AuthContext) ────────────────────────────────

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

client.interceptors.response.use(
  (resp) => resp,
  (error: AxiosError) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);

// ── Helpers ─────────────────────────────────────────────────────────────

function extractData<T>(resp: { data: T }): T {
  return resp.data;
}

function extractError(error: unknown): never {
  if (error instanceof AxiosError) {
    // No response → network-level failure (wrong URL, server down, no .env, etc.)
    if (!error.response) {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "(not set)";
      throw new Error(
        `Cannot reach server at ${apiUrl}. Check your .env EXPO_PUBLIC_API_URL and ensure the backend is running.`,
      );
    }
    const data = error.response.data as Record<string, unknown> | undefined;
    const message =
      (data?.error as string) ??
      (data?.message as string) ??
      `HTTP ${error.response.status}: ${error.response.statusText}`;
    throw new Error(message);
  }
  throw error;
}

async function get<T>(path: string): Promise<T> {
  return client.get<T>(path).then(extractData).catch(extractError);
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  return client.post<T>(path, body).then(extractData).catch(extractError);
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  return client.put<T>(path, body).then(extractData).catch(extractError);
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  return client.patch<T>(path, body).then(extractData).catch(extractError);
}

async function del<T = null>(path: string): Promise<T> {
  return client.delete<T>(path).then(extractData).catch(extractError);
}

// ── Shopping Lists ──────────────────────────────────────────────────────

export const api = {
  // ── Notes ─────────────────────────────────────────────────────────────

  getNotes: () => get<Note[]>("/dashboard/notes"),
  createNote: (payload: { title: string; content: string; color?: string }) =>
    post<Note>("/dashboard/notes", payload),
  updateNote: (
    id: number,
    payload: { title?: string; content?: string; color?: string },
  ) => patch<Note>(`/dashboard/notes/${id}`, payload),
  deleteNote: (id: number) => del(`/dashboard/notes/${id}`),
  shareNote: (id: number, userId: string) =>
    post<Note>(`/dashboard/notes/${id}/share`, { userId }),
  unshareNote: (id: number, userId: string) =>
    del(`/dashboard/notes/${id}/share/${encodeURIComponent(userId)}`),

  getLists: () => get<ShoppingList[]>("/dashboard/shopping-lists"),
  createList: (payload: { name: string }) =>
    post<ShoppingList>("/dashboard/shopping-lists", payload),
  updateList: (id: string, payload: { name: string }) =>
    put<ShoppingList>(`/dashboard/shopping-lists/${id}`, payload),
  updateListStatus: (id: string, status: string) =>
    patch<ShoppingList>(`/dashboard/shopping-lists/${id}/status`, { status }),
  deleteList: (id: string) => del(`/dashboard/shopping-lists/${id}`),
  shareList: (id: string, userId: string) =>
    post<ShoppingList>(`/dashboard/shopping-lists/${id}/share`, { userId }),
  unshareList: (id: string, userId: string) =>
    del(`/dashboard/shopping-lists/${id}/share/${encodeURIComponent(userId)}`),
  addProduct: (listId: string, product: Record<string, unknown>) =>
    post<ShoppingList>(`/dashboard/shopping-lists/${listId}/products`, product),
  removeProduct: (listId: string, productId: string) =>
    del(`/dashboard/shopping-lists/${listId}/products/${productId}`),

  // ── Todos ───────────────────────────────────────────────────────────

  getTodos: () => get<TodoItem[]>("/dashboard/todos"),
  createTodo: (payload: { text: string; dueDate?: string | null }) =>
    post<TodoItem>("/dashboard/todos", payload),
  toggleTodo: (id: string) => patch<TodoItem>(`/dashboard/todos/${id}/toggle`),
  updateTodo: (id: string, payload: Partial<TodoItem>) =>
    patch<TodoItem>(`/dashboard/todos/${id}`, payload),
  deleteTodo: (id: string) => del(`/dashboard/todos/${id}`),
  shareTodo: (id: string, userId: string) =>
    post<TodoItem>(`/dashboard/todos/${id}/share`, { userId }),
  unshareTodo: (id: string, userId: string) =>
    del(`/dashboard/todos/${id}/share/${encodeURIComponent(userId)}`),

  // ── Events ──────────────────────────────────────────────────────────

  getEvents: () => get<AppEvent[]>("/events"),
  createEvent: (payload: Partial<AppEvent>) =>
    post<AppEvent>("/events", payload),
  updateEvent: (id: string, payload: Partial<AppEvent>) =>
    put<AppEvent>(`/events/${id}`, payload),
  deleteEvent: (id: string) => del(`/events/${id}`),
  shareEvent: (id: string, userId: string) =>
    post<AppEvent>(`/events/${id}/share`, { userId }),
  unshareEvent: (id: string, userId: string) =>
    del(`/events/${id}/share/${encodeURIComponent(userId)}`),

  // ── Routes ──────────────────────────────────────────────────────────

  getRoutes: () => get<MapRoute[]>("/events/routes"),
  getRoutesByEvent: (eventId: string) =>
    get<MapRoute[]>(`/events/routes/event/${eventId}`),
  createRoute: (payload: Partial<MapRoute>) =>
    post<MapRoute>("/events/routes", payload),
  updateRoute: (id: string, payload: Partial<MapRoute>) =>
    put<MapRoute>(`/events/routes/${id}`, payload),
  deleteRoute: (id: string) => del(`/events/routes/${id}`),

  // ── Map Points ──────────────────────────────────────────────────────

  getMapPoints: () => get<MapPoint[]>("/events/points"),
  createMapPoint: (payload: Partial<MapPoint>) =>
    post<MapPoint>("/events/points", payload),
  updateMapPoint: (id: string, payload: Partial<MapPoint>) =>
    patch<MapPoint>(`/events/points/${id}`, payload),
  deleteMapPoint: (id: string) => del(`/events/points/${id}`),

  // ── Auth ────────────────────────────────────────────────────────────

  login: (email: string, password: string) =>
    post<LoginResponse>("/auth/login", { email, password }),
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => post("/auth/register", { email, password, firstName, lastName }),
  requestAccess: (payload: {
    email: string;
    firstName?: string;
    lastName?: string;
    message?: string;
  }) => post("/auth/request-access", payload),
  me: () => get<{ user: User }>("/auth/me"),

  // ── Users ───────────────────────────────────────────────────────────

  getUsers: (
    params: { page?: number; perPage?: number; search?: string } = {},
  ) => {
    const p = new URLSearchParams();
    p.set("page", String(params.page ?? 1));
    p.set("perPage", String(params.perPage ?? 10));
    if (params.search?.trim()) p.set("search", params.search.trim());
    return get<PaginatedResponse<User>>(`/auth/users?${p.toString()}`);
  },
  getShareableUsers: (
    params: { page?: number; perPage?: number; search?: string } = {},
  ) => {
    const p = new URLSearchParams();
    p.set("page", String(params.page ?? 1));
    p.set("perPage", String(params.perPage ?? 25));
    if (params.search?.trim()) p.set("search", params.search.trim());
    return get<PaginatedResponse<ShareableUser> | ShareableUser[]>(
      `/auth/users/options?${p.toString()}`,
    );
  },
  getUserById: (userId: string) => get<User>(`/auth/users/${userId}`),
  createUser: (payload: Record<string, unknown>) =>
    post<User>("/auth/users", payload),
  updateUser: (userId: string, payload: Record<string, unknown>) =>
    patch<User>(`/auth/users/${userId}`, payload),
  deleteUser: (userId: string) => del(`/auth/users/${userId}`),
  assignUserRole: (userId: string, role: string) =>
    patch(`/auth/users/${userId}/role`, { role }),

  // ── Access Settings ─────────────────────────────────────────────────

  getAccessSettings: () =>
    get<Record<string, unknown>>("/auth/settings/access"),
  getJwtSessionSettings: () =>
    get<JwtSessionSetting[]>("/auth/settings/jwt-session"),
  getJwtSessionSetting: (id: string) =>
    get<JwtSessionSetting>(`/auth/settings/jwt-session/${id}`),
  createJwtSessionSetting: (payload: Partial<JwtSessionSetting>) =>
    post<JwtSessionSetting>("/auth/settings/jwt-session", payload),
  updateJwtSessionSetting: (id: string, payload: Partial<JwtSessionSetting>) =>
    patch<JwtSessionSetting>(`/auth/settings/jwt-session/${id}`, payload),
  deleteJwtSessionSetting: (id: string) =>
    del(`/auth/settings/jwt-session/${id}`),

  // ── Roles ───────────────────────────────────────────────────────────

  getRoles: () => get<RoleDefinition[]>("/auth/roles"),
  createRole: (payload: Partial<RoleDefinition>) =>
    post<RoleDefinition>("/auth/roles", payload),
  updateRole: (id: string, payload: Partial<RoleDefinition>) =>
    put<RoleDefinition>(`/auth/roles/${id}`, payload),
  deleteRole: (id: string) => del(`/auth/roles/${id}`),

  // ── Notifications ───────────────────────────────────────────────────

  getInboxNotifications: () => get<InboxResponse>("/notification/inbox"),
  clearInboxNotifications: () => del("/notification/inbox"),
  markInboxRead: (notificationId: string) =>
    patch<InboxNotification>(`/notification/inbox/${notificationId}/read`),
  getNotificationTemplate: () =>
    get<NotificationTemplate>("/notification/settings/template/request-access"),
  updateNotificationTemplate: (payload: NotificationTemplate) =>
    put<NotificationTemplate>(
      "/notification/settings/template/request-access",
      payload,
    ),

  // ── Translations ────────────────────────────────────────────────────

  getTranslations: (locale = "en") =>
    get<Record<string, string>>(`/translation/translations?locale=${locale}`),
  getAdminTranslations: () =>
    get<TranslationEntry[]>("/translation/admin/translations"),
  createTranslation: (payload: {
    key: string;
    values: Record<string, string>;
  }) => post<TranslationEntry>("/translation/admin/translations", payload),
  updateTranslation: (
    translationKey: string,
    payload: { values: Record<string, string> },
  ) =>
    put<TranslationEntry>(
      `/translation/admin/translations/${encodeURIComponent(translationKey)}`,
      payload,
    ),
  deleteTranslation: (translationKey: string) =>
    del(
      `/translation/admin/translations/${encodeURIComponent(translationKey)}`,
    ),

  // ── User profile ────────────────────────────────────────────────────

  updateMyLanguage: (language: string) => patch("/auth/me", { language }),
  updateMyDashboardLayout: (dashboardLayout: Record<string, unknown>) =>
    patch("/auth/me", { dashboardLayout }),

  // ── Instance management ─────────────────────────────────────────────

  resolveInstanceBySubdomain: (subdomain: string) =>
    get<Instance>(
      `/auth/instances/resolve?subdomain=${encodeURIComponent(subdomain)}`,
    ),
  getMyInstances: () => get<Instance[]>("/auth/my-instances"),

  // ── Push tokens (new for mobile) ────────────────────────────────────

  registerPushToken: (token: string, platform: "ios" | "android") =>
    post("/notification/push-tokens", { token, platform }),
  unregisterPushToken: (token: string) =>
    del(`/notification/push-tokens/${encodeURIComponent(token)}`),

  // ── Checkout ────────────────────────────────────────────────────────

  validateCheckout: (hash: string) =>
    get<{ valid: boolean; email?: string }>(`/auth/checkout/${hash}/validate`),
  completeCheckout: (hash: string, payload: Record<string, unknown>) =>
    post<LoginResponse>(`/auth/checkout/${hash}`, payload),

  // ── Invite / Set password ───────────────────────────────────────────

  validateInvite: (token: string) =>
    get<{ valid: boolean; email?: string; reason?: string }>(
      `/auth/invite/${encodeURIComponent(token)}/validate`,
    ),
  acceptInvite: (token: string, password: string) =>
    post(`/auth/invite/${encodeURIComponent(token)}`, { password }),
};

export default api;
