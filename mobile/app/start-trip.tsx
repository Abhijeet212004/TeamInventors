import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    Keyboard,
    LogBox,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/Config';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
// Change started
import { useSafetyCheck } from '@/contexts/SafetyCheckContext';
import { Switch } from 'react-native';
// Change ended

// Ignore the VirtualizedList warning caused by GooglePlacesAutocomplete inside ScrollView
LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

const GOOGLE_MAPS_API_KEY = 'AIzaSyDWmZkfE6DvnNaf3nbPjgq8uOmBMg3d7_c';

const AppColors = {
    primary: '#8B2E5A',
    secondary: '#FFFFFF',
    accent: '#A84371',
    background: '#F5F5F5',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E0E0E0',
    inputBg: '#F9FAFB',
};

interface TripStop {
    sequence: number;
    latitude: number;
    longitude: number;
    address: string;
}

export default function StartTripScreen() {
    const [loading, setLoading] = useState(false);
    const [activeTrip, setActiveTrip] = useState<any>(null);
    const [checkingActiveTrip, setCheckingActiveTrip] = useState(false);

    // Form fields
    const [tripName, setTripName] = useState('');
    const [startLocation, setStartLocation] = useState('');
    const [startLat, setStartLat] = useState<number | null>(null);
    const [startLng, setStartLng] = useState<number | null>(null);
    const [endLocation, setEndLocation] = useState('');
    const [endLat, setEndLat] = useState<number | null>(null);
    const [endLng, setEndLng] = useState<number | null>(null);
    const [stops, setStops] = useState<TripStop[]>([]);
    const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

    // Change started
    const { startMonitoring } = useSafetyCheck();
    // Default to 15 minutes, but allow user to change
    const [checkInterval, setCheckInterval] = useState(15); 
    // Change ended

    // Refs for autocomplete
    const startLocationRef = useRef<any>(null);
    const endLocationRef = useRef<any>(null);
    const stopLocationRef = useRef<any>(null);

    useEffect(() => {
        checkForActiveTrip();
        requestLocationPermission();
    }, []);

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Location permission denied');
                return;
            }
            
            // Get current location for biasing autocomplete results
            const location = await Location.getCurrentPositionAsync({});
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
        } catch (error) {
            console.error('Error requesting location permission:', error);
        }
    };

    const checkForActiveTrip = async () => {
        try {
            setCheckingActiveTrip(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                setCheckingActiveTrip(false);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/trips/active`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data) {
                    setActiveTrip(data.data);
                }
            }
        } catch (error) {
            console.error('Error checking active trip:', error);
        } finally {
            setCheckingActiveTrip(false);
        }
    };

    const getCurrentLocation = async () => {
        try {
            setLoading(true);
            
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Permission to access location was denied');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            // Reverse geocode to get address
            const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
            let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            
            if (addresses && addresses.length > 0) {
                const addr = addresses[0];
                address = [addr.street, addr.city, addr.region, addr.country]
                    .filter(part => part)
                    .join(', ');
            }

            setStartLocation(address);
            setStartLat(latitude);
            setStartLng(longitude);

            // Update the autocomplete field
            if (startLocationRef.current) {
                startLocationRef.current.setAddressText(address);
                // Ensure list is closed
                startLocationRef.current.blur();
            }

            // Change started
            setUserLocation({ latitude, longitude });
            // Change ended
        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert('Error', 'Failed to get current location');
        } finally {
            setLoading(false);
        }
    };

    const addStopFromAutocomplete = (data: any, details: any) => {
        if (!details) return;

        const newStop: TripStop = {
            sequence: stops.length + 1,
            latitude: details.geometry.location.lat,
            longitude: details.geometry.location.lng,
            address: data.description,
        };

        setStops([...stops, newStop]);

        // Clear the autocomplete
        if (stopLocationRef.current) {
            stopLocationRef.current.setAddressText('');
        }
    };

    const removeStop = (index: number) => {
        const updatedStops = stops.filter((_, i) => i !== index);
        // Re-sequence the remaining stops
        const resequenced = updatedStops.map((stop, i) => ({
            ...stop,
            sequence: i + 1,
        }));
        setStops(resequenced);
    };

    const handleStartTrip = async () => {
        // Validation
        if (!startLocation || !endLocation) {
            Alert.alert('Error', 'Please enter both start and end locations');
            return;
        }

        if (!startLat || !startLng || !endLat || !endLng) {
            Alert.alert('Error', 'Please select locations from the suggestions');
            return;
        }

        setLoading(true);

        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                Alert.alert('Error', 'You must be logged in');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/trips`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: tripName || undefined,
                    startLat,
                    startLng,
                    startAddress: startLocation,
                    endLat,
                    endLng,
                    endAddress: endLocation,
                    stops: stops.length > 0 ? stops : undefined,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Change started
                // Start Safety Agent with selected interval
                startMonitoring(checkInterval);
                // Change ended

                // Navigate to trip tracking screen
                router.push({
                    pathname: '/trip-tracking',
                    params: { tripId: data.data.id },
                });
            } else {
                Alert.alert('Error', data.message || 'Failed to start trip');
            }
        } catch (error) {
            console.error('Error starting trip:', error);
            Alert.alert('Error', 'Failed to start trip. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleEndTrip = async () => {
        if (!activeTrip) return;

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

                            const response = await fetch(`${API_BASE_URL}/trips/${activeTrip.id}/status`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ status: 'COMPLETED' }),
                            });

                            if (response.ok) {
                                Alert.alert('Success', 'Trip ended successfully');
                                setActiveTrip(null);
                                setTripName('');
                                setStartLocation('');
                                setEndLocation('');
                                setStops([]);
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

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={AppColors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {activeTrip ? 'Active Trip' : 'Start Trip'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {activeTrip ? (
                    // Active Trip View - Navigate to trip tracking
                    <View style={styles.activeTripContainer}>
                        <View style={styles.activeTripHeader}>
                            <Ionicons name="navigate-circle" size={60} color={AppColors.primary} />
                            <Text style={styles.activeTripTitle}>
                                {activeTrip.name || 'Trip in Progress'}
                            </Text>
                            <Text style={styles.activeTripSubtitle}>
                                Started {new Date(activeTrip.startedAt).toLocaleTimeString()}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.viewTripButton}
                            onPress={() => router.push({
                                pathname: '/trip-tracking',
                                params: { tripId: activeTrip.id },
                            })}
                        >
                            <Ionicons name="map" size={24} color="#FFFFFF" />
                            <Text style={styles.viewTripButtonText}>View on Map</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.endTripButton}
                            onPress={handleEndTrip}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="stop-circle" size={24} color="#FFFFFF" />
                                    <Text style={styles.endTripButtonText}>End Trip</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    // Start New Trip Form
                    <View style={styles.formContainer}>
                        <Text style={styles.sectionTitle}>Trip Details</Text>

                        {/* Trip Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Trip Name (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Trip to Office"
                                value={tripName}
                                onChangeText={setTripName}
                                placeholderTextColor={AppColors.textSecondary}
                            />
                        </View>

                        {/* Start Location with Autocomplete */}
                        <View style={[styles.inputGroup, { zIndex: 2 }]}>
                            <Text style={styles.label}>Start Location *</Text>
                            <View style={styles.autocompleteContainer}>
                                <GooglePlacesAutocomplete
                                    ref={startLocationRef}
                                    placeholder="Search start location"
                                    debounce={400}
                                    onPress={(data, details = null) => {
                                        setStartLocation(data.description);
                                        if (details) {
                                            setStartLat(details.geometry.location.lat);
                                            setStartLng(details.geometry.location.lng);
                                        }
                                        
                                        // Update text and close list
                                        startLocationRef.current?.setAddressText(data.description);
                                        startLocationRef.current?.blur();
                                    }}
                                    query={{
                                        key: GOOGLE_MAPS_API_KEY,
                                        language: 'en',
                                        location: userLocation ? `${userLocation.latitude},${userLocation.longitude}` : undefined,
                                        radius: 5000, // 5km radius bias
                                        components: 'country:in', // Bias to India
                                    }}
                                    fetchDetails={true}
                                    enablePoweredByContainer={false}
                                    styles={autocompleteStyles}
                                    textInputProps={{
                                        placeholderTextColor: AppColors.textSecondary,
                                    }}
                                />
                                <TouchableOpacity
                                    style={styles.currentLocationButton}
                                    onPress={getCurrentLocation}
                                    disabled={loading}
                                >
                                    <Ionicons name="locate" size={24} color={AppColors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* End Location with Autocomplete */}
                        <View style={[styles.inputGroup, { zIndex: 1 }]}>
                            <Text style={styles.label}>End Location *</Text>
                            <GooglePlacesAutocomplete
                                ref={endLocationRef}
                                placeholder="Search destination"
                                debounce={400}
                                onPress={(data, details = null) => {
                                    setEndLocation(data.description);
                                    if (details) {
                                        setEndLat(details.geometry.location.lat);
                                        setEndLng(details.geometry.location.lng);
                                    }
                                    
                                    // Update text and close list
                                    endLocationRef.current?.setAddressText(data.description);
                                    endLocationRef.current?.blur();
                                }}
                                query={{
                                    key: GOOGLE_MAPS_API_KEY,
                                    language: 'en',
                                    location: userLocation ? `${userLocation.latitude},${userLocation.longitude}` : undefined,
                                    radius: 5000, // 5km radius bias
                                    components: 'country:in', // Bias to India
                                }}
                                fetchDetails={true}
                                enablePoweredByContainer={false}
                                styles={autocompleteStyles}
                                textInputProps={{
                                    placeholderTextColor: AppColors.textSecondary,
                                }}
                            />
                        </View>

                        {/* Stops Section */}
                        <View style={styles.stopsSection}>
                            <Text style={styles.sectionTitle}>Add Stops (Optional)</Text>

                            {stops.map((stop, index) => (
                                <View key={index} style={styles.stopItem}>
                                    <View style={styles.stopInfo}>
                                        <Ionicons name="location-outline" size={20} color={AppColors.accent} />
                                        <Text style={styles.stopText}>
                                            {stop.sequence}. {stop.address}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeStop(index)}>
                                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            <View style={styles.stopAutocompleteContainer}>
                                <GooglePlacesAutocomplete
                                    ref={stopLocationRef}
                                    placeholder="Search stop location"
                                    onPress={addStopFromAutocomplete}
                                    query={{
                                        key: GOOGLE_MAPS_API_KEY,
                                        language: 'en',
                                    }}
                                    fetchDetails={true}
                                    enablePoweredByContainer={false}
                                    styles={{
                                        ...autocompleteStyles,
                                        container: {
                                            flex: 1,
                                        },
                                    }}
                                    textInputProps={{
                                        placeholderTextColor: AppColors.textSecondary,
                                    }}
                                />
                            </View>
                        </View>

                        {/* Safety Agent Info (Always Active) */}
                        <View style={styles.sectionContainer}>
                            <View style={styles.safetyAgentHeader}>
                                <View style={styles.safetyAgentTitleContainer}>
                                    <Ionicons name="shield-checkmark" size={24} color={AppColors.primary} />
                                    <Text style={styles.sectionTitle}>Safety Agent Active</Text>
                                </View>
                            </View>
                            
                            <Text style={styles.safetyAgentDescription}>
                                For your safety, you will receive automated check-in calls during this trip.
                            </Text>

                            <View style={styles.intervalContainer}>
                                <Text style={styles.label}>Check-in Interval</Text>
                                <View style={styles.intervalSelector}>
                                    {[1, 15, 30].map((mins) => (
                                        <TouchableOpacity
                                            key={mins}
                                            style={[
                                                styles.intervalButton,
                                                checkInterval === mins && styles.intervalButtonActive
                                            ]}
                                            onPress={() => setCheckInterval(mins)}
                                        >
                                            <Text style={[
                                                styles.intervalButtonText,
                                                checkInterval === mins && styles.intervalButtonTextActive
                                            ]}>
                                                {mins} min
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Start Trip Button */}
                        <TouchableOpacity
                            style={styles.startTripButton}
                            onPress={handleStartTrip}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="navigate-circle" size={24} color="#FFFFFF" />
                                    <Text style={styles.startTripButtonText}>Start Trip</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Safety Center Section */}
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Safety Center</Text>
                            <View style={styles.safetyButtonsContainer}>
                                <TouchableOpacity
                                    style={styles.safetyButton}
                                    onPress={() => router.push('/connected-users')}
                                >
                                    <View style={[styles.safetyIconContainer, { backgroundColor: '#E0F2FE' }]}>
                                        <Ionicons name="people" size={24} color="#0284C7" />
                                    </View>
                                    <Text style={styles.safetyButtonText}>Connected Users</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.safetyButton}
                                    onPress={() => router.push('/trip-history')}
                                >
                                    <View style={[styles.safetyIconContainer, { backgroundColor: '#F3E8FF' }]}>
                                        <Ionicons name="time" size={24} color="#9333EA" />
                                    </View>
                                    <Text style={styles.safetyButtonText}>Trip History</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const autocompleteStyles = {
    container: {
        flex: 1,
    },
    textInputContainer: {
        backgroundColor: AppColors.inputBg,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: 12,
        paddingHorizontal: 8,
    },
    textInput: {
        height: 50,
        color: AppColors.text,
        fontSize: 16,
        backgroundColor: 'transparent',
    },
    predefinedPlacesDescription: {
        color: AppColors.primary,
    },
    listView: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginTop: 4,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        zIndex: 1000,
    },
    row: {
        padding: 13,
        height: 56,
        flexDirection: 'row',
    },
    separator: {
        height: 1,
        backgroundColor: AppColors.border,
    },
    description: {
        fontSize: 14,
        color: AppColors.text,
    },
    loader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        height: 20,
    },
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: AppColors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: AppColors.text,
    },
    scrollView: {
        flex: 1,
    },
    formContainer: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: AppColors.text,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 20,
        zIndex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: AppColors.inputBg,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: AppColors.text,
    },
    autocompleteContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        zIndex: 2,
    },
    currentLocationButton: {
        width: 50,
        height: 50,
        backgroundColor: AppColors.inputBg,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stopsSection: {
        marginTop: 20,
        zIndex: 0,
    },
    stopItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    stopInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    stopText: {
        fontSize: 14,
        color: AppColors.text,
        flex: 1,
    },
    stopAutocompleteContainer: {
        marginTop: 12,
        zIndex: 1,
    },
    startTripButton: {
        backgroundColor: AppColors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 30,
        marginTop: 30,
        gap: 8,
    },
    startTripButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    activeTripContainer: {
        padding: 20,
    },
    activeTripHeader: {
        alignItems: 'center',
        marginBottom: 30,
    },
    activeTripTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: AppColors.text,
        marginTop: 12,
    },
    activeTripSubtitle: {
        fontSize: 14,
        color: AppColors.textSecondary,
        marginTop: 4,
    },
    viewTripButton: {
        backgroundColor: AppColors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 30,
        marginBottom: 12,
        gap: 8,
    },
    viewTripButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    endTripButton: {
        backgroundColor: '#EF4444',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 30,
        gap: 8,
    },
    endTripButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    sectionContainer: {
        marginTop: 30,
        marginBottom: 20,
        borderTopWidth: 1,
        borderTopColor: AppColors.border,
        paddingTop: 20,
    },
    safetyButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    safetyButton: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    safetyIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    safetyButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.text,
    },
    // Change started
    safetyAgentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    safetyAgentTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    safetyAgentDescription: {
        fontSize: 14,
        color: AppColors.textSecondary,
        marginBottom: 16,
        lineHeight: 20,
    },
    intervalContainer: {
        marginTop: 8,
    },
    intervalSelector: {
        flexDirection: 'row',
        gap: 12,
    },
    intervalButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.border,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    intervalButtonActive: {
        backgroundColor: AppColors.primary,
        borderColor: AppColors.primary,
    },
    intervalButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.text,
    },
    intervalButtonTextActive: {
        color: '#FFFFFF',
    },
    // Change ended
});
