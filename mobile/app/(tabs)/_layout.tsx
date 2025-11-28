import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors as ThemeColors } from '@/constants/Theme';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: ThemeColors.primary,
          tabBarInactiveTintColor: ThemeColors.textSecondary,
          tabBarStyle: {
            display: 'none', // Hide the default tab bar
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          headerShown: false,
        }}>
        
        <Tabs.Screen
          name="profile"
          options={{
            href: null, // Hide profile tab
          }}
        />
        <Tabs.Screen
          name="two"
          options={{
            href: null, // Hide this tab
          }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}
