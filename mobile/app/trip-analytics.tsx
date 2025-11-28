
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/Config';
import { LineChart } from 'react-native-chart-kit';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;

interface TripAnalytics {
    id: string;
    totalDistance: number;
    totalDuration: number;
    avgSpeed: number;
    maxSpeed: number;
    stopsCompleted: number;
    completedAt: string;
}

interface TripLocation {
    latitude: number;
    longitude: number;
    speed: number;
    recordedAt: string;
}

interface TripDetails {
    id: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    startAddress: string;
    endAddress: string;
    analytics: TripAnalytics;
    locations: TripLocation[];
}

export default function TripAnalyticsScreen() {
    const router = useRouter();
    const { tripId } = useLocalSearchParams();
    const [trip, setTrip] = useState<TripDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

    useEffect(() => {
        fetchTripAnalytics();
    }, [tripId]);

    const fetchTripAnalytics = async () => {
        try {
            if (!trip) setLoading(true);

            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            const id = Array.isArray(tripId) ? tripId[0] : tripId;
            const res = await axios.get(`${API_BASE_URL}/trips/${id}/analytics`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log('Analytics API Response:', JSON.stringify(res.data, null, 2));

            if (res.data.success) {
                setTrip(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching trip analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Analyzing Trip Data...</Text>
            </View>
        );
    }

    if (!trip || !trip.analytics) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Trip Analytics</Text>
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Analytics not available for this trip</Text>
                </View>
            </View>
        );
    }

    // --- Data Processing & Mock Generation ---

    // 1. Sample data to ~20 points for readability
    const sampleSize = 20;
    const locations = trip.locations || [];
    const step = Math.ceil(locations.length / sampleSize) || 1;

    const sampledLocations = locations.filter((_, index) => index % step === 0).slice(0, sampleSize);

    // If no locations, create mock timeline
    const displayPoints = sampledLocations.length > 0 ? sampledLocations : Array.from({ length: 10 }).map((_, i) => ({
        latitude: trip.startLat,
        longitude: trip.startLng,
        speed: 0,
        recordedAt: new Date(new Date(trip.analytics.completedAt).getTime() - (10 - i) * 60000).toISOString()
    }));

    // 2. Generate aligned datasets
    const speedData = displayPoints.map(l => Math.max(0, (l.speed || 0) * 3.6));

    // Mock Health Data aligned with displayPoints
    const heartRateData = displayPoints.map(() => Math.floor(70 + Math.random() * 30));
    const spo2Data = displayPoints.map(() => Math.floor(96 + Math.random() * 3));

    // Mock Risk Data (0: Safe, 1: Low, 2: Medium, 3: High)
    const riskLevelData = displayPoints.map(() => {
        const rand = Math.random();
        if (rand > 0.9) return 3; // Critical
        if (rand > 0.8) return 2; // High
        if (rand > 0.7) return 1; // Medium
        return 0; // Safe
    });

    // 3. Time Labels
    const timeLabels = displayPoints.map(l => {
        const date = new Date(l.recordedAt);
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    });

    const handlePointClick = (data: { index: number }) => {
        setSelectedPointIndex(data.index);
    };

    const renderDetailCard = () => {
        if (selectedPointIndex === null) return null;

        const point = displayPoints[selectedPointIndex];
        const speed = speedData[selectedPointIndex];
        const hr = heartRateData[selectedPointIndex];
        const riskLevel = riskLevelData[selectedPointIndex];
        const time = timeLabels[selectedPointIndex];

        const riskLabel = riskLevel === 3 ? 'CRITICAL' : riskLevel === 2 ? 'HIGH' : riskLevel === 1 ? 'MEDIUM' : 'SAFE';
        const riskColor = riskLevel === 3 ? '#EF4444' : riskLevel === 2 ? '#F59E0B' : riskLevel === 1 ? '#3B82F6' : '#10B981';

        return (
            <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                    <Text style={styles.detailTime}>At {time}</Text>
                    <TouchableOpacity onPress={() => setSelectedPointIndex(null)}>
                        <Ionicons name="close-circle" size={24} color="#6B7280" />
                    </TouchableOpacity>
                </View>
                <View style={styles.detailGrid}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Speed</Text>
                        <Text style={styles.detailValue}>{Math.round(speed)} km/h</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Risk Level</Text>
                        <Text style={[styles.detailValue, { color: riskColor }]}>{riskLabel}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Heart Rate</Text>
                        <Text style={[styles.detailValue, { color: '#EF4444' }]}>{hr} bpm</Text>
                    </View>
                </View>
                <View style={styles.detailLocation}>
                    <Ionicons name="location-sharp" size={16} color="#6B7280" />
                    <Text style={styles.detailLocationText}>
                        {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                    </Text>
                </View>
            </View>
        );
    };

    // Risk Zones (Mock)
    const riskZones = [
        { type: 'No Medical Services', severity: 'HIGH', location: 'Remote Highway Section', time: '10 mins' },
        { type: 'Low Network Coverage', severity: 'MEDIUM', location: 'Mountain Pass', time: '5 mins' },
        { type: 'High Crime Area', severity: 'CRITICAL', location: 'Downtown Outskirts', time: '2 mins' },
    ];

    // Safety Score Calculation
    const calculateSafetyScore = () => {
        let score = 100;
        if (trip.analytics.maxSpeed > 80) score -= 10;
        if (trip.analytics.maxSpeed > 100) score -= 20;
        score -= riskZones.filter(z => z.severity === 'CRITICAL').length * 15;
        score -= riskZones.filter(z => z.severity === 'HIGH').length * 10;
        return Math.max(0, Math.min(100, score));
    };

    const safetyScore = calculateSafetyScore();
    const getSafetyColor = (score: number) => {
        if (score >= 90) return ['#10B981', '#059669'];
        if (score >= 70) return ['#F59E0B', '#D97706'];
        return ['#EF4444', '#DC2626'];
    };
    const safetyColors = getSafetyColor(safetyScore);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Safety Analysis</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* Safety Score Card */}
                <LinearGradient
                    colors={safetyColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.scoreCard}
                >
                    <View style={styles.scoreHeader}>
                        <Text style={styles.scoreTitle}>Safety Score</Text>
                        <MaterialCommunityIcons name="shield-check" size={32} color="#FFF" />
                    </View>
                    <Text style={styles.scoreValue}>{safetyScore}</Text>
                    <Text style={styles.scoreSubtitle}>
                        {safetyScore >= 90 ? 'Excellent Safety Rating' :
                            safetyScore >= 70 ? 'Moderate Risks Detected' : 'Critical Safety Concerns'}
                    </Text>
                </LinearGradient>

                {/* Detail Card (Visible when point clicked) */}
                {renderDetailCard()}

                {/* Risk Level Timeline */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Risk Exposure Timeline</Text>
                    <Text style={styles.chartHint}>Tap to identify high-risk moments</Text>
                    <View style={styles.chartCard}>
                        <View style={styles.chartHeader}>
                            <MaterialCommunityIcons name="alert-octagon" size={24} color="#F59E0B" />
                            <Text style={styles.chartTitle}>Risk Level (0-3)</Text>
                        </View>
                        <LineChart
                            data={{
                                labels: timeLabels.filter((_, i) => i % 4 === 0),
                                datasets: [{ data: riskLevelData }]
                            }}
                            width={screenWidth - 64}
                            height={180}
                            yAxisSuffix=""
                            onDataPointClick={handlePointClick}
                            chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                                style: { borderRadius: 16 },
                                propsForDots: { r: '6', strokeWidth: '2', stroke: '#F59E0B' }
                            }}
                            bezier
                            style={styles.chart}
                        />
                    </View>
                </View>

                {/* Health Metrics Charts */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>User Health Metrics</Text>
                    <Text style={styles.chartHint}>Tap on points to see details</Text>

                    {/* Heart Rate Chart */}
                    <View style={styles.chartCard}>
                        <View style={styles.chartHeader}>
                            <MaterialCommunityIcons name="heart-pulse" size={24} color="#EF4444" />
                            <Text style={styles.chartTitle}>Heart Rate (BPM)</Text>
                        </View>
                        <LineChart
                            data={{
                                labels: timeLabels.filter((_, i) => i % 4 === 0), // Show every 4th label
                                datasets: [{ data: heartRateData }]
                            }}
                            width={screenWidth - 64}
                            height={180}
                            yAxisSuffix=""
                            onDataPointClick={handlePointClick}
                            chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                                style: { borderRadius: 16 },
                                propsForDots: { r: '6', strokeWidth: '2', stroke: '#EF4444' }
                            }}
                            bezier
                            style={styles.chart}
                        />
                    </View>
                </View>

                {/* Speed Profile */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Speed & Stops</Text>
                    <Text style={styles.chartHint}>Tap on points to see details</Text>
                    <View style={styles.chartCard}>
                        <View style={styles.chartHeader}>
                            <MaterialCommunityIcons name="speedometer" size={24} color="#4F46E5" />
                            <Text style={styles.chartTitle}>Speed (km/h)</Text>
                        </View>
                        <LineChart
                            data={{
                                labels: timeLabels.filter((_, i) => i % 4 === 0),
                                datasets: [{ data: speedData }]
                            }}
                            width={screenWidth - 64}
                            height={180}
                            yAxisSuffix=" km/h"
                            onDataPointClick={handlePointClick}
                            chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                                style: { borderRadius: 16 },
                                propsForDots: { r: '6', strokeWidth: '2', stroke: '#4F46E5' }
                            }}
                            bezier
                            style={styles.chart}
                        />
                    </View>
                </View>

                {/* Critical Risk Zones */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Critical Risk Zones</Text>
                    {riskZones.map((zone, index) => (
                        <View key={index} style={styles.riskCard}>
                            <View style={[styles.riskIndicator, {
                                backgroundColor: zone.severity === 'CRITICAL' ? '#EF4444' :
                                    zone.severity === 'HIGH' ? '#F59E0B' : '#3B82F6'
                            }]} />
                            <View style={styles.riskContent}>
                                <Text style={styles.riskType}>{zone.type}</Text>
                                <Text style={styles.riskLocation}>{zone.location}</Text>
                            </View>
                            <View style={styles.riskMeta}>
                                <Ionicons name="time-outline" size={14} color="#6B7280" />
                                <Text style={styles.riskTime}>{zone.time}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Trip Route Map */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Trip Route & Incident Map</Text>
                    <View style={styles.mapContainer}>
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            style={styles.map}
                            initialRegion={{
                                latitude: trip.startLat,
                                longitude: trip.startLng,
                                latitudeDelta: Math.abs(trip.startLat - trip.endLat) * 1.5 + 0.01,
                                longitudeDelta: Math.abs(trip.startLng - trip.endLng) * 1.5 + 0.01,
                            }}
                        >
                            <Marker coordinate={{ latitude: trip.startLat, longitude: trip.startLng }} title="Start" pinColor="green" />
                            <Marker coordinate={{ latitude: trip.endLat, longitude: trip.endLng }} title="End" pinColor="red" />

                            {/* Highlight Selected Point */}
                            {selectedPointIndex !== null && (
                                <Marker
                                    coordinate={{
                                        latitude: displayPoints[selectedPointIndex].latitude,
                                        longitude: displayPoints[selectedPointIndex].longitude
                                    }}
                                    title="Selected Point"
                                    pinColor="blue"
                                />
                            )}

                            {/* Mock Risk Markers */}
                            <Marker coordinate={{ latitude: (trip.startLat + trip.endLat) / 2, longitude: (trip.startLng + trip.endLng) / 2 }} title="High Risk Zone" pinColor="orange">
                                <View style={styles.riskMarker}>
                                    <MaterialCommunityIcons name="alert-circle" size={20} color="#FFF" />
                                </View>
                            </Marker>

                            {trip.locations && trip.locations.length > 0 && (
                                <Polyline
                                    coordinates={trip.locations.map(l => ({ latitude: l.latitude, longitude: l.longitude }))}
                                    strokeColor="#4F46E5"
                                    strokeWidth={4}
                                />
                            )}
                        </MapView>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6B7280',
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
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
    },
    scoreCard: {
        padding: 24,
        borderRadius: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    scoreHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    scoreTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
    },
    scoreValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    scoreSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    riskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    riskIndicator: {
        width: 4,
        height: 40,
        borderRadius: 2,
        marginRight: 16,
    },
    riskContent: {
        flex: 1,
    },
    riskType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    riskLocation: {
        fontSize: 14,
        color: '#6B7280',
    },
    riskMeta: {
        alignItems: 'flex-end',
    },
    riskTime: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    chartCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginLeft: 8,
    },
    chart: {
        borderRadius: 16,
        paddingRight: 40,
    },
    mapContainer: {
        height: 250,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    riskMarker: {
        backgroundColor: '#F59E0B',
        padding: 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    addressContainer: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    addressItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
        marginTop: 6,
    },
    connectorLine: {
        width: 2,
        height: 30,
        backgroundColor: '#E5E7EB',
        marginLeft: 5,
        marginVertical: 4,
    },
    addressLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    addressText: {
        fontSize: 15,
        color: '#1F2937',
        fontWeight: '500',
        lineHeight: 22,
    },
    detailCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingBottom: 8,
    },
    detailTime: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    detailGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailItem: {
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    detailLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 8,
        borderRadius: 8,
    },
    detailLocationText: {
        fontSize: 12,
        color: '#4B5563',
        marginLeft: 6,
    },
    chartHint: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
        marginBottom: 8,
        textAlign: 'right',
    },
});
