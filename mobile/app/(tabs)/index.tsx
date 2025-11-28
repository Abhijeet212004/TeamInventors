import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, StatusBar, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import CustomDrawer from '@/components/CustomDrawer';
import { Spacing, Colors } from '@/constants/Theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/Config';

// Colors from logo
const AppColors = {
  primary: '#8B2E5A',
  secondary: '#FFFFFF',
  accent: '#A84371',
  background: '#F5F5F5',
  text: '#000000',
  textSecondary: '#666666',
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('track');
  const [checkingBubbles, setCheckingBubbles] = useState(true);
  const [hasCheckedBubbles, setHasCheckedBubbles] = useState(false);

  useEffect(() => {
    // Only check for bubbles once when component first mounts
    if (!hasCheckedBubbles) {
      checkForBubbles();
    }
  }, [hasCheckedBubbles]);

  const checkForBubbles = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setCheckingBubbles(false);
        setHasCheckedBubbles(true);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/bubbles`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const bubblesData = data.data || [];

        // If user has bubbles, redirect to map-tracking
        if (bubblesData.length > 0) {
          router.replace('/map-tracking');
          return;
        }
      }
    } catch (error) {
      console.error('Error checking bubbles:', error);
    } finally {
      setCheckingBubbles(false);
      setHasCheckedBubbles(true);
    }
  };

  if (checkingBubbles) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const toggleDrawer = () => {
    setDrawerVisible(!drawerVisible);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image
            source={require('../../assets/images/Alertnate_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>ALERTMATE</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={24} color={AppColors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={toggleDrawer}
          >
            <Ionicons name="menu" size={24} color={AppColors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Illustration */}
        <View style={styles.illustrationContainer}>
          <Image
            source={require('../../assets/images/homescreen.png')}
            style={styles.illustrationImage}
            resizeMode="contain"
          />
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.mainTitle}>Stay Connected, Stay Safe</Text>
          <Text style={styles.mainDescription}>
            Share your live location with trusted contacts. Let them track you in real-time and ensure your safety wherever you go.
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => router.push('/map-tracking')}
            >
              <Ionicons name="location" size={24} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Share Live Location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => router.push('/join-bubble')}
            >
              <Ionicons name="people" size={24} color={AppColors.primary} />
              <Text style={styles.secondaryButtonText}>Join a Bubble</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => setActiveTab('track')}
        >
          <Ionicons
            name="share-social"
            size={24}
            color={activeTab === 'track' ? AppColors.primary : AppColors.textSecondary}
          />
          <Text style={[styles.navLabel, activeTab === 'track' && styles.activeNavLabel]}>
            Connect
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => router.push('/shield')}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={24}
            color={activeTab === 'shield' ? AppColors.primary : AppColors.textSecondary}
          />
          <Text style={[styles.navLabel, activeTab === 'shield' && styles.activeNavLabel]}>
            Shield
          </Text>
        </TouchableOpacity>

        {/* Spacer for SOS button */}
        <View style={{ width: 70 }} />

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => router.push('/start-trip')}
        >
          <Ionicons
            name="car-outline"
            size={24}
            color={activeTab === 'trip' ? AppColors.primary : AppColors.textSecondary}
          />
          <Text style={[styles.navLabel, activeTab === 'trip' && styles.activeNavLabel]}>
            Start Trip
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
          onPress={() => router.push('/offline-chat')}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={24}
            color={activeTab === 'chat' ? AppColors.primary : AppColors.textSecondary}
          />
          <Text style={[styles.navLabel, activeTab === 'chat' && styles.activeNavLabel]}>
            Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* SOS Button - Absolutely positioned */}
      <TouchableOpacity
        style={styles.sosButtonAbsolute}
        activeOpacity={0.85}
        onPress={() => {
          console.log('🚨 SOS BUTTON CLICKED FROM HOME SCREEN');
          console.log('Attempting to navigate to /sos-countdown');
          try {
            router.push('/sos-countdown');
            console.log('Navigation called successfully');
          } catch (error) {
            console.error('Navigation error:', error);
          }
        }}
      >
        <Ionicons name="flash" size={32} color="#FFFFFF" />
        <Text style={styles.sosLabel}>SOS</Text>
      </TouchableOpacity>

      {/* Drawer Modal */}
      <Modal
        visible={drawerVisible}
        animationType="none"
        transparent={true}
        onRequestClose={toggleDrawer}
        statusBarTranslucent
      >
        <CustomDrawer onClose={toggleDrawer} visible={drawerVisible} />
      </Modal>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    paddingTop: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  logoText: {
    fontSize: 24,
    letterSpacing: 0.5,
    fontWeight: '700',
    color: '#8B2E5A',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 100,
  },
  illustrationContainer: {
    alignItems: 'center',

  },
  illustrationImage: {
    width: '100%',
    height: 340,
    resizeMode: 'contain',
  },
  mainContent: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  mainDescription: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  actionButtons: {
    width: '100%',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#8B2E5A',
    shadowColor: '#8B2E5A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#8B2E5A',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B2E5A',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    borderTopWidth: 0,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'visible',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    color: '#666666',
    marginTop: 4,
    fontWeight: '500',
  },
  activeNavLabel: {
    color: '#8B2E5A',
    fontWeight: '600',
  },
  sosButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  sosLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  sosButtonAbsolute: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 70 : 60,
    left: '50%',
    marginLeft: -35, // Half of width to center
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
