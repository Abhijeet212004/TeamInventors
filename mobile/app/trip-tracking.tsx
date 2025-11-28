import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    Linking,
    Dimensions,
    Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/Config';
import * as Location from 'expo-location';
// Change started
import { useSafetyCheck } from '@/contexts/SafetyCheckContext';
// Change ended

const { width, height } = Dimensions.get('window');

const AppColors = {
    primary: '#8B2E5A',
    secondary: '#FFFFFF',
    accent: '#A84371',
    background: '#F5F5F5',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E0E0E0',
    sos: '#EF4444',
};

const GOOGLE_MAPS_API_KEY = 'AIzaSyDWmZkfE6DvnNaf3nbPjgq8uOmBMg3d7_c';

// Helper function to decode Google polyline
const decodePolyline = (encoded: string) => {
    const points = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
        let b;
        let shift = 0;
        let result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        lng += dlng;

        points.push({
            latitude: lat / 1e5,
            longitude: lng / 1e5,
        });
    }

    return points;
};

// Helper function to get directions from Google Directions API
const getDirections = async (origin: any, destination: any, waypoints: any[] = []) => {
    try {
        const waypointsParam = waypoints.length > 0
            ? `&waypoints=${waypoints.map((wp) => `${wp.latitude},${wp.longitude}`).join('|')}`
            : '';

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}${waypointsParam}&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.routes.length > 0) {
            const route = data.routes[0];
            const encodedPolyline = route.overview_polyline.points;
            const coordinates = decodePolyline(encodedPolyline);

            return {
                coordinates,
                distance: route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0),
                duration: route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0),
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching directions:', error);
        return null;
    }
};

