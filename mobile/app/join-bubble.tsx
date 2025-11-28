import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const { width, height } = Dimensions.get('window');

export default function JoinBubbleScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Prevent multiple scans
    if (scanned || isJoining) return;
    
    setScanned(true);
    setIsJoining(true);

    try {
      // Extract invite code from URL or use the data directly
      let inviteCode = data;
      
      // If it's a URL, extract the code
      if (data.includes('/join/')) {
        const parts = data.split('/join/');
        inviteCode = parts[parts.length - 1];
      }

      await joinBubble(inviteCode);
    } catch (error) {
      console.error('Error processing QR code:', error);
      Toast.show({
        type: 'error',
        text1: 'Invalid QR Code',
        text2: 'Please try again with a valid QR code',
        position: 'top',
        visibilityTime: 3000,
      });
      setScanned(false);
      setIsJoining(false);
    }
  };

  const joinBubble = async (inviteCode: string) => {
    if (!inviteCode.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Code',
        text2: 'Please enter or scan an invite code',
        position: 'top',
      });
      return;
    }

    setIsJoining(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/bubbles/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          inviteCode: inviteCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (data.message?.includes('already a member')) {
          throw new Error('You are already in this group! Check your bubbles on the map screen.');
        } else if (data.message?.includes('Invalid invite code')) {
          throw new Error('Invalid invite code. Please check and try again.');
        } else if (data.message?.includes('no longer active')) {
          throw new Error('This group is no longer active.');
        } else {
          throw new Error(data.message || 'Failed to join group');
        }
      }

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Joined Successfully! 🎉',
        text2: `You're now a member of "${data.data.name}"`,
        position: 'top',
        visibilityTime: 3000,
      });

      // Navigate after a short delay to show the toast
      setTimeout(() => {
        router.replace('/map-tracking');
      }, 1500);

    } catch (error: any) {
      console.error('Error joining bubble:', error);
      
      let errorTitle = 'Cannot Join Group';
      let errorMessage = error.message || 'Failed to join group. Please check the code and try again.';
      
      // Special handling for different error types
      if (error.message?.includes('already in this group')) {
        errorTitle = 'Already a Member';
        errorMessage = 'You are already in this group';
      } else if (error.message?.includes('Invalid invite code')) {
        errorTitle = 'Invalid Code';
        errorMessage = 'Please check the code and try again';
      } else if (error.message?.includes('no longer active')) {
        errorTitle = 'Group Inactive';
        errorMessage = 'This group is no longer active';
      }
      
      Toast.show({
        type: 'error',
        text1: errorTitle,
        text2: errorMessage,
        position: 'top',
        visibilityTime: 4000,
      });

      setScanned(false);
      setIsJoining(false);
    }
  };

  const handleManualJoin = () => {
    joinBubble(manualCode);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color={AppColors.textSecondary} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera to scan QR codes and join groups.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => setShowManualInput(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.manualButtonText}>Enter Code Manually</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showManualInput) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={AppColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Enter Invite Code</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.manualContainer}>
          <Ionicons name="keypad-outline" size={80} color={AppColors.primary} />
          <Text style={styles.manualTitle}>Enter Code Manually</Text>
          <Text style={styles.manualSubtitle}>
            Enter the invite code shared with you
          </Text>

          <TextInput
            style={styles.codeInput}
            placeholder="Enter invite code"
            placeholderTextColor={AppColors.textSecondary}
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
          />

          <TouchableOpacity
            style={[styles.joinButton, isJoining && styles.joinButtonDisabled]}
            onPress={handleManualJoin}
            disabled={isJoining || !manualCode.trim()}
            activeOpacity={0.8}
          >
            {isJoining ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.joinButtonText}>Join Group</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setShowManualInput(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={20} color={AppColors.primary} />
            <Text style={styles.switchButtonText}>Scan QR Code Instead</Text>
          </TouchableOpacity>
        </View>

        <Toast />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={AppColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          <View style={styles.overlay}>
            {/* Top overlay */}
            <View style={styles.overlayTop} />
            
            {/* Middle row with scanning frame */}
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.scanFrame}>
                {/* Corner brackets */}
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>
              <View style={styles.overlaySide} />
            </View>
            
            {/* Bottom overlay */}
            <View style={styles.overlayBottom}>
              <Text style={styles.scanText}>
                Position the QR code within the frame
              </Text>
            </View>
          </View>
        </CameraView>
      </View>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.manualCodeButton}
          onPress={() => setShowManualInput(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="keypad-outline" size={20} color={AppColors.primary} />
          <Text style={styles.manualCodeButtonText}>Enter Code Manually</Text>
        </TouchableOpacity>
      </View>

      {isJoining && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={AppColors.primary} />
            <Text style={styles.loadingText}>Joining group...</Text>
          </View>
        </View>
      )}

      <Toast />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
  },
  placeholder: {
    width: 40,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: AppColors.text,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  manualButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  manualButtonText: {
    color: AppColors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: 280,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  scanText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomActions: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  manualCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: AppColors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  manualCodeButtonText: {
    color: AppColors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  manualTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: AppColors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  manualSubtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  codeInput: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
    borderWidth: 2,
    borderColor: AppColors.primary,
    marginBottom: 24,
  },
  joinButton: {
    width: '100%',
    backgroundColor: AppColors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchButtonText: {
    color: AppColors.primary,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
});
