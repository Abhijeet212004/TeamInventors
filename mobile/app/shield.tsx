import React from 'react';
import { View, StyleSheet } from 'react-native';
import CrowdShield from '@/components/CrowdShield';
import { Stack } from 'expo-router';

export default function ShieldScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <CrowdShield visible={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
