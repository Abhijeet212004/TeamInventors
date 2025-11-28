import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Share,
  Clipboard,
  ScrollView,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Toast from 'react-native-toast-message';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

const AppColors = {
  primary: '#8B2E5A',
  secondary: '#FFFFFF',
  accent: '#A84371',
  background: '#F5F5F5',
  text: '#000000',
  textSecondary: '#666666',
  sos: '#EF4444',
};

export default function ShareTrackingScreen() {
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);

  // Check if this is an SOS alert view
  const isSosAlert = params.sosLatitude && params.sosLongitude;
  const sosLatitude = parseFloat(params.sosLatitude as string);
  const sosLongitude = parseFloat(params.sosLongitude as string);
  const sosUserName = params.sosUserName as string || 'User';

  const bubbleId = params.bubbleId as string;
  const inviteCode = params.inviteCode as string;
  const bubbleName = params.bubbleName as string;

  const inviteLink = `https://alertmate.app/join/${inviteCode}`;

  useEffect(() => {
    if (isSosAlert && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: sosLatitude,
        longitude: sosLongitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [isSosAlert, sosLatitude, sosLongitude]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my location tracking group "${bubbleName}" on AlertMate!\n\nUse this link: ${inviteLink}\n\nOr scan the QR code to join instantly.`,
        title: 'Join My Tracking Group',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyLink = () => {
    Clipboard.setString(inviteLink);
    Toast.show({
      type: 'success',
      text1: 'Copied! 📋',
      text2: 'Invite link copied to clipboard',
      position: 'bottom',
      visibilityTime: 2000,
    });
  };

  const handleDone = () => {
    router.replace('/map-tracking');
  };

  const openMapsNavigation = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${sosLatitude},${sosLongitude}`;
    const label = `${sosUserName}'s SOS Location`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  if (isSosAlert) {
    return (
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: sosLatitude,
            longitude: sosLongitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{ latitude: sosLatitude, longitude: sosLongitude }}
            title={`${sosUserName} needs help!`}
            description="SOS Alert Location"
          >
            <View style={styles.sosMarker}>
              <Ionicons name="warning" size={24} color="#FFF" />
            </View>
          </Marker>
        </MapView>

        <View style={styles.sosOverlay}>
          <View style={styles.sosHeader}>
            <Ionicons name="alert-circle" size={32} color="#EF4444" />
            <View>
              <Text style={styles.sosTitle}>SOS ALERT</Text>
              <Text style={styles.sosSubtitle}>{sosUserName} needs help!</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.navigateButton} onPress={openMapsNavigation}>
            <Ionicons name="navigate" size={24} color="#FFF" />
            <Text style={styles.navigateText}>Navigate to Location</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeText}>Close Alert</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          <Text style={styles.headerTitle}>Tracking Started!</Text>
          <Text style={styles.headerSubtitle}>
            Share this QR code or link to let others track you
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* QR Code Card */}
        <View style={styles.qrCard}>
          <Text style={styles.qrTitle}>Scan to Join</Text>
          <View style={styles.qrContainer}>
            <QRCode
              value={inviteLink}
              size={240}
              color={AppColors.primary}
              backgroundColor="white"
            />
          </View>
          <View style={styles.bubbleInfo}>
            <Text style={styles.bubbleNameLabel}>Group Name</Text>
            <Text style={styles.bubbleName}>{bubbleName}</Text>
          </View>
        </View>

        {/* Invite Code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Invite Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{inviteCode}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Ionicons name="share-social" size={24} color="#FFFFFF" />
            <Text style={styles.shareButtonText}>Share Link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyLink}
            activeOpacity={0.8}
          >
            <Ionicons name="copy-outline" size={24} color={AppColors.primary} />
            <Text style={styles.copyButtonText}>Copy Link</Text>
          </TouchableOpacity>
        </View>

        {/* Info Text */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={AppColors.textSecondary} />
          <Text style={styles.infoText}>
            Anyone with this code can track your real-time location. Only share with trusted contacts.
          </Text>
        </View>
      </ScrollView>

      {/* Done Button - Fixed at bottom */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDone}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  map: {
    width: width,
    height: height,
  },
  sosMarker: {
    backgroundColor: '#EF4444',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  sosOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sosTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  sosSubtitle: {
    fontSize: 16,
    color: '#374151',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  navigateText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeText: {
    color: '#6B7280',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: AppColors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 20,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  bubbleInfo: {
    marginTop: 20,
    alignItems: 'center',
  },
  bubbleNameLabel: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  bubbleName: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.primary,
  },
  codeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  codeContainer: {
    backgroundColor: AppColors.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.primary,
    letterSpacing: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AppColors.primary,
    gap: 8,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF4E6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#D97706',
    lineHeight: 18,
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  doneButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
