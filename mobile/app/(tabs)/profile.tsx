import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/services/api';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/Theme';

interface UserProfile {
  id: string;
  phone: string;
  email: string | null;
  role: string;
  qrCode: string;
  isActive: boolean;
}

export default function ProfileScreen() {
  const { user: localUser, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      const userData = await authAPI.getProfile();
      setProfile(userData);
      // QR code image is returned from backend in qrCodeImage field
      if (userData.qrCodeImage) {
        setQrCodeImage(userData.qrCodeImage);
      }
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
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
            router.replace('/auth');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const displayProfile = profile || localUser;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color={Colors.secondary} />
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.phone}>{displayProfile?.phone}</Text>
            {displayProfile?.email && (
              <Text style={styles.email}>{displayProfile.email}</Text>
            )}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {displayProfile?.role || 'USER'}
              </Text>
            </View>
          </View>
        </View>

        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="qr-code" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Your QR Code</Text>
          </View>

          <View style={styles.qrCard}>
            {qrCodeImage ? (
              <Image
                source={{ uri: qrCodeImage }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={180} color={Colors.textSecondary} />
              </View>
            )}
            <Text style={styles.qrCode}>
              {displayProfile?.qrCode || 'ALM-XXXXXXXXXX'}
            </Text>
            <Text style={styles.qrDescription}>
              Share this QR code with your guardians
            </Text>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => router.push('/medical-profile')}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="medical" size={24} color={Colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Medical Details</Text>
              <Text style={styles.menuSubtitle}>Manage health profile & reports</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Guardians</Text>
              <Text style={styles.menuSubtitle}>Manage your guardians</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="notifications" size={24} color={Colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Emergency Contacts</Text>
              <Text style={styles.menuSubtitle}>Your emergency contacts</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="settings" size={24} color={Colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Settings</Text>
              <Text style={styles.menuSubtitle}>App preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={24} color="#DC2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>AlertMate v1.0.0</Text>
          <Text style={styles.footerText}>Your personal safety companion</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  profileCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.secondary,
  },
  profileInfo: {
    alignItems: 'center',
  },
  phone: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing.md,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.secondary,
    letterSpacing: 1,
  },
  qrSection: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  qrCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  qrImage: {
    width: 200,
    height: 200,
    marginBottom: Spacing.md,
  },
  qrCode: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    letterSpacing: 1,
  },
  qrDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  menuSection: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: Spacing.xl,
  },
  logoutText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: Spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  footerText: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
});
