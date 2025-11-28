import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/Config';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

interface Trip {
    id: string;
    startAddress: string;
    endAddress: string;
    startedAt: string;
    endedAt: string;
    status: string;
    analytics?: {
        totalDistance: number;
        totalDuration: number;
        avgSpeed: number;
        maxSpeed: number;
    };
}

export default function TripHistoryScreen() {
    const router = useRouter();
    const { userId } = useLocalSearchParams();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTripHistory();
    }, [userId]);

    const fetchTripHistory = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                Alert.alert('Debug', 'No token found');
                return;
            }

            // If userId is provided, we are viewing someone else's history (as a guardian)
            // Otherwise we are viewing our own history
            const endpoint = userId
                ? `${API_BASE_URL}/trips/user/${userId}` // Need to implement this endpoint for guardians
                : `${API_BASE_URL}/trips`; // Correct endpoint for own trips

            const res = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Alert.alert('Debug Trips', `Found ${res.data.data.length} trips`);
            setTrips(res.data.data);
        } catch (error: any) {
            console.error('Error fetching trip history:', error);
            Alert.alert('Error', `Fetch failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const renderTripItem = ({ item }: { item: Trip }) => (
        <TouchableOpacity
            style={styles.tripCard}
            onPress={() => router.push({ pathname: '/trip-analytics', params: { tripId: item.id } })}
        >
            <View style={styles.tripHeader}>
                <Text style={styles.tripDate}>
                    {new Date(item.startedAt).toLocaleDateString()} • {new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'COMPLETED' ? '#ECFDF5' : '#FEF2F2' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'COMPLETED' ? '#059669' : '#DC2626' }]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            <View style={styles.routeContainer}>
                <View style={styles.routePoint}>
                    <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.addressText} numberOfLines={1}>{item.startAddress || 'Unknown Start'}</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routePoint}>
                    <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.addressText} numberOfLines={1}>{item.endAddress || 'Unknown Destination'}</Text>
                </View>
            </View>

            {item.analytics && (
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Distance</Text>
                        <Text style={styles.statValue}>{(item.analytics.totalDistance / 1000).toFixed(1)} km</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Duration</Text>
                        <Text style={styles.statValue}>{Math.round(item.analytics.totalDuration / 60)} min</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Avg Speed</Text>
                        <Text style={styles.statValue}>{item.analytics.avgSpeed} km/h</Text>
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Trip History</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#EF4444" />
                </View>
            ) : (
                <FlatList
                    data={trips}
                    renderItem={renderTripItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="map-outline" size={64} color="#9CA3AF" />
                            <Text style={styles.emptyText}>No trips recorded yet</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    tripCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    tripDate: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    routeContainer: {
        marginBottom: 16,
    },
    routePoint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    routeLine: {
        width: 2,
        height: 12,
        backgroundColor: '#E5E7EB',
        marginLeft: 3,
        marginVertical: 2,
    },
    addressText: {
        fontSize: 14,
        color: '#1F2937',
        flex: 1,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 12,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
});
