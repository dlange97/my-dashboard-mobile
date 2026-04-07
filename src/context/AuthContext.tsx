import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { decodeJwtClaims, hasAnyPermission, hasPermission } from '../auth/permissions';
import api, { setOnUnauthorized } from '../api/api';
import type { User, Instance } from '../types';

interface AuthContextValue {
  token: string | null;
  user: User | null;
  login: (newToken: string, newUser?: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  selectInstance: (instanceId: string) => Promise<void>;
  needsInstanceSelection: boolean;
  isAuthenticated: boolean;
  isReady: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'dashboard_token';
const USER_KEY = 'dashboard_user';
const LANG_KEY = 'dashboard_lang';
const INSTANCE_KEY = 'dashboard_instance_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [needsInstanceSelection, setNeedsInstanceSelection] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const hasHydrated = useRef(false);

  // ── Bootstrap: load stored token/user from secure storage ──────────
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUser = await SecureStore.getItemAsync(USER_KEY);

        if (storedToken && storedUser) {
          try {
            const parsed = JSON.parse(storedUser) as User;
            setToken(storedToken);
            setUser(parsed);
          } catch {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(USER_KEY);
          }
        }
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await SecureStore.deleteItemAsync(INSTANCE_KEY);
    setToken(null);
    setUser(null);
    setNeedsInstanceSelection(false);
  }, []);

  // Wire up auto-logout on 401
  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });
  }, [logout]);

  // ── Login ──────────────────────────────────────────────────────────
  const login = useCallback(async (newToken: string, newUser?: Partial<User>) => {
    const claims = (decodeJwtClaims(newToken) ?? {}) as Partial<User>;
    const mergedUser: User = {
      id: newUser?.id ?? claims.id ?? '',
      email: newUser?.email ?? claims.email ?? '',
      firstName: newUser?.firstName ?? claims.firstName ?? '',
      lastName: newUser?.lastName ?? claims.lastName ?? '',
      roles: newUser?.roles ?? claims.roles ?? ['ROLE_USER'],
      status: newUser?.status ?? claims.status ?? 'active',
      language: newUser?.language ?? claims.language ?? 'en',
      dashboardLayout: newUser?.dashboardLayout ?? claims.dashboardLayout ?? null,
      permissions: newUser?.permissions ?? claims.permissions ?? [],
      instanceId: newUser?.instanceId ?? claims.instanceId ?? null,
    };

    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(mergedUser));

    if (mergedUser.language) {
      await SecureStore.setItemAsync(LANG_KEY, mergedUser.language);
    }
    if (mergedUser.instanceId) {
      await SecureStore.setItemAsync(INSTANCE_KEY, mergedUser.instanceId);
      setNeedsInstanceSelection(false);
    } else {
      await SecureStore.deleteItemAsync(INSTANCE_KEY);
    }

    setToken(newToken);
    setUser(mergedUser);
    hasHydrated.current = false; // allow hydration to re-run

    // If no instanceId, check how many instances user has
    if (!mergedUser.instanceId) {
      try {
        const instances: Instance[] = await api.getMyInstances();
        if (instances?.length === 1) {
          await SecureStore.setItemAsync(INSTANCE_KEY, instances[0].id);
          setUser((prev) => (prev ? { ...prev, instanceId: instances[0].id } : prev));
          setNeedsInstanceSelection(false);
        } else if (instances?.length > 1) {
          setNeedsInstanceSelection(true);
        }
      } catch {
        // instance selection can be retried
      }
    }
  }, []);

  // ── Select Instance ────────────────────────────────────────────────
  const selectInstance = useCallback(async (instanceId: string) => {
    await SecureStore.setItemAsync(INSTANCE_KEY, instanceId);
    setUser((prev) => (prev ? { ...prev, instanceId } : prev));
    setNeedsInstanceSelection(false);
  }, []);

  // ── Hydrate from /auth/me on cold start ────────────────────────────
  useEffect(() => {
    if (!token || hasHydrated.current || !isReady) return;
    hasHydrated.current = true;

    api
      .me()
      .then(async (data) => {
        if (!data?.user) return;
        const fresh = data.user;
        const storedInstance = await SecureStore.getItemAsync(INSTANCE_KEY);
        const updated: User = {
          id: fresh.id,
          email: fresh.email,
          firstName: fresh.firstName,
          lastName: fresh.lastName,
          roles: fresh.roles,
          status: fresh.status,
          language: fresh.language,
          dashboardLayout: fresh.dashboardLayout,
          permissions: fresh.permissions ?? [],
          instanceId: user?.instanceId ?? storedInstance,
        };
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));
        if (updated.language) {
          await SecureStore.setItemAsync(LANG_KEY, updated.language);
        }
        setUser(updated);
      })
      .catch(() => {
        logout();
      });
  }, [token, isReady, logout, user?.instanceId]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        selectInstance,
        needsInstanceSelection,
        isAuthenticated: !!token,
        isReady,
        hasPermission: (permission: string) => hasPermission(user, permission),
        hasAnyPermission: (permissions: string[]) =>
          hasAnyPermission(user, permissions),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
