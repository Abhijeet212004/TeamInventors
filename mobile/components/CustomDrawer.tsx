import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/Config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UserProfile {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  role: string;
  qrCode: string;
  qrCodeImage?: string;
  isActive: boolean;
}

interface CustomDrawerProps {
  onClose: () => void;
  visible: boolean;
}

export default function CustomDrawer({ onClose, visible }: CustomDrawerProps) {
  const { user: localUser, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      fetchProfile();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.data?.user || data.user || data;
        setProfile(user);
      }
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            onClose();
            router.replace('/auth');
          },
        },
      ]
    );
  };

  const displayProfile = profile || localUser;

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <Animated.View style={styles.drawerContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../assets/images/Alertnate_logo.png')} resizeMode="contain" style={styles.logo} />
          <Text style={styles.headerTitle}>ALERTMATE</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <TouchableOpacity
            style={styles.profileCard}
            activeOpacity={0.9}
            onPress={() => {
              onClose();
              router.push('/profile');
            }}
          >
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{displayProfile?.name?.charAt(0).toUpperCase() || 'A'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayProfile?.name || 'User'}</Text>
              <Text style={styles.profilePhone}>{displayProfile?.phone}</Text>
            </View>
            <View style={styles.editButton}>
              <Ionicons name="chevron-forward" size={20} color="#5A1A40" />
            </View>
          </TouchableOpacity>

          {/* Menu Grid */}
          <View style={styles.menuGrid}>
            <TouchableOpacity
              style={styles.menuCard}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                router.push('/medical-profile');
              }}
            >
              <Ionicons name="medical" size={28} color="#5A1A40" />
              <Text style={styles.menuCardText}>Medical ID</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} activeOpacity={0.7}>
              <Ionicons name="time-outline" size={28} color="#5A1A40" />
              <Text style={styles.menuCardText}>SOS History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} activeOpacity={0.7}>
              <Ionicons name="people-outline" size={28} color="#5A1A40" />
              <Text style={styles.menuCardText}>Friends</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} activeOpacity={0.7}>
              <Ionicons name="document-text-outline" size={28} color="#5A1A40" />
              <Text style={styles.menuCardText}>Legal</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} activeOpacity={0.7}>
              <Ionicons name="help-circle-outline" size={28} color="#5A1A40" />
              <Text style={styles.menuCardText}>Help</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} activeOpacity={0.7}>
              <Ionicons name="settings-outline" size={28} color="#5A1A40" />
              <Text style={styles.menuCardText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={28} color="#5A1A40" />
              <Text style={styles.menuCardText}>Share App</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} activeOpacity={0.7}>
              <Ionicons name="help-buoy-outline" size={28} color="#5A1A40" />
              <Text style={styles.menuCardText}>Help Tour</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} activeOpacity={0.7} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={28} color="#5A1A40" />
              <Text style={styles.menuCardText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  drawerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#5A1A40',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  logo: {
    width: 50,
    height: 50
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: '#FFB3B3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: '#666666',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingBottom: 30,
  },
  menuCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    margin: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  menuCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A1A40',
    marginTop: 12,
    textAlign: 'center',
  },
});
