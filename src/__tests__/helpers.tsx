/**
 * Shared helpers for rendering components in tests.
 * Wraps the component with all required providers.
 */
import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '../context/AuthContext';
import { TranslationProvider } from '../context/TranslationContext';
import { InboxProvider } from '../context/InboxContext';

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <NavigationContainer>
      <AuthProvider>
        <TranslationProvider>
          <InboxProvider>{children}</InboxProvider>
        </TranslationProvider>
      </AuthProvider>
    </NavigationContainer>
  );
}

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}

/** Minimal User fixture */
export const mockUser = {
  id: 'user-1',
  email: 'admin.test@micro.com',
  firstName: 'Admin',
  lastName: 'Test',
  roles: ['ROLE_ADMIN'],
  status: 'active',
  language: 'en',
  dashboardLayout: null,
  permissions: [
    'dashboard.view',
    'todos.view',
    'shopping.view',
    'events.view',
    'map.view',
    'users.view',
    'settings.view',
  ],
  instanceId: 'instance-1',
};

/** Build a minimal JWT with given payload (not cryptographically valid but decodable) */
export function buildFakeJwt(payload: Record<string, unknown> = {}): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ sub: 'user-1', exp: 9999999999, ...payload }));
  return `${header}.${body}.fakesig`;
}
