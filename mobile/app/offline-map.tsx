import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

interface UserLocation {
    id: string;
    latitude: number;
    longitude: number;
    lastSeen: number;
}

export default function OfflineMapScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [activeUsers, setActiveUsers] = useState<UserLocation[]>([]);
    const [myLocation, setMyLocation] = useState<{ latitude: number, longitude: number } | null>(null);

    useEffect(() => {
        const initMap = async () => {
            // 1. Get my location
            let lat = params.lat ? parseFloat(params.lat as string) : null;
            let lng = params.lng ? parseFloat(params.lng as string) : null;

            if (!lat || !lng) {
                try {
                    let { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        let loc = await Location.getCurrentPositionAsync({});
                        lat = loc.coords.latitude;
                        lng = loc.coords.longitude;
                    }
                } catch (e) {
                    console.error("Error getting location", e);
                }
            }

            if (lat && lng) {
                setMyLocation({ latitude: lat, longitude: lng });
            }

            // 2. Load active users
            const loadUsers = async () => {
                try {
                    const storedUsers = await AsyncStorage.getItem('offline_active_users');
                    if (storedUsers) {
                        const parsedUsers = JSON.parse(storedUsers);
                        const now = Date.now();
                        const recentUsers = parsedUsers.filter((u: UserLocation) => (now - u.lastSeen) < 5 * 60 * 1000);
                        setActiveUsers(recentUsers);
                    }
                } catch (e) {
                    console.error("Error loading map users", e);
                }
            };

            loadUsers();
            const interval = setInterval(loadUsers, 5000);
            return () => clearInterval(interval);
        };

        initMap();
    }, []);

    const handleUserPress = (userId: string) => {
        // Go back to chat with specific recipient
        router.push({
            pathname: '/offline-chat',
            params: { recipientId: userId }
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Proximity Radar</Text>
                <View style={{ width: 40 }} />
            </View>

            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: myLocation?.latitude || 37.78825,
                    longitude: myLocation?.longitude || -122.4324,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                showsUserLocation={true}
            >
                {activeUsers.map(user => (
                    <Marker
                        key={user.id}
                        coordinate={{ latitude: user.latitude, longitude: user.longitude }}
                        pinColor="blue"
                    >
                        <Callout onPress={() => handleUserPress(user.id)}>
                            <View style={styles.callout}>
                                <Text style={styles.calloutTitle}>User {user.id.substring(0, 4)}</Text>
                                <Text style={styles.calloutSubtitle}>Tap to Chat</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {activeUsers.length} active users nearby
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    map: {
        flex: 1,
    },
    callout: {
        padding: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    calloutTitle: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    calloutSubtitle: {
        color: Colors.primary,
        fontSize: 12,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    footerText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
