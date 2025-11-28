import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Theme';
import { BACKEND_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DoctorLogin() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            // Updated endpoint to match medical routes
            const response = await fetch(`${BACKEND_URL}/api/medical/doctor/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                await AsyncStorage.setItem('doctor_token', JSON.stringify(data.doctor));
                router.replace('/doctor-scanner');
            } else {
                Alert.alert("Error", "Invalid credentials");
            }
        } catch (e) {
            Alert.alert("Error", "Network error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <Text style={styles.title}>Doctor Portal</Text>
                <Text style={styles.subtitle}>Sign in to access patient records</Text>

                <View style={styles.form}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        placeholder="doctor@hospital.com"
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholder="••••••••"
                    />

                    <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                        <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign In"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        padding: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 40,
    },
    form: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    label: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 20,
    },
    button: {
        backgroundColor: Colors.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
