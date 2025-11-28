import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Spacing, Colors as ThemeColors } from '@/constants/Theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types for chat messages
interface Message {
    id: string;
    text: string;
    sender: 'user' | 'other';
    timestamp: number;
    status: 'sending' | 'sent' | 'delivered' | 'failed';
}

export default function OfflineChatScreen() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    const params = useLocalSearchParams();
    const recipientId = params.recipientId as string | undefined;
    const [activeUsers, setActiveUsers] = useState<Map<string, { lat: number, lng: number, lastSeen: number }>>(new Map());

    // ESP32 AP Default IP
    const ESP32_IP = 'http://192.168.4.1';
    const [deviceId, setDeviceId] = useState<string>('');

    // Initialize Device ID
    useEffect(() => {
        const initDeviceId = async () => {
            try {
                let id = await AsyncStorage.getItem('chat_device_id');
                if (!id) {
                    id = Math.random().toString(36).substring(2, 15);
                    await AsyncStorage.setItem('chat_device_id', id);
                }
                setDeviceId(id);
            } catch (e) {
                console.error('Error loading device ID', e);
                // Fallback
                setDeviceId(Math.random().toString(36).substring(2, 15));
            }
        };
        initDeviceId();
    }, []);

    // Heartbeat: Auto-send location every 30s
    useEffect(() => {
        if (!deviceId || !isConnected) return;

        const sendHeartbeat = async () => {
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    const content = `LOC:${loc.coords.latitude},${loc.coords.longitude}`;

                    // Send silently (don't add to local message list)
                    await fetch(`${ESP32_IP}/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: `HB-${Date.now()}`,
                            sender: deviceId,
                            content: content,
                            timestamp: Date.now().toString(),
                            isEmergency: false
                        }),
                    });
                }
            } catch (e) {
                console.log("Heartbeat error", e);
            }
        };

        const interval = setInterval(sendHeartbeat, 30000); // 30s
        return () => clearInterval(interval);
    }, [deviceId, isConnected]);

    // Poll for new messages & Track Users
    useEffect(() => {
        if (!deviceId) return;

        let intervalId: any;

        const pollMessages = async () => {
            try {
                const response = await fetch(`${ESP32_IP}/receive`);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        const newMessages: Message[] = [];
                        const updatedUsers = new Map(activeUsers);
                        let usersChanged = false;

                        data.forEach((msg: any) => {
                            // 1. Track Active Users from Location Messages
                            if (msg.content.startsWith('LOC:')) {
                                const [lat, lng] = msg.content.substring(4).split(',').map(Number);
                                if (!isNaN(lat) && !isNaN(lng) && msg.sender !== deviceId) {
                                    updatedUsers.set(msg.sender, { lat, lng, lastSeen: Date.now() });
                                    usersChanged = true;
                                }
                            }

                            // 2. Filter Private Messages
                            let isPrivate = false;
                            let content = msg.content;

                            if (content.startsWith('PRIVATE:')) {
                                const parts = content.split(':');
                                const targetId = parts[1];
                                const actualMsg = parts.slice(2).join(':');

                                if (targetId === deviceId || msg.sender === deviceId) {
                                    content = actualMsg; // Show content
                                    isPrivate = true;
                                } else {
                                    return; // Skip message meant for others
                                }
                            }

                            // 3. Filter by Recipient (if in private mode)
                            if (recipientId && msg.sender !== recipientId && msg.sender !== deviceId && !isPrivate) {
                                return; // Skip unrelated messages in private chat
                            }

                            newMessages.push({
                                id: msg.id,
                                text: content,
                                sender: msg.sender === deviceId ? 'user' : 'other',
                                timestamp: parseInt(msg.timestamp) || Date.now(),
                                status: 'delivered'
                            });
                        });

                        // Save active users to storage for Map Screen
                        if (usersChanged) {
                            const usersArray = Array.from(updatedUsers.entries()).map(([id, data]) => ({
                                id,
                                latitude: data.lat,
                                longitude: data.lng,
                                lastSeen: data.lastSeen
                            }));
                            AsyncStorage.setItem('offline_active_users', JSON.stringify(usersArray));
                            setActiveUsers(updatedUsers);
                        }

                        // Update Messages
                        setMessages(prev => {
                            const existingIds = new Set(prev.map(m => m.id));
                            const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
                            return [...prev, ...uniqueNew].sort((a, b) => a.timestamp - b.timestamp);
                        });

                        if (!isConnected) {
                            setIsConnected(true);
                            setIsConnecting(false);
                        }
                    }
                }
            } catch (error) {
                console.log('Polling error', error);
                setIsConnected(false);
            }
        };

        intervalId = setInterval(pollMessages, 2000);
        pollMessages();

        return () => clearInterval(intervalId);
    }, [deviceId, activeUsers, recipientId]);

    const sendMessage = async () => {
        if (!inputText.trim() || !deviceId) return;

        const messageId = Date.now().toString();
        const timestamp = Date.now();
        let text = inputText.trim();
        let contentToSend = text;

        // If private chat, prefix content
        if (recipientId) {
            contentToSend = `PRIVATE:${recipientId}:${text}`;
        }

        const newMessage: Message = {
            id: messageId,
            text: text,
            sender: 'user',
            timestamp: timestamp,
            status: 'sending',
        };

        setMessages((prev) => [...prev, newMessage]);
        setInputText('');

        try {
            const response = await fetch(`${ESP32_IP}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: messageId,
                    sender: deviceId,
                    content: contentToSend,
                    timestamp: timestamp.toString(),
                    isEmergency: false
                }),
            });

            if (response.ok) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === messageId ? { ...msg, status: 'sent' } : msg
                    )
                );
            } else {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === messageId ? { ...msg, status: 'failed' } : msg
                    )
                );
            }
        } catch (error) {
            console.error('Send error:', error);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId ? { ...msg, status: 'failed' } : msg
                )
            );
            alert('Failed to send. Ensure you are connected to "AlertMate_Secure_Mesh" WiFi.');
        }
    };

    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [healthData, setHealthData] = useState<{ bpm: number, spo2: number } | null>(null);

    // Poll Health Data
    useEffect(() => {
        if (!isConnected) return;

        const fetchHealth = async () => {
            try {
                const response = await fetch(`${ESP32_IP}/health`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.bpm > 0 || data.spo2 > 0) {
                        setHealthData(data);
                    }
                }
            } catch (e) {
                // console.log("Health fetch error", e);
            }
        };

        const interval = setInterval(fetchHealth, 2000); // Poll every 2s
        return () => clearInterval(interval);
    }, [isConnected]);

    // ... (existing useEffects)

    const sendLocation = async () => {
        if (!deviceId) return;

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            alert('Permission to access location was denied');
            return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);

        const messageId = Date.now().toString();
        const timestamp = Date.now();
        const locationText = `LOC:${currentLocation.coords.latitude},${currentLocation.coords.longitude}`;

        const newMessage: Message = {
            id: messageId,
            text: locationText,
            sender: 'user',
            timestamp: timestamp,
            status: 'sending',
        };

        setMessages((prev) => [...prev, newMessage]);

        try {
            const response = await fetch(`${ESP32_IP}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: messageId,
                    sender: deviceId,
                    content: locationText,
                    timestamp: timestamp.toString(),
                    isEmergency: false
                }),
            });

            if (response.ok) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === messageId ? { ...msg, status: 'sent' } : msg
                    )
                );
            } else {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === messageId ? { ...msg, status: 'failed' } : msg
                    )
                );
            }
        } catch (error) {
            console.error('Send error:', error);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId ? { ...msg, status: 'failed' } : msg
                )
            );
            alert('Failed to send location. Ensure you are connected to "AlertMate_Secure_Mesh" WiFi.');
        }
    };

    const openMap = (lat: number, lng: number) => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${lat},${lng}`;
        const label = 'Shared Location';
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });

        if (url) {
            Linking.openURL(url);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';
        const isLocation = item.text.startsWith('LOC:');

        let messageContent;
        if (isLocation) {
            const [lat, lng] = item.text.substring(4).split(',').map(Number);
            messageContent = (
                <TouchableOpacity onPress={() => openMap(lat, lng)} style={styles.locationContainer}>
                    <Ionicons name="location" size={24} color={isUser ? '#FFF' : '#EF4444'} />
                    <View style={styles.locationTextContainer}>
                        <Text style={[styles.locationTitle, isUser ? styles.userText : styles.otherText]}>
                            Shared Location
                        </Text>
                        <Text style={[styles.locationCoords, isUser ? styles.userText : styles.otherText]}>
                            {lat.toFixed(4)}, {lng.toFixed(4)}
                        </Text>
                        <Text style={[styles.locationHint, isUser ? styles.userText : styles.otherText]}>
                            Tap to view on map
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        } else {
            messageContent = (
                <Text style={[styles.messageText, isUser ? styles.userText : styles.otherText]}>
                    {item.text}
                </Text>
            );
        }

        return (
            <View
                style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.otherBubble,
                ]}
            >
                {messageContent}
                <View style={styles.messageFooter}>
                    <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.otherTimestamp]}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {isUser && (
                        <Ionicons
                            name={item.status === 'sent' || item.status === 'delivered' ? "checkmark-done" : "time-outline"}
                            size={12}
                            color="rgba(255, 255, 255, 0.7)"
                            style={{ marginLeft: 4 }}
                        />
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>
                        {recipientId ? `Chat with ${recipientId.substring(0, 4)}` : 'Offline Mesh Chat'}
                    </Text>
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#22C55E' : '#EF4444' }]} />
                        <Text style={styles.statusText}>
                            {isConnected ? 'Connected to Mesh' : 'Connecting...'}
                        </Text>
                    </View>
                    {healthData && (
                        <View style={styles.healthContainer}>
                            <View style={styles.healthItem}>
                                <Ionicons name="heart" size={12} color="#EF4444" />
                                <Text style={styles.healthText}>{Math.round(healthData.bpm)} BPM</Text>
                            </View>
                            <View style={styles.healthItem}>
                                <Ionicons name="water" size={12} color="#3B82F6" />
                                <Text style={styles.healthText}>{Math.round(healthData.spo2)}% SpO2</Text>
                            </View>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    onPress={() => router.push({
                        pathname: '/offline-map',
                        params: {
                            lat: location?.coords.latitude,
                            lng: location?.coords.longitude
                        }
                    })}
                    style={styles.radarButton}
                >
                    <Ionicons name="map" size={24} color={ThemeColors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Messages Area */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="hardware-chip-outline" size={48} color="#CBD5E1" />
                        <Text style={styles.emptyStateText}>
                            Connect to your ESP32 device to start chatting over the mesh network.
                        </Text>
                    </View>
                }
            />

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={styles.attachButton}
                        onPress={sendLocation}
                    >
                        <Ionicons name="location-outline" size={24} color="#64748B" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                        onPress={sendMessage}
                        disabled={!inputText.trim()}
                    >
                        <Ionicons name="send" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backButton: {
        padding: 4,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    connectionStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    statusText: {
        fontSize: 12,
        color: '#64748B',
    },
    settingsButton: {
        padding: 4,
    },
    messagesList: {
        padding: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#8B2E5A', // Primary App Color
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    userText: {
        color: '#FFFFFF',
    },
    otherText: {
        color: '#1E293B',
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    timestamp: {
        fontSize: 10,
    },
    userTimestamp: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    otherTimestamp: {
        color: '#94A3B8',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: Spacing.md,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    input: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        paddingRight: 40,
        maxHeight: 100,
        fontSize: 15,
        color: '#0F172A',
    },
    sendButton: {
        marginLeft: 8,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#8B2E5A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#CBD5E1',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        paddingHorizontal: 40,
    },
    emptyStateText: {
        textAlign: 'center',
        color: '#94A3B8',
        marginTop: 16,
        fontSize: 14,
    },
    attachButton: {
        padding: 8,
        marginRight: 8,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationTextContainer: {
        marginLeft: 8,
    },
    locationTitle: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    locationCoords: {
        fontSize: 12,
        opacity: 0.8,
    },
    locationHint: {
        fontSize: 10,
        opacity: 0.6,
        fontStyle: 'italic',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    radarButton: {
        padding: 8,
    },
    healthContainer: {
        flexDirection: 'row',
        marginTop: 4,
        gap: 8,
    },
    healthItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 4,
    },
    healthText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#475569',
    },
});
