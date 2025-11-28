import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Battery from 'expo-battery';
import CustomDrawer from '@/components/CustomDrawer';
import TrackingBottomSheet from '@/components/TrackingBottomSheet';
import { API_BASE_URL } from '@/constants/Config';

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

// Icon mapping for bubble types
const ICON_MAP: { [key: string]: any } = {
  girl: require('../assets/images/girl.png'),
  home: require('../assets/images/home.png'),
  friends: require('../assets/images/friends.png'),
  travel: require('../assets/images/travel.png'),
};

export default function MapTrackingScreen() {
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<any>(null);
  const [bubbles, setBubbles] = useState<any[]>([]);
  const [selectedBubble, setSelectedBubble] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('You');
  const [userId, setUserId] = useState<string>('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [memberLocations, setMemberLocations] = useState<any[]>([]);
  const [showMembersList, setShowMembersList] = useState(false);

  // Tracking data state
  const [trackingData, setTrackingData] = useState({
    userName: 'You',
    userPhone: '',
    batteryLevel: 0,
    signalStrength: 'Coming Soon',
    phoneStatus: 'Coming Soon',
    speed: 0,
    address: 'Loading...',
    idleTime: 'Idle for 0m',
  });
  const [lastActiveTime, setLastActiveTime] = useState(new Date());
  const [previousLocation, setPreviousLocation] = useState<any>(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    await requestLocationPermission();
    await fetchUserProfile();
    await fetchMyTrackingData(); // Fetch existing tracking data
    await fetchBubbles();
  };

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('User profile data:', JSON.stringify(data, null, 2));

        // Check multiple possible response structures
        const user = data.data?.user || data.user || data;

        if (user?.name) {
          console.log('Setting userName to:', user.name);
          setUserName(user.name);
          setTrackingData(prev => ({ ...prev, userName: user.name }));
        } else {
          console.log('No name found in user data');
        }

        if (user?.id) {
          console.log('Setting userId to:', user.id);
          setUserId(user.id);
        }

        if (user?.phone) {
          setTrackingData(prev => ({ ...prev, userPhone: user.phone }));
        }
      } else {
        console.log('Failed to fetch profile:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchMyTrackingData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/tracking/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const tracking = data.data?.tracking;

        if (tracking) {
          // Update tracking data from backend
          setTrackingData(prev => ({
            ...prev,
            batteryLevel: tracking.batteryLevel || prev.batteryLevel,
            signalStrength: tracking.signalStrength || prev.signalStrength,
            phoneStatus: tracking.phoneStatus || prev.phoneStatus,
            speed: tracking.speed || prev.speed,
            address: tracking.address || prev.address,
          }));

          // Set lastActiveTime from backend
          if (tracking.lastActiveAt) {
            const lastActive = new Date(tracking.lastActiveAt);
            setLastActiveTime(lastActive);

            // Calculate and set idle time
            const now = new Date();
            const diffMs = now.getTime() - lastActive.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            setTrackingData(prev => ({
              ...prev,
              idleTime: `Idle for ${diffMins}m`,
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error);
    }
  };

  // Initialize tracking monitors
  useEffect(() => {
    initializeTracking();

    // Update tracking data every 10 seconds
    const trackingInterval = setInterval(() => {
      updateTrackingData();
      // Also refresh member locations
      if (selectedBubble) {
        fetchMemberLocations(selectedBubble.id);
      }
    }, 10000);

    // Update idle time every minute
    const idleInterval = setInterval(() => {
      updateIdleTime();
    }, 60000);

    return () => {
      clearInterval(trackingInterval);
      clearInterval(idleInterval);
    };
  }, [location]);

  const initializeTracking = async () => {
    // Get battery level
    const batteryLevel = await Battery.getBatteryLevelAsync();
    setTrackingData(prev => ({
      ...prev,
      batteryLevel: Math.round(batteryLevel * 100)
    }));

    // Subscribe to battery updates
    Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setTrackingData(prev => ({
        ...prev,
        batteryLevel: Math.round(batteryLevel * 100)
      }));
    });
  };

  const updateTrackingData = async () => {
    try {
      // Get current location for speed calculation
      const currentLocation = await Location.getCurrentPositionAsync({});

      // Calculate speed
      if (previousLocation) {
        const speed = calculateSpeed(
          previousLocation.coords,
          currentLocation.coords,
          (currentLocation.timestamp - previousLocation.timestamp) / 1000
        );
        setTrackingData(prev => ({ ...prev, speed: Math.round(speed) }));
      }

      setPreviousLocation(currentLocation);

      // Get address from coordinates
      const address = await getAddressFromCoords(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );
      setTrackingData(prev => ({ ...prev, address }));

      // Update backend
      await updateBackendTracking();

    } catch (error) {
      console.error('Error updating tracking data:', error);
    }
  };

  const calculateSpeed = (
    prevCoords: any,
    currentCoords: any,
    timeInSeconds: number
  ): number => {
    // Haversine formula to calculate distance
    const R = 6371; // Earth's radius in km
    const dLat = toRad(currentCoords.latitude - prevCoords.latitude);
    const dLon = toRad(currentCoords.longitude - prevCoords.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(prevCoords.latitude)) *
      Math.cos(toRad(currentCoords.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Speed = distance / time (km/hr)
    return (distanceKm / timeInSeconds) * 3600;
  };

  const toRad = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  const getAddressFromCoords = async (
    latitude: number,
    longitude: number
  ): Promise<string> => {
    try {
      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (geocode.length > 0) {
        const location = geocode[0];
        const addressParts = [
          location.name,
          location.city,
          location.postalCode,
        ].filter(Boolean);

        return addressParts.join(', ') || 'Location unavailable';
      }

      return 'Location unavailable';
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Location unavailable';
    }
  };

  const updateIdleTime = () => {
    const now = new Date();
    const diffMs = now.getTime() - lastActiveTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    setTrackingData(prev => ({
      ...prev,
      idleTime: `Idle for ${diffMins}m`,
    }));
  };

  const updateBackendTracking = async () => {
    try {
      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({});

      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/tracking/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          batteryLevel: trackingData.batteryLevel,
          signalStrength: trackingData.signalStrength,
          phoneStatus: trackingData.phoneStatus,
          speed: trackingData.speed,
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          address: trackingData.address,
          lastActiveAt: new Date().toISOString(), // Send current timestamp
        }),
      });

      if (response.ok) {
        // Update local lastActiveTime after successful backend update
        setLastActiveTime(new Date());
      }
    } catch (error) {
      console.error('Error updating backend tracking:', error);
    }
  };

  const fetchUserTracking = async (targetUserId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/tracking/${targetUserId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.data?.user;
        const tracking = data.data?.tracking;

        // Calculate idle time
        let idleTimeText = 'Idle for 0m';
        if (tracking?.lastActiveAt) {
          const lastActive = new Date(tracking.lastActiveAt);
          const now = new Date();
          const diffMs = now.getTime() - lastActive.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          idleTimeText = `Idle for ${diffMins}m`;
        }

        setTrackingData({
          userName: user?.name || 'User',
          userPhone: user?.phone || '',
          batteryLevel: tracking?.batteryLevel || 0,
          signalStrength: tracking?.signalStrength || 'Coming Soon',
          phoneStatus: tracking?.phoneStatus || 'Coming Soon',
          speed: tracking?.speed || 0,
          address: tracking?.address || 'Location unavailable',
          idleTime: idleTimeText,
        });
      }
    } catch (error) {
      console.error('Error fetching user tracking:', error);
    }
  };

  const handleMarkerPress = async (targetUserId: string) => {
    setSelectedUserId(targetUserId);
    await fetchUserTracking(targetUserId);
    setBottomSheetVisible(true);
  };

  const handleCloseBottomSheet = () => {
    setBottomSheetVisible(false);
    setSelectedUserId(null);
  };

  const handleNavigate = () => {
    // Open navigation to current location
    Alert.alert(
      'Navigate',
      'This will open navigation to the user\'s location',
      [{ text: 'OK' }]
    );
  };

  const requestLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const fetchBubbles = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/bubbles`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const bubblesData = data.data || [];
        setBubbles(bubblesData);

        // If no bubbles exist, redirect to create-bubble screen
        if (bubblesData.length === 0) {
          console.log('No bubbles found, redirecting to create-bubble');
          router.replace('/create-bubble');
          return;
        }

        // Auto-select the first active bubble
        if (bubblesData.length > 0) {
          setSelectedBubble(bubblesData[0]);
          // Fetch member locations for the first bubble
          await fetchMemberLocations(bubblesData[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching bubbles:', error);
      // On error, also redirect to home screen
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberLocations = async (bubbleId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      console.log('🔍 Fetching member locations for bubble:', bubbleId);

      const response = await fetch(`${API_BASE_URL}/bubbles/${bubbleId}/members/locations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📍 Member locations received:', JSON.stringify(data.data.members, null, 2));
        setMemberLocations(data.data.members || []);
      } else {
        console.error('❌ Failed to fetch member locations:', response.status);
      }
    } catch (error) {
      console.error('Error fetching member locations:', error);
    }
  };

  const flyToMemberLocation = (member: any) => {
    if (member.tracking?.latitude && member.tracking?.longitude && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: member.tracking.latitude,
        longitude: member.tracking.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);

      // Also show their tracking details
      handleMarkerPress(member.id);
    }
  };

  const getBubbleMembers = (bubble: any) => {
    return bubble.members?.length || 0;
  };

  return (
    <View style={styles.container}>
      {/* Map - Full Screen */}
      <View style={styles.mapWrapper}>
        {location ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={location}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {/* User's location marker */}
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title={userName}
              onPress={() => handleMarkerPress(userId)}
            >
              <View style={styles.markerContainer}>
                <View style={styles.marker}>
                  <Text style={styles.markerText}>{userName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.markerArrow} />
              </View>
            </Marker>

            {/* Members markers for selected bubble */}
            {(() => {
              console.log('🗺️ Rendering markers...');
              console.log('Total member locations:', memberLocations.length);
              console.log('Current userId:', userId);

              const filteredMembers = memberLocations
                ?.filter((member: any) => member.id !== userId)
                ?.filter((member: any) => member.tracking?.latitude && member.tracking?.longitude);

              console.log('Filtered members to show:', filteredMembers.length);

              return filteredMembers?.map((member: any, index: number) => {
                console.log(`Rendering marker for ${member.name} at`, member.tracking.latitude, member.tracking.longitude);

                const memberName = member.name || 'Member';
                const memberUserId = member.id;

                // Generate different colors for each member
                const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];
                const memberColor = colors[index % colors.length];

                return (
                  <Marker
                    key={member.id}
                    coordinate={{
                      latitude: member.tracking.latitude,
                      longitude: member.tracking.longitude,
                    }}
                    title={memberName}
                    onPress={() => handleMarkerPress(memberUserId)}
                  >
                    <View style={styles.markerContainer}>
                      <View style={[styles.memberMarker, { backgroundColor: memberColor }]}>
                        <Text style={styles.memberMarkerText}>
                          {memberName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.memberMarkerArrow, { borderTopColor: memberColor }]} />
                    </View>
                  </Marker>
                );
              });
            })()}
          </MapView>
        ) : (
          <View style={styles.loadingContainer}>
            <Text>Loading map...</Text>
          </View>
        )}

        {/* Members List Toggle Button */}
        <TouchableOpacity
          style={styles.membersToggleButton}
          onPress={() => setShowMembersList(!showMembersList)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={showMembersList ? "chevron-up" : "people"}
            size={20}
            color="#FFFFFF"
          />
          {!showMembersList && memberLocations.length > 0 && (
            <View style={styles.membersBadge}>
              <Text style={styles.membersBadgeText}>{memberLocations.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Horizontal Members List */}
        {showMembersList && memberLocations.length > 0 && (
          <View style={styles.membersListContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.membersListScroll}
            >
              {/* Current User */}
              <TouchableOpacity
                style={styles.memberCard}
                onPress={() => {
                  if (location && mapRef.current) {
                    mapRef.current.animateToRegion({
                      latitude: location.latitude,
                      longitude: location.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }, 1000);
                    handleMarkerPress(userId);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.memberAvatar, { backgroundColor: '#333333' }]}>
                  <Text style={styles.memberAvatarText}>{userName.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>{userName}</Text>
                <Text style={styles.memberLabel}>You</Text>
              </TouchableOpacity>

              {/* Other Members */}
              {memberLocations
                .filter((member: any) => member.id !== userId)
                .filter((member: any) => member.tracking?.latitude && member.tracking?.longitude)
                .map((member: any, index: number) => {
                  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];
                  const memberColor = colors[index % colors.length];

                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={styles.memberCard}
                      onPress={() => flyToMemberLocation(member)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.memberAvatar, { backgroundColor: memberColor }]}>
                        <Text style={styles.memberAvatarText}>
                          {(member.name || 'M').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {member.name || 'Member'}
                      </Text>
                      <View style={styles.memberStats}>
                        <Ionicons name="navigate" size={10} color={AppColors.textSecondary} />
                        <Text style={styles.memberStatsText}>
                          {member.tracking?.speed || 0} km/h
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        )}

        {/* Map Controls */}
        <TouchableOpacity style={styles.incognitoButton}>
          <Ionicons name="glasses-outline" size={24} color={AppColors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color={AppColors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsButton}>
          <View style={styles.settingsIconContainer}>
            <Ionicons name="people" size={18} color={AppColors.primary} />
          </View>
          <Text style={styles.settingsText}>Settings</Text>
        </TouchableOpacity>

        {/* Top gradient overlay on map */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0)']}
          style={styles.mapTopGradient}
          pointerEvents="none"
        />
      </View>

      {/* Header - Floating on top */}
      <SafeAreaView style={styles.headerContainer}>
        <View style={styles.header}>
          <Image
            source={require('../assets/images/Alertnate_logo.png')}
            style={styles.logo}
          />
          <Text style={styles.headerTitle}>ALERTMATE</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="notifications-outline" size={24} color={AppColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => setDrawerVisible(true)}
            >
              <Ionicons name="menu" size={24} color={AppColors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bubbles Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bubblesScroll}
          style={styles.bubblesContainer}
        >
          {/* Create Button */}
          <TouchableOpacity
            style={styles.bubbleItem}
            onPress={() => router.push('/create-bubble')}
          >
            <View style={styles.smallCircle}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.bubbleLabel}>Create</Text>
          </TouchableOpacity>

          {/* Join Button */}
          <TouchableOpacity
            style={styles.bubbleItem}
            onPress={() => router.push('/join-bubble')}
          >
            <View style={[styles.smallCircle, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.bubbleLabel}>Join</Text>
          </TouchableOpacity>

          {/* User's Bubbles from DB */}
          {bubbles.map((bubble) => (
            <TouchableOpacity
              key={bubble.id}
              style={styles.bubbleItem}
              onPress={() => setSelectedBubble(bubble)}
            >
              <View
                style={[
                  styles.smallCircle,
                  { backgroundColor: bubble.color },
                  selectedBubble?.id === bubble.id && styles.selectedBubble
                ]}
              >
                <Image
                  source={ICON_MAP[bubble.icon] || ICON_MAP.girl}
                  style={styles.bubbleIcon}
                />
                {selectedBubble?.id === bubble.id && (
                  <View style={styles.smallCheckmark}>
                    <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                  </View>
                )}
              </View>
              <Text style={styles.bubbleLabel} numberOfLines={1}>
                {bubble.name.length > 8 ? bubble.name.substring(0, 8) + '...' : bubble.name}
              </Text>
              <Text style={styles.memberCount}>{getBubbleMembers(bubble)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Top gradient for smooth merge */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0)']}
          style={styles.topGradient}
          pointerEvents="none"
        />
      </SafeAreaView>

      {/* Bottom Navigation - Floating */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="share-social" size={24} color={AppColors.primary} />
          <Text style={styles.navLabel}>Connect</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/shield')}
        >
          <Ionicons name="shield-checkmark-outline" size={24} color={AppColors.text} />
          <Text style={styles.navLabel}>Shield</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sosButton}
          onPress={() => {
            console.log('🚨 SOS BUTTON CLICKED FROM MAP TRACKING');
            router.push('/sos-countdown');
          }}
        >
          <Ionicons name="notifications" size={32} color="#FFFFFF" />
          <Text style={styles.sosLabel}>SOS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/start-trip')}
        >
          <Ionicons name="car-outline" size={24} color={AppColors.text} />
          <Text style={styles.navLabel}>Start Trip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/offline-chat')}
        >
          <Ionicons name="chatbubbles-outline" size={24} color={AppColors.text} />
          <Text style={styles.navLabel}>Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Drawer */}
      <CustomDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />

      {/* Tracking Bottom Sheet */}
      <TrackingBottomSheet
        trackingData={trackingData}
        onNavigate={handleNavigate}
        onClose={handleCloseBottomSheet}
        visible={bottomSheetVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logo: {
    width: 34,
    height: 34,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: AppColors.primary,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIcon: {
    padding: 4,
  },
  bubblesContainer: {
    backgroundColor: '#FFFFFF',
  },
  bubblesScroll: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  bubbleItem: {
    alignItems: 'center',
    width: 60,
  },
  smallCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  selectedBubble: {
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  bubbleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  smallCheckmark: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
  },
  bubbleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.text,
    textAlign: 'center',
  },
  memberCount: {
    fontSize: 9,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  topGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    zIndex: 1,
  },
  mapTopGradient: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 50,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#FF7B7B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  markerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#333333',
    marginTop: 2,
  },
  memberMarker: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#FF7B7B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  memberMarkerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  memberMarkerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: AppColors.primary, // Will be overridden by inline style
    marginTop: 2,
  },
  incognitoButton: {
    position: 'absolute',
    top: height * 0.2,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 60,
  },
  infoButton: {
    position: 'absolute',
    top: height * 0.2 + 65,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 60,
  },
  settingsButton: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 60,
  },
  settingsIconContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    padding: 4,
  },
  settingsText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 200,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 11,
    color: AppColors.text,
  },
  sosButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: AppColors.sos,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 2,
  },
  sosLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  membersToggleButton: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 70,
  },
  membersBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  membersBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  membersListContainer: {
    position: 'absolute',
    bottom: 175,
    left: 20,
    right: 20,
    maxWidth: width - 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 65,
  },
  membersListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  membersListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
  },
  membersListScroll: {
    paddingHorizontal: 8,
    gap: 10,
  },
  memberCard: {
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 10,
    width: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  memberName: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: 3,
  },
  memberLabel: {
    fontSize: 9,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  memberStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  memberStatsText: {
    fontSize: 9,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
});
