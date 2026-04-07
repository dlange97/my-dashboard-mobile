import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ShoppingStackParamList } from './types';
import ShoppingScreen from '../screens/ShoppingScreen';
import ShoppingDetailScreen from '../screens/ShoppingDetailScreen';

const Stack = createNativeStackNavigator<ShoppingStackParamList>();

export default function ShoppingStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShoppingLists" component={ShoppingScreen} />
      <Stack.Screen
        name="ShoppingDetail"
        component={ShoppingDetailScreen}
        options={({ route }) => ({ headerShown: true, title: route.params.listName })}
      />
    </Stack.Navigator>
  );
}
