import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Theme';
import { BACKEND_URL } from '@/constants/Config';

export default function DoctorDashboard() {
    const { patientId } = useLocalSearchParams();
    const router = useRouter();
    const [patient, setPatient] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Chat State
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        if (patientId) fetchPatient();
    }, [patientId]);

    const fetchPatient = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/medical/profile/${patientId}`);
            if (response.ok) {
                const data = await response.json();
                setPatient(data);
            } else {
                Alert.alert("Error", "Patient not found");
                router.back();
            }
        } catch (e) {
            Alert.alert("Error", "Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleAskAI = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatLoading(true);

        try {
            const response = await fetch(`${BACKEND_URL}/api/medical/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId, question: userMsg })
            });

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'ai', content: data.answer }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', content: "Error: Could not reach AI." }]);
        } finally {
            setChatLoading(false);
        }
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Patient Dashboard</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Vitals Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="person" size={20} color={Colors.primary} />
                        <Text style={styles.cardTitle}>{patient?.name || "Unknown Patient"}</Text>
                    </View>
                    <View style={styles.grid}>
                        <View style={styles.gridItem}>
                            <Text style={styles.gridLabel}>Age</Text>
                            <Text style={styles.gridValue}>{patient?.age}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.gridLabel}>Blood</Text>
                            <Text style={styles.gridValue}>{patient?.bloodType || "N/A"}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.gridLabel}>Gender</Text>
                            <Text style={styles.gridValue}>{patient?.gender || "N/A"}</Text>
                        </View>
                    </View>
                </View>

                {/* Alerts Card */}
                <View style={[styles.card, { borderColor: '#EF4444', borderWidth: 1 }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="warning" size={20} color="#EF4444" />
                        <Text style={[styles.cardTitle, { color: '#EF4444' }]}>Critical Alerts</Text>
                    </View>
                    <Text style={styles.alertText}><Text style={{ fontWeight: 'bold' }}>Allergies:</Text> {patient?.allergies || "None"}</Text>
                    <Text style={styles.alertText}><Text style={{ fontWeight: 'bold' }}>Conditions:</Text> {patient?.conditions || "None"}</Text>
                </View>

                {/* AI Chat Section */}
                <Text style={styles.sectionTitle}>Ask AI Assistant</Text>
                <View style={styles.chatContainer}>
                    <ScrollView style={styles.chatHistory}>
                        {messages.length === 0 && (
                            <Text style={styles.emptyChat}>Ask questions about the patient's history...</Text>
                        )}
                        {messages.map((msg, idx) => (
                            <View key={idx} style={[
                                styles.messageBubble,
                                msg.role === 'user' ? styles.userBubble : styles.aiBubble
                            ]}>
                                <Text style={msg.role === 'user' ? styles.userText : styles.aiText}>{msg.content}</Text>
                            </View>
                        ))}
                        {chatLoading && <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 10 }} />}
                    </ScrollView>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={input}
                            onChangeText={setInput}
                            placeholder="Ask about medical history..."
                        />
                        <TouchableOpacity onPress={handleAskAI} style={styles.sendButton}>
                            <Ionicons name="send" size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: Colors.primary,
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    backButton: { padding: 8 },
    content: { flex: 1, padding: 20 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    grid: { flexDirection: 'row', justifyContent: 'space-between' },
    gridItem: { alignItems: 'center' },
    gridLabel: { fontSize: 12, color: '#64748B' },
    gridValue: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
    alertText: { fontSize: 14, color: '#334155', marginBottom: 5 },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 10 },
    chatContainer: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        height: 400,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    chatHistory: { flex: 1, padding: 15 },
    emptyChat: { color: '#94A3B8', textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
    messageBubble: { padding: 12, borderRadius: 12, marginBottom: 10, maxWidth: '80%' },
    userBubble: { backgroundColor: Colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 2 },
    aiBubble: { backgroundColor: '#F1F5F9', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
    userText: { color: '#FFF' },
    aiText: { color: '#1E293B' },

    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginRight: 10,
    },
    sendButton: {
        backgroundColor: Colors.primary,
        padding: 10,
        borderRadius: 20,
    }
});