export default function TripTrackingScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { tripId } = params;
    const mapRef = useRef<MapView>(null);

    const [trip, setTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<any>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
    const [tripDistance, setTripDistance] = useState<number>(0);
    const [tripDuration, setTripDuration] = useState<number>(0);
    const [isNavigating, setIsNavigating] = useState(false);
    const [nextWaypoint, setNextWaypoint] = useState<any>(null);
    const [distanceToNext, setDistanceToNext] = useState<number>(0);

    // Change started
    const { isActive: isSafetyActive, nextCheckTime } = useSafetyCheck();
    const [timeUntilCheck, setTimeUntilCheck] = useState<string>('');

    useEffect(() => {
        if (isSafetyActive && nextCheckTime) {
            const interval = setInterval(() => {
                const now = Date.now();
                const diff = nextCheckTime - now;
                
                if (diff <= 0) {
                    setTimeUntilCheck('Now');
                } else {
                    const minutes = Math.floor(diff / 60000);
                    const seconds = Math.floor((diff % 60000) / 1000);
                    setTimeUntilCheck(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [isSafetyActive, nextCheckTime]);
    // Change ended

    useEffect(() => {
        fetchTripDetails();
        startLocationTracking();

        return () => {
            // Cleanup location tracking
        };
    }, []);

    const fetchTripDetails = async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/trips/${tripId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const tripData = data.data;
                setTrip(tripData);

                // Build waypoints for directions
                const origin = {
                    latitude: tripData.startLat,
                    longitude: tripData.startLng,
                };

                const destination = {
                    latitude: tripData.endLat,
                    longitude: tripData.endLng,
                };

                const waypoints = tripData.stops && tripData.stops.length > 0
                    ? tripData.stops
                        .sort((a: any, b: any) => a.sequence - b.sequence)
                        .map((stop: any) => ({
                            latitude: stop.latitude,
                            longitude: stop.longitude,
                        }))
                    : [];

                // Fetch directions from Google
                const directions = await getDirections(origin, destination, waypoints);

                if (directions) {
                    console.log('✅ Directions fetched successfully');
                    setRouteCoordinates(directions.coordinates);
                    setTripDistance(directions.distance);
                    setTripDuration(directions.duration);

                    // Fit map to show entire route
                    setTimeout(() => {
                        if (mapRef.current && directions.coordinates.length > 0) {
                            mapRef.current.fitToCoordinates(directions.coordinates, {
                                edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                                animated: true,
                            });
                        }
                    }, 1000);
                } else {
                    console.log('⚠️ Directions API failed, using fallback lines');
                    // Fallback to straight lines if directions fail
                    const coordinates = [origin];
                    if (waypoints.length > 0) {
                        coordinates.push(...waypoints);
                    }
                    coordinates.push(destination);
                    setRouteCoordinates(coordinates);

                    setTimeout(() => {
                        if (mapRef.current) {
                            mapRef.current.fitToCoordinates(coordinates, {
                                edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                                animated: true,
                            });
                        }
                    }, 1000);
                }
            } else {
                Alert.alert('Error', 'Failed to load trip details');
                router.back();
            }
        } catch (error) {
            console.error('Error fetching trip:', error);
            Alert.alert('Error', 'Failed to load trip');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const startLocationTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required');
                return;
            }

            // Get initial location
            const location = await Location.getCurrentPositionAsync({});
            const newLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            setUserLocation(newLocation);

            // Set initial next waypoint
            if (trip) {
                setNextWaypoint({
                    latitude: trip.startLat,
                    longitude: trip.startLng,
                    name: 'Start',
                });
            }

            // Watch position updates
            Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000, // Update every 5 seconds
                    distanceInterval: 10, // Update every 10 meters
                },
                (location) => {
                    const newLocation = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    };
                    setUserLocation(newLocation);

                    // Auto-center map if navigating
                    if (isNavigating && mapRef.current) {
                        mapRef.current.animateToRegion({
                            ...newLocation,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }, 500);
                    }

                    // Calculate distance to next waypoint
                    if (nextWaypoint) {
                        const distance = calculateDistance(
                            location.coords.latitude,
                            location.coords.longitude,
                            nextWaypoint.latitude,
                            nextWaypoint.longitude
                        );
                        setDistanceToNext(distance);

                        // Auto-advance to next waypoint if within 50 meters
                        if (distance < 0.05 && trip) {
                            updateNextWaypoint();
                        }
                    }

                    // Update backend with current location
                    updateBackendTracking(location.coords.latitude, location.coords.longitude);
                }
            );
        } catch (error) {
            console.error('Error tracking location:', error);
        }
    };

    // Calculate distance between two coordinates (in km)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Update next waypoint based on progress
    const updateNextWaypoint = () => {
        if (!trip) return;

        const waypoints = [];

        // Add stops
        if (trip.stops && trip.stops.length > 0) {
            trip.stops
                .sort((a: any, b: any) => a.sequence - b.sequence)
                .forEach((stop: any) => {
                    waypoints.push({
                        latitude: stop.latitude,
                        longitude: stop.longitude,
                        name: `Stop ${stop.sequence}`,
                    });
                });
        }

        // Add end location
        waypoints.push({
            latitude: trip.endLat,
            longitude: trip.endLng,
            name: 'Destination',
        });

        // Find current waypoint index
        const currentIndex = waypoints.findIndex(
            (wp) => wp.latitude === nextWaypoint?.latitude && wp.longitude === nextWaypoint?.longitude
        );

        // Move to next waypoint
        if (currentIndex < waypoints.length - 1) {
            setNextWaypoint(waypoints[currentIndex + 1]);
        }
    };

    const updateBackendTracking = async (latitude: number, longitude: number) => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            await fetch(`${API_BASE_URL}/tracking`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    latitude,
                    longitude,
                }),
            });
        } catch (error) {
            console.error('Error updating tracking:', error);
        }
    };

    const handleNavigate = () => {
        if (!trip) return;

        setIsNavigating(!isNavigating);

        if (!isNavigating) {
            // Start navigation - center on user
            if (userLocation && mapRef.current) {
                mapRef.current.animateToRegion({
                    ...userLocation,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }, 500);
            }

            // Set first waypoint if not set
            if (!nextWaypoint && trip.stops && trip.stops.length > 0) {
                const firstStop = trip.stops.sort((a: any, b: any) => a.sequence - b.sequence)[0];
                setNextWaypoint({
                    latitude: firstStop.latitude,
                    longitude: firstStop.longitude,
                    name: `Stop ${firstStop.sequence}`,
                });
            } else if (!nextWaypoint) {
                setNextWaypoint({
                    latitude: trip.endLat,
                    longitude: trip.endLng,
                    name: 'Destination',
                });
            }
        }
    };

    const handleEndTrip = async () => {
        Alert.alert(
            'End Trip',
            'Are you sure you want to end this trip?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'End Trip',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const token = await AsyncStorage.getItem('authToken');

                            const response = await fetch(`${API_BASE_URL}/trips/${tripId}/status`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ status: 'COMPLETED' }),
                            });

                            if (response.ok) {
                                Alert.alert('Success', 'Trip ended successfully', [
                                    {
                                        text: 'OK',
                                        onPress: () => router.replace('/start-trip'),
                                    },
                                ]);
                            } else {
                                Alert.alert('Error', 'Failed to end trip');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to end trip');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleRecenter = () => {
        if (userLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                ...userLocation,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 500);
        }
    };

    if (loading || !trip) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={AppColors.primary} />
                    <Text style={styles.loadingText}>Loading trip...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            {/* Map */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={userLocation || {
                    latitude: trip.startLat,
                    longitude: trip.startLng,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
            >
                {/* Route Polyline */}
                {routeCoordinates.length > 0 && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={AppColors.primary}
                        strokeWidth={4}
                    />
                )}

                {/* Start Marker */}
                <Marker
                    coordinate={{
                        latitude: trip.startLat,
                        longitude: trip.startLng,
                    }}
                    title="Start"
                    description={trip.startAddress}
                >
                    <View style={styles.markerContainer}>
                        <View style={[styles.marker, { backgroundColor: '#10B981' }]}>
                            <Ionicons name="location" size={24} color="#FFFFFF" />
                        </View>
                    </View>
                </Marker>

                {/* Stop Markers */}
                {trip.stops &&
                    trip.stops.map((stop: any) => (
                        <Marker
                            key={stop.id}
                            coordinate={{
                                latitude: stop.latitude,
                                longitude: stop.longitude,
                            }}
                            title={`Stop ${stop.sequence}`}
                            description={stop.address}
                        >
                            <View style={styles.markerContainer}>
                                <View style={[styles.marker, { backgroundColor: '#F59E0B' }]}>
                                    <Text style={styles.markerText}>{stop.sequence}</Text>
                                </View>
                            </View>
                        </Marker>
                    ))}

                {/* End Marker */}
                <Marker
                    coordinate={{
                        latitude: trip.endLat,
                        longitude: trip.endLng,
                    }}
                    title="Destination"
                    description={trip.endAddress}
                >
                    <View style={styles.markerContainer}>
                        <View style={[styles.marker, { backgroundColor: AppColors.sos }]}>
                            <Ionicons name="flag" size={20} color="#FFFFFF" />
                        </View>
                    </View>
                </Marker>
            </MapView>

            {/* Header Overlay */}
            <SafeAreaView style={styles.headerContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={AppColors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {trip.name || 'Trip in Progress'}
                    </Text>
                    <TouchableOpacity onPress={handleEndTrip} style={styles.endButton}>
                        <Text style={styles.endButtonText}>End</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Navigation Overlay */}
            {isNavigating && nextWaypoint && (
                <View style={styles.navigationOverlay}>
                    <View style={styles.navigationCard}>
                        <Ionicons name="navigate-circle" size={32} color={AppColors.primary} />
                        <View style={styles.navigationInfo}>
                            <Text style={styles.navigationDistance}>
                                {distanceToNext < 1
                                    ? `${(distanceToNext * 1000).toFixed(0)} m`
                                    : `${distanceToNext.toFixed(1)} km`}
                            </Text>
                            <Text style={styles.navigationLabel}>to {nextWaypoint.name}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setIsNavigating(false)}
                            style={styles.stopNavButton}
                        >
                            <Ionicons name="close-circle" size={24} color={AppColors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Bottom Info Card */}
            <View style={styles.bottomCard}>
                {/* Change started */}
                {isSafetyActive && nextCheckTime && (
                    <View style={styles.safetyStatusContainer}>
                        <View style={styles.safetyStatusBadge}>
                            <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                            <Text style={styles.safetyStatusText}>
                                Next Check: {timeUntilCheck}
                            </Text>
                        </View>
                    </View>
                )}
                {/* Change ended */}

                <View style={styles.tripInfoRow}>
                    <View style={styles.tripInfoItem}>
                        <Ionicons name="location" size={20} color="#10B981" />
                        <View style={styles.tripInfoTextContainer}>
                            <Text style={styles.tripInfoLabel}>From</Text>
                            <Text style={styles.tripInfoValue} numberOfLines={1}>
                                {trip.startAddress}
                            </Text>
                        </View>
                    </View>
                </View>

                {trip.stops && trip.stops.length > 0 && (
                    <View style={styles.stopsInfo}>
                        <Ionicons name="ellipsis-horizontal" size={16} color={AppColors.textSecondary} />
                        <Text style={styles.stopsText}>{trip.stops.length} stop(s)</Text>
                    </View>
                )}

                <View style={styles.tripInfoRow}>
                    <View style={styles.tripInfoItem}>
                        <Ionicons name="flag" size={20} color={AppColors.sos} />
                        <View style={styles.tripInfoTextContainer}>
                            <Text style={styles.tripInfoLabel}>To</Text>
                            <Text style={styles.tripInfoValue} numberOfLines={1}>
                                {trip.endAddress}
                            </Text>
                        </View>
                    </View>
                </View>

                {tripDistance > 0 && (
                    <View style={styles.tripStatsContainer}>
                        <View style={styles.tripStatItem}>
                            <Ionicons name="navigate-outline" size={18} color={AppColors.primary} />
                            <Text style={styles.tripStatLabel}>Distance</Text>
                            <Text style={styles.tripStatValue}>
                                {(tripDistance / 1000).toFixed(1)} km
                            </Text>
                        </View>
                        <View style={styles.tripStatDivider} />
                        <View style={styles.tripStatItem}>
                            <Ionicons name="time-outline" size={18} color={AppColors.primary} />
                            <Text style={styles.tripStatLabel}>Duration</Text>
                            <Text style={styles.tripStatValue}>
                                {Math.floor(tripDuration / 60)} min
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.navigateButton} onPress={handleNavigate}>
                        <Ionicons
                            name={isNavigating ? "pause-circle" : "navigate-circle"}
                            size={24}
                            color="#FFFFFF"
                        />
                        <Text style={styles.navigateButtonText}>
                            {isNavigating ? 'Stop Navigation' : 'Start Navigation'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.endTripButton} onPress={handleEndTrip}>
                        <Ionicons name="stop-circle" size={24} color="#FFFFFF" />
                        <Text style={styles.endTripButtonText}>End Trip</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* SOS Button - Floating above everything */}
            <TouchableOpacity
                style={styles.recenterButton}
                onPress={handleRecenter}
                activeOpacity={0.7}
            >
                <Ionicons name="locate" size={24} color={AppColors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.sosButton}
                onPress={() => {
                    console.log('=== SOS BUTTON PRESSED ===');
                    Alert.alert('SOS', 'Button works! Redirecting...', [
                        { text: 'Cancel' },
                        { text: 'OK', onPress: () => router.push('/sos-countdown') }
                    ]);
                }}
                activeOpacity={0.7}
            >
                <Ionicons name="warning" size={24} color="#FFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: AppColors.textSecondary,
    },
    map: {
        width: width,
        height: height,
    },
    overlay: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 15,
        borderRadius: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    tripInfo: {
        marginBottom: 10,
    },
    tripTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: AppColors.text,
    },
    tripSubtitle: {
        fontSize: 14,
        color: AppColors.textSecondary,
        marginTop: 5,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: AppColors.textSecondary,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: AppColors.primary,
    },
    navigationControls: {
        position: 'absolute',
        bottom: 40,
        right: 20,
        alignItems: 'center',
    },
    navButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: AppColors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    recenterButton: {
        position: 'absolute',
        bottom: 390,
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    sosButton: {
        position: 'absolute',
        bottom: 320, // Raised to clear the bottom card
        right: 20,   // Moved to right for better reachability
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: AppColors.sos,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    sosButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 18,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: AppColors.text,
        marginLeft: 12,
    },
    endButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: AppColors.sos,
        borderRadius: 20,
    },
    endButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    navigationOverlay: {
        position: 'absolute',
        top: 100,
        left: 16,
        right: 16,
        zIndex: 150,
    },
    navigationCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    navigationInfo: {
        flex: 1,
        marginLeft: 12,
    },
    navigationDistance: {
        fontSize: 24,
        fontWeight: '700',
        color: AppColors.text,
    },
    navigationLabel: {
        fontSize: 14,
        color: AppColors.textSecondary,
        marginTop: 2,
    },
    stopNavButton: {
        padding: 4,
    },
    markerContainer: {
        alignItems: 'center',
    },
    marker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    markerText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    userMarkerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    userMarkerPulse: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3B82F6',
        opacity: 0.3,
    },
    userMarker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    bottomCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10,
    },
    tripInfoRow: {
        marginBottom: 12,
    },
    tripInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tripInfoTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    tripInfoLabel: {
        fontSize: 12,
        color: AppColors.textSecondary,
        fontWeight: '600',
    },
    tripInfoValue: {
        fontSize: 14,
        color: AppColors.text,
        marginTop: 2,
    },
    stopsInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingLeft: 32,
        gap: 8,
    },
    stopsText: {
        fontSize: 13,
        color: AppColors.textSecondary,
    },
    tripStatsContainer: {
        flexDirection: 'row',
        backgroundColor: AppColors.background,
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
        marginBottom: 8,
    },
    tripStatItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    tripStatLabel: {
        fontSize: 11,
        color: AppColors.textSecondary,
        fontWeight: '600',
    },
    tripStatValue: {
        fontSize: 16,
        color: AppColors.text,
        fontWeight: '700',
    },
    tripStatDivider: {
        width: 1,
        backgroundColor: AppColors.border,
        marginHorizontal: 12,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    navigateButton: {
        flex: 1,
        backgroundColor: AppColors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 25,
        gap: 8,
    },
    navigateButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    endTripButton: {
        flex: 1,
        backgroundColor: AppColors.sos,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 25,
        gap: 8,
    },
    endTripButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    // Change started
    safetyStatusContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    safetyStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B981', // Green
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    safetyStatusText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    // Change ended
});
