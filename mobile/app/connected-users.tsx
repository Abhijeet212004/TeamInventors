import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/Config';

interface User {
    id: string;
    name: string;
    phone: string;
    email?: string;
}

interface GuardianConnection {
    id: string;
    guardian: User;
    status: string;
}

interface MonitoredUserConnection {
    id: string;
    user: User;
    status: string;
}

export default function ConnectedUsersScreen() {
    const router = useRouter();
    const [guardians, setGuardians] = useState<GuardianConnection[]>([]);
    const [monitoredUsers, setMonitoredUsers] = useState<MonitoredUserConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'guardians' | 'monitored'>('guardians');

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                Alert.alert('Debug', 'No token found');
                return;
            }

            // Fetch guardians
            const guardiansRes = await axios.get(`${API_BASE_URL}/guardians`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Alert.alert('Debug Guardians', JSON.stringify(guardiansRes.data));
            setGuardians(guardiansRes.data.data);

            // Fetch monitored users
            const monitoredRes = await axios.get(`${API_BASE_URL}/guardians/monitored`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMonitoredUsers(monitoredRes.data.data);
        } catch (error: any) {
            console.error('Error fetching connections:', error);
            Alert.alert('Error', `Fetch failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddGuardian = () => {
        Alert.prompt(
            'Add Guardian',
            'Enter the phone number of the guardian you want to add:',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Add',
                    onPress: async (phone) => {
                        if (!phone) return;
                        try {
                            const token = await AsyncStorage.getItem('authToken');
                            await axios.post(
                                `${API_BASE_URL}/guardians/request`,
                                { phone },
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                            Alert.alert('Success', 'Guardian request sent successfully');
                            fetchConnections();
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed to send request');
                        }
                    },
                },
            ],
            'plain-text'
        );
    };

    const handleRemoveGuardian = (guardianId: string, name: string) => {
        Alert.alert(
            'Remove Guardian',
            `Are you sure you want to remove ${name} from your guardians list? They will no longer receive your trip updates.`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('authToken');
                            await axios.delete(`${API_BASE_URL}/guardians/${guardianId}`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            fetchConnections();
                        } catch (error: any) {
                            Alert.alert('Error', 'Failed to remove guardian');
                        }
                    },
                },
            ]
        );
    };

    const renderGuardianItem = ({ item }: { item: GuardianConnection }) => (
        <View style={styles.userCard}>
            <View style={styles.userInfo}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.guardian.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                    <Text style={styles.userName}>{item.guardian.name}</Text>
                    <Text style={styles.userPhone}>{item.guardian.phone}</Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveGuardian(item.guardian.id, item.guardian.name)}
            >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
        </View>
    );

    const renderMonitoredItem = ({ item }: { item: MonitoredUserConnection }) => (
        <TouchableOpacity
            style={styles.userCard}
            onPress={() => router.push({ pathname: '/trip-history', params: { userId: item.user.id } })}
        >
            <View style={styles.userInfo}>
                <View style={[styles.avatar, { backgroundColor: '#3B82F6' }]}>
                    <Text style={styles.avatarText}>{item.user.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                    <Text style={styles.userName}>{item.user.name}</Text>
                    <Text style={styles.userPhone}>{item.user.phone}</Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Connected Users</Text>
                <TouchableOpacity onPress={handleAddGuardian} style={styles.addButton}>
                    <Ionicons name="add" size={24} color="#1F2937" />
                </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'guardians' && styles.activeTab]}
                    onPress={() => setActiveTab('guardians')}
                >
                    <Text style={[styles.tabText, activeTab === 'guardians' && styles.activeTabText]}>My Guardians</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'monitored' && styles.activeTab]}
                    onPress={() => setActiveTab('monitored')}
                >
                    <Text style={[styles.tabText, activeTab === 'monitored' && styles.activeTabText]}>People I Monitor</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#EF4444" />
                </View>
            ) : (
                activeTab === 'guardians' ? (
                    <FlatList
                        data={guardians}
                        renderItem={renderGuardianItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={64} color="#9CA3AF" />
                                <Text style={styles.emptyText}>No guardians connected yet</Text>
                            </View>
                        }
                    />
                ) : (
                    <FlatList
                        data={monitoredUsers}
                        renderItem={renderMonitoredItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={64} color="#9CA3AF" />
                                <Text style={styles.emptyText}>You are not monitoring anyone yet</Text>
                            </View>
                        }
                    />
                )
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
    addButton: {
        padding: 8,
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#FFFFFF',
        marginBottom: 8,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#EF4444',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#EF4444',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '600',
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    userPhone: {
        fontSize: 14,
        color: '#6B7280',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#059669',
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
