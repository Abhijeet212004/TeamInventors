import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function SOSCountdownScreen() {
    const router = useRouter();
    const [countdown, setCountdown] = useState(5);
    const [sending, setSending] = useState(false);
    const hasSentSOS = useRef(false); // Prevent duplicate sends

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (countdown > 0 && !sending) {
            interval = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        } else if (countdown === 0 && !sending && !hasSentSOS.current) {
            hasSentSOS.current = true; // Mark as sent before calling
            sendSOS();
        }
        return () => clearInterval(interval);
    }, [countdown, sending]);

    const sendSOS = async () => {
        setSending(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to send SOS.');
                setSending(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            
            console.log('🚨 Sending SOS Alert to backend...');
            console.log(`📍 Location: ${location.coords.latitude}, ${location.coords.longitude}`);

            // Use the centralized API service which handles auth tokens and headers automatically
            const response = await api.post('/sos/alert', {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            console.log('✅ SOS Alert sent successfully:', response.data);

            Alert.alert('SOS Sent', 'Your guardians and nearby helpers have been notified.', [
                { text: 'OK', onPress: () => router.replace('/map-tracking') }
            ]);
        } catch (error: any) {
            console.error('Error sending SOS:', error);
            const errorMessage = error.response?.data?.error || 'Failed to send SOS alert. Please try again.';
            Alert.alert('Error', errorMessage);
        } finally {
            setSending(false);
        }
    };

    const handleCancel = () => {
        router.replace('/map-tracking');
    };

    const handleSkip = () => {
        if (!hasSentSOS.current) {
            hasSentSOS.current = true;
            sendSOS();
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.background}
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="shield" size={32} color="#FFF" />
                    </View>
                    <Text style={styles.title}>I'M SAFE</Text>
                </View>

                <Text style={styles.subtitle}>Notifying your SOS contacts in</Text>

                <View style={styles.timerContainer}>
                    <View style={styles.timerCircle}>
                        <Text style={styles.timerText}>{countdown}</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 40,
        paddingTop: 80,
        paddingBottom: 60,
    },
    header: {
        alignItems: 'center',
    },
    logoContainer: {
        marginBottom: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginTop: 20,
    },
    timerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 40,
    },
    timerCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    timerText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#DC2626',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 20,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        alignItems: 'center',
    },
    cancelText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
    skipButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 30,
        backgroundColor: '#4A0404',
        alignItems: 'center',
    },
    skipText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
});
