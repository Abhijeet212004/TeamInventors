import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/constants/Config';
import Toast from 'react-native-toast-message';

const AppColors = {
  primary: '#8B2E5A',
  secondary: '#FFFFFF',
  accent: '#A84371',
  background: '#F5F5F5',
  text: '#000000',
  textSecondary: '#666666',
};

const BUBBLE_ICONS = [
  { id: 'home', image: require('../assets/images/home.png') },
  { id: 'friends', image: require('../assets/images/friends.png') },
  { id: 'girl', image: require('../assets/images/girl.png') },
  { id: 'travel', image: require('../assets/images/travel.png') },
];

const BUBBLE_COLORS = [
  '#D4C5F9',
  '#A8D8EA',
  '#B8E994',
  '#FFF4D1',
  '#FFCCBC',
  '#FFB6C1',
];

export default function CreateBubbleScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedIcon, setSelectedIcon] = useState('girl');
  const [selectedColor, setSelectedColor] = useState('#FFF4D1');
  const [bubbleName, setBubbleName] = useState('');
  const [bubbleType, setBubbleType] = useState<'permanent' | 'temporary'>('permanent');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateBubble = async () => {
    if (!bubbleName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Group Name Required',
        text2: 'Please enter a name for your group',
        position: 'top',
      });
      return;
    }

    setIsCreating(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/bubbles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: bubbleName,
          icon: selectedIcon,
          color: selectedColor,
          type: bubbleType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to setup tracking');
      }

      const data = await response.json();
      
      // Navigate to share-tracking screen with bubble details
      router.push({
        pathname: '/share-tracking',
        params: {
          bubbleId: data.data.id,
          inviteCode: data.data.inviteCode,
          bubbleName: bubbleName,
        },
      });
    } catch (error) {
      console.error('Error setting up tracking:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to Create Group',
        text2: 'Please try again',
        position: 'top',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={AppColors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Share Your Location</Text>
          <Text style={styles.headerSubtitle}>Let others track you in real-time.</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Step Indicator */}
        <View style={styles.stepContainer}>
          <View style={styles.stepIndicator}>
            <View style={styles.progressCircle}>
              <View style={[styles.progressFill, { width: '25%' }]} />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepTitle}>Step 1</Text>
              <Text style={styles.stepSubtitle}>Setting up tracking</Text>
            </View>
          </View>
          <View style={styles.nextStepBadge}>
            <Text style={styles.nextStepText}>Add contacts next</Text>
          </View>
        </View>

        {/* Icon Selection Card */}
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatarCircle, { backgroundColor: selectedColor }]}>
              <Image
                source={BUBBLE_ICONS.find((icon) => icon.id === selectedIcon)?.image}
                style={styles.avatarImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Icon Options */}
          <View style={styles.iconRow}>
            {BUBBLE_ICONS.map((icon) => (
              <TouchableOpacity
                key={icon.id}
                style={[
                  styles.iconOption,
                  selectedIcon === icon.id && styles.iconOptionSelected,
                ]}
                onPress={() => setSelectedIcon(icon.id)}
              >
                <Image source={icon.image} style={styles.iconOptionImage} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Color Options */}
          <View style={styles.colorRow}>
            {BUBBLE_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>
        </View>

        {/* Group Name Input */}
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Group name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., My Family Group"
            placeholderTextColor="#999"
            value={bubbleName}
            onChangeText={setBubbleName}
            maxLength={20}
          />
          <Text style={styles.characterCount}>{bubbleName.length}/20</Text>
        </View>

        {/* Tracking Type Selection */}
        <View style={styles.card}>
          <View style={styles.typeHeader}>
            <Text style={styles.inputLabel}>Select tracking duration</Text>
            <Ionicons name="information-circle-outline" size={22} color={AppColors.textSecondary} />
          </View>

          <View style={styles.typeOptions}>
            <TouchableOpacity
              style={styles.typeOption}
              onPress={() => setBubbleType('permanent')}
            >
              <View
                style={[
                  styles.radioOuter,
                  bubbleType === 'permanent' && styles.radioOuterSelected,
                ]}
              >
                {bubbleType === 'permanent' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.typeText}>Always On</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.typeOption}
              onPress={() => setBubbleType('temporary')}
            >
              <View
                style={[
                  styles.radioOuter,
                  bubbleType === 'temporary' && styles.radioOuterSelected,
                ]}
              >
                {bubbleType === 'temporary' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.typeText}>Time Limited</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Start Tracking Button */}
        <TouchableOpacity
          style={[styles.createButton, isCreating && styles.createButtonDisabled]}
          onPress={handleCreateBubble}
          disabled={isCreating}
        >
          <Text style={styles.createButtonText}>
            {isCreating ? 'Setting up...' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: AppColors.primary,
  },
  stepTextContainer: {},
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
  },
  stepSubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  nextStepBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  nextStepText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 120,
    height: 120,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  iconOption: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: AppColors.primary,
  },
  iconOptionImage: {
    width: 45,
    height: 45,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#000000',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: AppColors.text,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 8,
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeOptions: {
    flexDirection: 'row',
    gap: 24,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioOuterSelected: {
    borderColor: AppColors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AppColors.primary,
  },
  typeText: {
    fontSize: 15,
    color: AppColors.text,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
