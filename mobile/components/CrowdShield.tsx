import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useWebSocket } from '@/hooks/useWebSocket';
import api from '@/services/api';
import { API_BASE_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';

import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const AppColors = {
  primary: '#8B2E5A',
  secondary: '#FFFFFF',
  accent: '#A84371',
  background: '#F5F5F5',
  text: '#000000',
  textSecondary: '#666666',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  police: '#1E40AF',
  hospital: '#DC2626',
};

const GOOGLE_MAPS_API_KEY = 'AIzaSyDWmZkfE6DvnNaf3nbPjgq8uOmBMg3d7_c';

interface CrowdShieldProps {
  visible: boolean;
}

export default function CrowdShield({ visible }: CrowdShieldProps) {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [safeHavens, setSafeHavens] = useState<any[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const socket = useWebSocket(); // Get socket instance directly

  const [helperLocation, setHelperLocation] = useState<any>(null);
  const [isVictimMode, setIsVictimMode] = useState(false);
  const [helperInfo, setHelperInfo] = useState<any>(null);

  const params = useLocalSearchParams();

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  // WebSocket for receiving Crowd Alerts
  useWebSocket((data) => {
    if (data.type === 'CROWD_ALERT') {
      console.log('🛡️ Received Crowd Shield Alert:', data);
      setActiveAlert(data);
      setIsVictimMode(false);
      
      // Calculate initial distance if we have location
      if (location) {
          const dist = calculateDistance(location.latitude, location.longitude, data.latitude, data.longitude);
          setCurrentDistance(dist);
      }

      // Center map to show both user and victim
      if (location && mapRef.current) {
        mapRef.current.fitToCoordinates([
          { latitude: location.latitude, longitude: location.longitude },
          { latitude: data.latitude, longitude: data.longitude },
        ], {
          edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
          animated: true,
        });
      }
    } else if (data.type === 'SOS_ALERT') {
      console.log('🚨 Received SOS Alert in CrowdShield:', data);
      setActiveAlert({
        ...data,
        distance: 0 
      });
      setIsVictimMode(false);
    }
  });

  // Listen for Help Accepted (Victim Side)
  useEffect(() => {
      if (!socket) return;

      socket.on('help_accepted', (data: any) => {
          console.log('🤝 Help Accepted:', data);
          setIsVictimMode(true);
          setHelperInfo(data);
          setHelperLocation({
              latitude: data.latitude,
              longitude: data.longitude
          });
          
          Alert.alert(
              'Help is on the way!', 
              `${data.helperName} is coming to help you.`,
              [
                  { text: 'View on Map', onPress: () => {} }
              ]
          );
      });

      socket.on('helper_location_update', (data: any) => {
          console.log('📍 Helper Location Update:', data);
          setHelperLocation({
              latitude: data.latitude,
              longitude: data.longitude
          });
          
          if (location) {
              const dist = calculateDistance(location.latitude, location.longitude, data.latitude, data.longitude);
              setCurrentDistance(dist);
          }
      });

      return () => {
          socket.off('help_accepted');
          socket.off('helper_location_update');
      };
  }, [socket, location]);

  // Check for active alert passed via navigation params
  useEffect(() => {
    if (params.alertData) {
      try {
        const data = JSON.parse(params.alertData as string);
        console.log('🛡️ Loaded Alert from Params:', data);
        
        // Check if this is a "Help Accepted" payload (Victim Mode)
        if (data.helperId) {
            setIsVictimMode(true);
            setHelperInfo(data);
            setHelperLocation({
                latitude: data.latitude,
                longitude: data.longitude
            });
        } else {
            // Standard Alert (Helper Mode)
            setActiveAlert(data);
            setIsVictimMode(false);
        }
        
        // Calculate initial distance if we have location
        if (location && (data.latitude || (data.helperId && data.latitude))) {
            const targetLat = data.latitude;
            const targetLng = data.longitude;
            const dist = calculateDistance(location.latitude, location.longitude, targetLat, targetLng);
            setCurrentDistance(dist);
        }
      } catch (e) {
        console.error('Error parsing alert data:', e);
      }
    }
  }, [params.alertData, location]);

  useEffect(() => {
    if (visible) {
      initializeScreen();
    }
  }, [visible]);

  const initializeScreen = async () => {
    await requestLocationPermission();
  };

  const requestLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for Crowd Shield');
        return;
      }

      // Initial fetch for safe havens
      let currentLocation = await Location.getCurrentPositionAsync({});
      fetchNearbyPlaces(currentLocation.coords.latitude, currentLocation.coords.longitude);

      // Start watching position
      const sub = await Location.watchPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10
      }, (newLocation) => {
        const { latitude, longitude } = newLocation.coords;
        setLocation({
          latitude,
          longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.0121,
        });
        
        // Update backend
        updateBackendTracking(latitude, longitude);

        // If responding, send direct updates to victim
        if (isResponding && activeAlert && socket) {
            socket.emit('update_helper_location', {
                victimId: activeAlert.userId,
                latitude,
                longitude
            });
        }

        // Update distance if alert is active
        if (activeAlert) {
            const dist = calculateDistance(latitude, longitude, activeAlert.latitude, activeAlert.longitude);
            setCurrentDistance(dist);
        }
      });
      locationSubscription.current = sub;

    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Cleanup location subscription
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const updateBackendTracking = async (lat: number, lng: number) => {
    try {
      await api.post('/tracking/update', {
        latitude: lat,
        longitude: lng,
        lastActiveAt: new Date().toISOString(),
      });
      console.log('📍 Updated location for Crowd Shield');
    } catch (error) {
      console.error('Error updating backend tracking:', error);
    }
  };

  const fetchNearbyPlaces = async (lat: number, lng: number) => {
    try {
      const radius = 3000; // 3km
      const types = ['police', 'hospital', 'pharmacy'];
      let allPlaces: any[] = [];

      // Fetch for each type
      for (const type of types) {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results) {
          const places = data.results.map((place: any) => ({
            id: place.place_id,
            type: type,
            title: place.name,
            coordinate: {
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            },
            vicinity: place.vicinity
          }));
          allPlaces = [...allPlaces, ...places];
        }
      }

      setSafeHavens(allPlaces);
    } catch (error) {
      console.error('Error fetching nearby places:', error);
    }
  };

  // Helper to decode polyline
  const decodePolyline = (encoded: string) => {
    const points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({ latitude: (lat / 1E5), longitude: (lng / 1E5) });
    }
    return points;
  };

  // Auto-calculate route when alert and location are available
  useEffect(() => {
    const fetchRoute = async () => {
      if (!location) return;
      
      let origin, destination;
      
      if (isVictimMode && helperLocation) {
          // Route from Helper -> Victim (Self)
          origin = `${helperLocation.latitude},${helperLocation.longitude}`;
          destination = `${location.latitude},${location.longitude}`;
      } else if (activeAlert) {
          // Route from Self -> Victim
          origin = `${location.latitude},${location.longitude}`;
          destination = `${activeAlert.latitude},${activeAlert.longitude}`;
      } else {
          return;
      }

      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_MAPS_API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes.length > 0) {
          const points = decodePolyline(data.routes[0].overview_polyline.points);
          setRouteCoordinates(points);
        }
      } catch (error) {
        console.error('Error fetching directions:', error);
        // Fallback straight line
        if (isVictimMode && helperLocation) {
             setRouteCoordinates([
                { latitude: helperLocation.latitude, longitude: helperLocation.longitude },
                { latitude: location.latitude, longitude: location.longitude },
            ]);
        } else if (activeAlert) {
            setRouteCoordinates([
                { latitude: location.latitude, longitude: location.longitude },
                { latitude: activeAlert.latitude, longitude: activeAlert.longitude },
            ]);
        }
      }
    };

    if (location && (activeAlert || (isVictimMode && helperLocation))) {
        fetchRoute();
    }
  }, [activeAlert, location?.latitude, location?.longitude, helperLocation?.latitude, helperLocation?.longitude, isVictimMode]);

  const handleRespond = async () => {
    setIsResponding(true);
    
    if (socket && activeAlert) {
        const userStr = await AsyncStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : {};
        
        socket.emit('respond_to_sos', {
            victimId: activeAlert.userId,
            helperId: user.id,
            helperName: user.name || 'Helper',
            latitude: location.latitude,
            longitude: location.longitude
        });
    }

    Alert.alert('Response Sent', 'The victim has been notified that you are on your way.');
  };

  const handleCallPolice = () => {
    Alert.alert('Calling Police', 'Dialing 911...');
  };

  const handleRequestShield = async () => {
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    Alert.alert(
      'Activate Crowd Shield?',
      'This will alert all nearby users to your location.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'ACTIVATE',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.post('/crowd-shield/trigger', {
                latitude: location.latitude,
                longitude: location.longitude,
              });

              const data = response.data;
              if (data.success) {
                Alert.alert('Shield Activated', `Alert sent to ${data.data.helpersNotified} nearby helpers.`);
              } else {
                Alert.alert('Error', data.message || 'Failed to activate shield');
              }
            } catch (error) {
              console.error('Error triggering shield:', error);
              Alert.alert('Error', 'Failed to connect to server');
            }
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        {location ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={location}
            showsUserLocation={true}
            showsMyLocationButton={false}
            customMapStyle={mapStyle}
          >
            {/* Safe Havens */}
            {safeHavens.map(haven => (
              <Marker
                key={haven.id}
                coordinate={haven.coordinate}
                title={haven.title}
              >
                <View style={[styles.havenMarker, 
                  haven.type === 'police' ? styles.policeMarker : 
                  haven.type === 'hospital' ? styles.hospitalMarker : styles.pharmacyMarker
                ]}>
                  <Ionicons 
                    name={
                      haven.type === 'police' ? 'shield' : 
                      haven.type === 'hospital' ? 'medkit' : 'bandage'
                    } 
                    size={16} 
                    color="#FFFFFF" 
                  />
                </View>
              </Marker>
            ))}

            {/* Victim Marker (If Alert Active) */}
            {activeAlert && !isVictimMode && (
              <Marker
                coordinate={{
                  latitude: activeAlert.latitude,
                  longitude: activeAlert.longitude,
                }}
                title="Person in Need"
              >
                <View style={styles.victimMarkerContainer}>
                  <View style={styles.victimMarker}>
                    <Ionicons name="alert" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.victimPulse} />
                </View>
              </Marker>
            )}

            {/* Helper Marker (If Victim Mode) */}
            {isVictimMode && helperLocation && (
                <Marker
                    coordinate={{
                        latitude: helperLocation.latitude,
                        longitude: helperLocation.longitude,
                    }}
                    title={helperInfo?.helperName || "Helper"}
                >
                    <View style={styles.helperMarkerContainer}>
                        <View style={styles.helperMarker}>
                            <Ionicons name="car" size={24} color="#FFFFFF" />
                        </View>
                    </View>
                </Marker>
            )}

            {/* Route Line */}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={AppColors.primary}
                strokeWidth={4}
                lineDashPattern={[1]}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.loadingContainer}>
            <Text>Loading Shield Map...</Text>
          </View>
        )}

        {/* Top Status Bar */}
        <View style={styles.statusBar}>
          <View style={[styles.statusDot, activeAlert ? styles.statusDotAlert : styles.statusDotActive]} />
          <Text style={styles.statusText}>
            {activeAlert ? 'EMERGENCY ALERT ACTIVE' : 'Crowd Shield Active'}
          </Text>
        </View>

        {/* Back Button */}
        <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
        >
            <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        {/* Emergency Response Card */}
        {(activeAlert || isVictimMode) ? (
          <View style={[styles.alertCard, isVictimMode && styles.victimCard]}>
            <View style={styles.alertHeader}>
              <View style={[styles.alertIconContainer, isVictimMode && styles.victimIconContainer]}>
                <Ionicons name={isVictimMode ? "car" : "warning"} size={24} color="#FFFFFF" />
              </View>
              <View style={styles.alertInfo}>
                <Text style={[styles.alertTitle, isVictimMode && styles.victimTitle]}>
                    {isVictimMode 
                        ? (helperInfo?.helperName ? `${helperInfo.helperName.toUpperCase()} IS COMING` : 'HELP IS COMING')
                        : (activeAlert.userName ? activeAlert.userName.toUpperCase() : 'PERSON IN NEED')
                    }
                </Text>
                <Text style={styles.alertSubtitle}>
                  {currentDistance ? `${currentDistance.toFixed(2)}km away` : 'Nearby'}
                </Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              {!isVictimMode && (
                  !isResponding ? (
                    <TouchableOpacity 
                      style={styles.respondButton}
                      onPress={handleRespond}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.respondButtonText}>I'M GOING</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.respondingContainer}>
                      <Text style={styles.respondingText}>You are responding</Text>
                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => {
                          setIsResponding(false);
                          setActiveAlert(null);
                          setRouteCoordinates([]);
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )
              )}

              {isVictimMode && (
                  <View style={styles.respondingContainer}>
                      <Text style={styles.respondingText}>Help is on the way</Text>
                  </View>
              )}

              <TouchableOpacity 
                style={styles.policeButton}
                onPress={handleCallPolice}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Default State Overlay */
          <View style={styles.defaultOverlay}>
            {/* Activate Shield Button */}
            <TouchableOpacity style={styles.activateButton} onPress={handleRequestShield}>
              <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
              <Text style={styles.activateText}>ACTIVATE SHIELD</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const mapStyle = [
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#747474"}, {"lightness": "23"}]
  },
  {
    "featureType": "poi.attraction",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#f5f5f5"}, {"visibility": "on"}]
  },
  {
    "featureType": "poi.business",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#f5f5f5"}, {"visibility": "on"}]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#ffffff"}, {"lightness": 17}]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{"color": "#ffffff"}, {"lightness": 29}, {"weight": 0.2}]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#ffffff"}, {"lightness": 18}]
  },
  {
    "featureType": "road.local",
    "elementType": "geometry.fill",
    "stylers": [{"color": "#ffffff"}, {"lightness": 16}]
  }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: AppColors.success,
  },
  statusDotAlert: {
    backgroundColor: AppColors.danger,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.text,
    letterSpacing: 0.5,
  },
  havenMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  policeMarker: {
    backgroundColor: AppColors.police,
  },
  hospitalMarker: {
    backgroundColor: AppColors.hospital,
  },
  pharmacyMarker: {
    backgroundColor: AppColors.success,
  },
  victimMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  victimMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 2,
  },
  victimPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    zIndex: 1,
  },
  helperMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  alertCard: {
    position: 'absolute',
    bottom: 100, // Above navbar
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.danger,
  },
  victimCard: {
    borderLeftColor: AppColors.success,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  victimIconContainer: {
    backgroundColor: AppColors.success,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppColors.danger,
    marginBottom: 2,
  },
  victimTitle: {
    color: AppColors.success,
  },
  alertSubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  respondButton: {
    flex: 1,
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  respondButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  policeButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: AppColors.police,
    alignItems: 'center',
    justifyContent: 'center',
  },
  respondingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  respondingText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.success,
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: '600',
  },
  defaultOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E5E7EB',
  },
  activateButton: {
    backgroundColor: AppColors.danger,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  activateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
