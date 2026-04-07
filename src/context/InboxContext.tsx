import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import api from '../api/api';
import { useAuth } from './AuthContext';
import type { InboxNotification } from '../types';

interface InboxContextValue {
  items: InboxNotification[];
  topItems: InboxNotification[];
  unreadCount: number;
  loading: boolean;
  error: string;
  markRead: (item: InboxNotification) => Promise<void>;
  clearAll: () => Promise<void>;
  loadInbox: () => Promise<void>;
}

const InboxContext = createContext<InboxContextValue | null>(null);

export function InboxProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInbox = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getInboxNotifications();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setUnreadCount(data?.unreadCount ?? 0);
      setError('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load inbox.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadInbox();
    const timer = setInterval(loadInbox, 25000);
    return () => clearInterval(timer);
  }, [loadInbox]);

  const markRead = useCallback(async (item: InboxNotification) => {
    if (item?.readAt) return;
    try {
      const updated = await api.markInboxRead(item.id);
      setItems((prev) =>
        prev.map((it) => (it.id === updated.id ? { ...it, ...updated } : it)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent fail
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await api.clearInboxNotifications();
      setItems([]);
      setUnreadCount(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clear inbox.';
      setError(message);
    }
  }, []);

  const topItems = useMemo(() => items.slice(0, 12), [items]);

  const value = useMemo(
    () => ({
      items,
      topItems,
      unreadCount,
      loading,
      error,
      markRead,
      clearAll,
      loadInbox,
    }),
    [items, topItems, unreadCount, loading, error, markRead, clearAll, loadInbox],
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox(): InboxContextValue {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error('useInbox must be used within InboxProvider');
  return ctx;
}
