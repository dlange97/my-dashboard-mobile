import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import InstancePickerScreen from '../screens/InstancePickerScreen';
import MainTabNavigator from './MainTabNavigator';

import type { AuthStackParamList, RootStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Checkout" component={CheckoutScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  const { needsInstanceSelection } = useAuth();

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {needsInstanceSelection ? (
        <RootStack.Screen name="InstancePicker" component={InstancePickerScreen} />
      ) : (
        <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
      )}
    </RootStack.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isReady } = useAuth();

  // While the auth context is bootstrapping, show nothing (splash screen is still visible)
  if (!isReady) return null;

  return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
}
