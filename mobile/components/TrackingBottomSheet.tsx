import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MIN_HEIGHT = 220;
const MAX_HEIGHT = SCREEN_HEIGHT * 0.55;

interface TrackingData {
  userName: string;
  userPhone: string;
  batteryLevel: number;
  signalStrength: string;
  phoneStatus: string;
  speed: number;
  address: string;
  idleTime: string;
}

interface TrackingBottomSheetProps {
  trackingData: TrackingData;
  onNavigate?: () => void;
  onClose?: () => void;
  visible?: boolean;
}

export default function TrackingBottomSheet({
  trackingData,
  onNavigate,
  onClose,
  visible = true,
}: TrackingBottomSheetProps) {
  const pan = useRef(new Animated.Value(MIN_HEIGHT)).current;
  const [currentHeight, setCurrentHeight] = useState(MIN_HEIGHT);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = currentHeight - gestureState.dy;
        if (newHeight >= MIN_HEIGHT && newHeight <= MAX_HEIGHT) {
          pan.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const newHeight = currentHeight - gestureState.dy;
        let finalHeight = MIN_HEIGHT;

        if (newHeight > (MIN_HEIGHT + MAX_HEIGHT) / 2) {
          finalHeight = MAX_HEIGHT;
        }

        Animated.spring(pan, {
          toValue: finalHeight,
          useNativeDriver: false,
          tension: 50,
          friction: 8,
        }).start();

        setCurrentHeight(finalHeight);
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(pan, {
        toValue: MIN_HEIGHT,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }).start();
      setCurrentHeight(MIN_HEIGHT);
    }
  }, [visible]);

  if (!visible) return null;

  const getInitial = (name: string) => {
    return name?.charAt(0).toUpperCase() || 'A';
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: pan,
        },
      ]}
    >
      {/* Drag Handle */}
      <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
        <View style={styles.dragHandle} />
        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Card */}
      <View style={styles.profileSection}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getInitial(trackingData.userName)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{trackingData.userName}</Text>
            <Text style={styles.profilePhone}>{trackingData.userPhone}</Text>
          </View>
          <View style={styles.idleContainer}>
            <Ionicons name="finger-print-outline" size={20} color="#5A1A40" />
            <Text style={styles.idleText}>{trackingData.idleTime}</Text>
          </View>
        </View>
      </View>

      {/* Tracking Stats */}
      <View style={styles.statsRow}>
        {/* Battery */}
        <View style={styles.statCard}>
          <Ionicons name="battery-charging-outline" size={24} color="#5A1A40" />
          <Text style={styles.statValue}>{trackingData.batteryLevel}%</Text>
          <Text style={styles.statLabel}>Battery</Text>
        </View>

        {/* Signal */}
        <View style={styles.statCard}>
          <Ionicons name="cellular-outline" size={24} color="#5A1A40" />
          <Text style={styles.statValue}>{trackingData.signalStrength}</Text>
          <Text style={styles.statLabel}>Signal</Text>
        </View>

        {/* Phone */}
        <View style={styles.statCard}>
          <Ionicons name="phone-portrait-outline" size={24} color="#5A1A40" />
          <Text style={styles.statValue}>{trackingData.phoneStatus}</Text>
          <Text style={styles.statLabel}>Phone</Text>
        </View>

        {/* Speed */}
        <View style={styles.statCard}>
          <Ionicons name="speedometer-outline" size={24} color="#5A1A40" />
          <Text style={styles.statValue}>{trackingData.speed} km/hr</Text>
          <Text style={styles.statLabel}>Speed</Text>
        </View>
      </View>

      {/* Address Section */}
      <View style={styles.addressContainer}>
        <Text style={styles.addressText}>{trackingData.address}</Text>
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={onNavigate}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    paddingHorizontal: 20,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    marginBottom: 12,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFB3B3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 13,
    color: '#6B7280',
  },
  idleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  idleText: {
    fontSize: 12,
    color: '#5A1A40',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
    paddingHorizontal: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 75,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginTop: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  navigationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});
