import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { CameraView, Camera } from "expo-camera";
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Theme';

export default function DoctorScanner() {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const getCameraPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
        };

        getCameraPermissions();
    }, []);

    const handleBarCodeScanned = ({ type, data }: { type: string, data: string }) => {
        setScanned(true);
        // Navigate to dashboard with patientId
        router.push({ pathname: '/doctor-dashboard', params: { patientId: data } });
    };

    if (hasPermission === null) {
        return <Text>Requesting for camera permission</Text>;
    }
    if (hasPermission === false) {
        return <Text>No access to camera</Text>;
    }

    return (
        <View style={styles.container}>
            <CameraView
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "pdf417"],
                }}
                style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Scan Patient QR</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.scanFrame} />
                <Text style={styles.instruction}>Align QR code within the frame</Text>

                {scanned && (
                    <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 60,
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    backButton: {
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
    },
    title: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: Colors.primary,
        backgroundColor: 'transparent',
        borderRadius: 20,
    },
    instruction: {
        color: '#FFF',
        fontSize: 16,
        marginTop: 20,
    },
});
