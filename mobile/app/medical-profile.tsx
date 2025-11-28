import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, FlatList, ActivityIndicator, TouchableWithoutFeedback, Keyboard, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/constants/Theme';
import QRCode from 'react-native-qrcode-svg';
import { BACKEND_URL } from '@/constants/Config';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/contexts/AuthContext';

export default function MedicalProfile() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [patientId, setPatientId] = useState<string | null>(null);
    const [showQR, setShowQR] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'reports'>('profile');

    // Profile Data
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        height: '',
        weight: '',
        gender: '',
        bloodType: '',
        allergies: '',
        conditions: '',
        medications: '',
    });

    // Reports Data
    const [reports, setReports] = useState<any[]>([]);
    const [showAddReport, setShowAddReport] = useState(false);
    const [newReport, setNewReport] = useState({ title: '', content: '' });
    const [addingReport, setAddingReport] = useState(false);
    const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

    useEffect(() => {
        if (user?.id) {
            setPatientId(user.id);
            fetchProfileFromBackend(user.id);
        } else {
            loadProfile();
        }
    }, [user]);

    const loadProfile = async () => {
        try {
            const savedId = await AsyncStorage.getItem('patient_id');
            if (savedId) {
                setPatientId(savedId);
                fetchProfileFromBackend(savedId);
            } else {
                // Try local storage fallback
                const savedProfile = await AsyncStorage.getItem('medical_profile');
                if (savedProfile) setFormData(JSON.parse(savedProfile));
            }
        } catch (e) {
            console.error("Failed to load profile", e);
        }
    };

    const fetchProfileFromBackend = async (id: string) => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/medical/profile/${id}`);
            if (response.ok) {
                const data = await response.json();
                setFormData({
                    name: data.user?.name || '',
                    age: '',
                    height: data.height || '',
                    weight: data.weight || '',
                    gender: data.gender || '',
                    bloodType: data.bloodType || '',
                    allergies: data.allergies || '',
                    conditions: data.conditions || '',
                    medications: data.medications || '',
                });
                setReports(data.reports || []);
            }
        } catch (e) {
            console.error("Failed to fetch from backend", e);
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async () => {
        setLoading(true);
        try {
            // 1. Save Locally
            await AsyncStorage.setItem('medical_profile', JSON.stringify(formData));

            const currentUserId = user?.id || patientId;

            if (!currentUserId) {
                Alert.alert("Error", "User not authenticated");
                return;
            }

            // 2. Save to Backend
            const response = await fetch(`${BACKEND_URL}/api/medical/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, ...formData })
            });

            if (response.ok) {
                const data = await response.json();
                setPatientId(data.userId);
                await AsyncStorage.setItem('patient_id', data.userId);
                Alert.alert("Success", "Profile updated successfully!");
                setShowQR(true);
            } else {
                Alert.alert("Error", "Failed to sync with cloud");
            }
        } catch (e) {
            Alert.alert("Error", "Network error");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };


    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });

            if (result.assets && result.assets.length > 0) {
                setSelectedFile(result.assets[0]);
            }
        } catch (err) {
            console.log('Document selection cancelled');
        }
    };

    const handleAddReport = async () => {
        if (!newReport.title) {
            Alert.alert("Error", "Please provide a title for the report");
            return;
        }
        if (!patientId) {
            Alert.alert("Error", "Please save your profile first");
            return;
        }

        setAddingReport(true);
        try {
            const formData = new FormData();
            formData.append('userId', patientId);
            formData.append('title', newReport.title);
            formData.append('content', newReport.content || '');

            if (selectedFile) {
                formData.append('file', {
                    uri: selectedFile.uri,
                    name: selectedFile.name,
                    type: selectedFile.mimeType || 'application/octet-stream',
                } as any);
            }

            const response = await fetch(`${BACKEND_URL}/api/medical/report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            if (response.ok) {
                const savedReport = await response.json();
                setReports([...reports, savedReport]);
                setNewReport({ title: '', content: '' });
                setSelectedFile(null);
                setShowAddReport(false);
                Alert.alert("Success", "Report added successfully");
            } else {
                const err = await response.json();
                Alert.alert("Error", err.error || "Failed to add report");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Network error");
        } finally {
            setAddingReport(false);
        }
    };

    const renderProfileTab = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Personal Info</Text>

                <Text style={styles.label}>Full Name</Text>
                <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(t) => setFormData({ ...formData, name: t })}
                    placeholder="John Doe"
                    placeholderTextColor={Colors.textSecondary}
                />

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Text style={styles.label}>Age</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.age}
                            onChangeText={(t) => setFormData({ ...formData, age: t })}
                            keyboardType="numeric"
                            placeholder="25"
                            placeholderTextColor={Colors.textSecondary}
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={styles.label}>Gender</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.gender}
                            onChangeText={(t) => setFormData({ ...formData, gender: t })}
                            placeholder="M/F"
                            placeholderTextColor={Colors.textSecondary}
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Text style={styles.label}>Height (cm)</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.height}
                            onChangeText={(t) => setFormData({ ...formData, height: t })}
                            keyboardType="numeric"
                            placeholder="175"
                            placeholderTextColor={Colors.textSecondary}
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={styles.label}>Weight (kg)</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.weight}
                            onChangeText={(t) => setFormData({ ...formData, weight: t })}
                            keyboardType="numeric"
                            placeholder="70"
                            placeholderTextColor={Colors.textSecondary}
                        />
                    </View>
                </View>

                <Text style={styles.label}>Blood Type</Text>
                <TextInput
                    style={styles.input}
                    value={formData.bloodType}
                    onChangeText={(t) => setFormData({ ...formData, bloodType: t })}
                    placeholder="O+"
                    placeholderTextColor={Colors.textSecondary}
                />
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Medical History</Text>

                <Text style={styles.label}>Allergies</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.allergies}
                    onChangeText={(t) => setFormData({ ...formData, allergies: t })}
                    multiline
                    placeholder="Peanuts, Penicillin..."
                    placeholderTextColor={Colors.textSecondary}
                />

                <Text style={styles.label}>Existing Conditions</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.conditions}
                    onChangeText={(t) => setFormData({ ...formData, conditions: t })}
                    multiline
                    placeholder="Asthma, Diabetes..."
                    placeholderTextColor={Colors.textSecondary}
                />

                <Text style={styles.label}>Current Medications</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.medications}
                    onChangeText={(t) => setFormData({ ...formData, medications: t })}
                    multiline
                    placeholder="Insulin, Inhaler..."
                    placeholderTextColor={Colors.textSecondary}
                />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.saveButtonText}>Save Profile</Text>
                )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
        </ScrollView>
    );

    const renderReportsTab = () => (
        <View style={styles.tabContent}>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddReport(true)}>
                <Ionicons name="add" size={24} color="#FFF" />
                <Text style={styles.addButtonText}>Add New Report</Text>
            </TouchableOpacity>

            <FlatList
                data={reports}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.reportCard}
                        onPress={() => {
                            if (item.fileUrl) {
                                Linking.openURL(item.fileUrl);
                            } else {
                                Alert.alert(
                                    item.content.split('\n')[0].replace('Title: ', '') || 'Report',
                                    item.content
                                );
                            }
                        }}
                    >
                        <View style={styles.reportIcon}>
                            <Ionicons name="document-text" size={24} color={Colors.primary} />
                        </View>
                        <View style={styles.reportInfo}>
                            <Text style={styles.reportTitle} numberOfLines={1}>
                                {item.content.split('\n')[0].replace('Title: ', '') || 'Untitled Report'}
                            </Text>
                            <Text style={styles.reportDate}>
                                {new Date(item.createdAt).toLocaleDateString()}
                            </Text>
                            <Text style={styles.reportPreview} numberOfLines={2}>
                                {item.content.split('\n').slice(2).join(' ')}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="documents-outline" size={64} color={Colors.textSecondary} />
                        <Text style={styles.emptyText}>No reports added yet</Text>
                        <Text style={styles.emptySubtext}>Add medical reports to help doctors understand your history better.</Text>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 100 }}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Medical ID</Text>
                {patientId ? (
                    <TouchableOpacity onPress={() => setShowQR(true)} style={styles.qrButton}>
                        <Ionicons name="qr-code" size={24} color="#1F2937" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
                    onPress={() => setActiveTab('profile')}
                >
                    <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
                    onPress={() => setActiveTab('reports')}
                >
                    <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>Reports</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'profile' ? renderProfileTab() : renderReportsTab()}

            {/* QR Modal */}
            <Modal visible={showQR} animationType="fade" transparent={true} onRequestClose={() => setShowQR(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Your Medical ID</Text>
                        <Text style={styles.modalSubtitle}>Show this to a doctor to share your profile.</Text>

                        <View style={styles.qrContainer}>
                            {patientId && <QRCode value={patientId} size={200} />}
                        </View>

                        <TouchableOpacity style={styles.closeButton} onPress={() => setShowQR(false)}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Add Report Modal */}
            <Modal visible={showAddReport} animationType="slide" transparent={true} onRequestClose={() => setShowAddReport(false)}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalContainer}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Add Medical Report</Text>
                                    <TouchableOpacity onPress={() => setShowAddReport(false)}>
                                        <Ionicons name="close" size={24} color={Colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.label}>Report Title</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newReport.title}
                                    onChangeText={(t) => setNewReport({ ...newReport, title: t })}
                                    placeholder="e.g., Blood Test Results"
                                />

                                <Text style={styles.label}>Upload Document (PDF/Image)</Text>
                                <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
                                    <Ionicons name={selectedFile ? "checkmark-circle" : "cloud-upload-outline"} size={24} color={Colors.primary} />
                                    <Text style={styles.uploadButtonText}>
                                        {selectedFile ? selectedFile.name : "Select File"}
                                    </Text>
                                </TouchableOpacity>
                                {selectedFile && (
                                    <TouchableOpacity onPress={() => setSelectedFile(null)} style={{ alignSelf: 'flex-end', marginBottom: 10 }}>
                                        <Text style={{ color: 'red', fontSize: 12 }}>Remove File</Text>
                                    </TouchableOpacity>
                                )}

                                <Text style={styles.label}>Or Paste Content / Summary</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea, { height: 100 }]}
                                    value={newReport.content}
                                    onChangeText={(t) => setNewReport({ ...newReport, content: t })}
                                    multiline
                                    placeholder="Paste text here..."
                                    textAlignVertical="top"
                                />

                                <TouchableOpacity style={styles.saveButton} onPress={handleAddReport} disabled={addingReport}>
                                    {addingReport ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>Add Report</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    backButton: {
        padding: 8,
    },
    qrButton: {
        padding: 8,
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 0,
        backgroundColor: '#FFFFFF',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: Colors.primary,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
    },
    activeTabText: {
        color: Colors.primary,
        fontWeight: '600',
    },
    tabContent: {
        flex: 1,
        paddingHorizontal: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 0,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfInput: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
        marginBottom: 8,
        marginTop: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1F2937',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    addButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    reportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 0,
    },
    reportIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    reportInfo: {
        flex: 1,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    reportDate: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    reportPreview: {
        fontSize: 12,
        color: '#6B7280',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
        textAlign: 'center',
    },
    qrContainer: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 24,
    },
    closeButton: {
        paddingVertical: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#374151',
        fontWeight: '600',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 8,
        marginTop: 8,
    },
    uploadButtonText: {
        marginLeft: 8,
        color: '#374151',
        fontSize: 14,
        fontWeight: '500',
    },
});
