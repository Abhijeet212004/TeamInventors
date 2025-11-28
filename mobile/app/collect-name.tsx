import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/constants/Config';

const AppColors = {
  primary: '#8B2E5A',
  secondary: '#FFFFFF',
  background: '#F5F5F5',
  text: '#000000',
  textSecondary: '#666666',
};

export default function NameCollectionScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }

    if (name.trim().length < 2) {
      Alert.alert('Invalid', 'Name must be at least 2 characters');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/auth/update-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (response.ok) {
        // Navigate to home screen
        router.replace('/(tabs)');
      } else {
        const data = await response.json();
        Alert.alert('Error', data.message || 'Failed to update name');
      }
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="person" size={64} color={AppColors.primary} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>What's your name?</Text>
          <Text style={styles.subtitle}>
            This name will be displayed to your contacts when you share your location
          </Text>

          {/* Name Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={AppColors.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoFocus
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {/* Character Count */}
          <Text style={styles.charCount}>{name.length}/50</Text>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Saving...' : 'Continue'}
            </Text>
            {!loading && (
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          {/* Skip Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.replace('/(tabs)')}
            disabled={loading}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: AppColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 16,
    color: AppColors.text,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: AppColors.textSecondary,
    marginBottom: 24,
  },
  submitButton: {
    width: '100%',
    backgroundColor: AppColors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textDecorationLine: 'underline',
  },
});
