import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
  Vibration,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafetyCheck } from '../contexts/SafetyCheckContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SafetyCallModal() {
  const { callState, answerCall, submitPin } = useSafetyCheck();
  const [pin, setPin] = useState('');
  
  // Reset PIN when call starts
  useEffect(() => {
    if (callState === 'active') {
      setPin('');
    }
  }, [callState]);

  // Vibrate when ringing
  useEffect(() => {
    let interval: any;
    if (callState === 'ringing') {
      interval = setInterval(() => {
        Vibration.vibrate([0, 1000, 1000]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const handleNumberPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => submitPin(newPin), 500);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  if (callState === 'idle') return null;

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Realistic Call Background */}
        <LinearGradient
            colors={['#203A43', '#2C5364']}
            style={styles.background}
        />

        {callState === 'ringing' ? (
          // INCOMING CALL UI - Realistic iOS Style
          <SafeAreaView style={styles.callContainer}>
            <View style={styles.topSpacer} />
            
            <View style={styles.callerInfo}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={80} color="#E0E0E0" />
              </View>
              <Text style={styles.callerName}>Safety Agent</Text>
              <Text style={styles.callStatus}>AlertMate Audio...</Text>
            </View>

            <View style={styles.bottomControls}>
                <View style={styles.actionButtonsRow}>
                    <TouchableOpacity style={styles.declineButton}>
                        <Ionicons name="close" size={36} color="#FFFFFF" />
                        <Text style={styles.buttonLabel}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.acceptButton} onPress={answerCall}>
                        <Ionicons name="call" size={36} color="#FFFFFF" />
                        <Text style={styles.buttonLabel}>Accept</Text>
                    </TouchableOpacity>
                </View>
            </View>
          </SafeAreaView>
        ) : (
          // ACTIVE CALL (PIN ENTRY) UI
          <SafeAreaView style={styles.activeCallContainer}>
            <View style={styles.activeHeader}>
              <View style={styles.smallAvatar}>
                 <Ionicons name="person" size={30} color="#E0E0E0" />
              </View>
              <Text style={styles.activeTitle}>Safety Agent</Text>
              <Text style={styles.activeTimer}>00:05</Text>
            </View>

            <View style={styles.pinSection}>
                <Text style={styles.pinPrompt}>Enter Safety PIN</Text>
                <View style={styles.pinDisplay}>
                    {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={[styles.pinDot, pin.length > i && styles.pinDotFilled]} />
                    ))}
                </View>
            </View>

            <View style={styles.keypad}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['', '0', 'del']
              ].map((row, rowIndex) => (
                <View key={rowIndex} style={styles.keypadRow}>
                  {row.map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.keyButton, !key && styles.hiddenKey]}
                      onPress={() => key === 'del' ? handleDelete() : key && handleNumberPress(key)}
                      disabled={!key}
                    >
                      {key === 'del' ? (
                        <Ionicons name="backspace" size={24} color="#FFFFFF" />
                      ) : (
                        <Text style={styles.keyText}>{key}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.endCallButton}>
                <Ionicons name="call" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  callContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  topSpacer: {
      height: 60,
  },
  callerInfo: {
    alignItems: 'center',
    marginTop: 40,
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#546E7A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  callerName: {
    fontSize: 34,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  callStatus: {
    fontSize: 18,
    color: '#B0BEC5',
    fontWeight: '400',
  },
  bottomControls: {
      width: '100%',
      paddingHorizontal: 40,
      marginBottom: 40,
  },
  actionButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
  },
  declineButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 75,
      height: 75,
      borderRadius: 37.5,
      backgroundColor: '#FF3B30', // iOS Red
  },
  acceptButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 75,
      height: 75,
      borderRadius: 37.5,
      backgroundColor: '#4CD964', // iOS Green
  },
  buttonLabel: {
      color: '#FFFFFF',
      marginTop: 8,
      fontSize: 14,
      position: 'absolute',
      bottom: -25,
  },
  
  // Active Call Styles
  activeCallContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  activeHeader: {
      alignItems: 'center',
      marginTop: 20,
  },
  smallAvatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#546E7A',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
  },
  activeTitle: {
      fontSize: 24,
      color: '#FFFFFF',
      fontWeight: '500',
  },
  activeTimer: {
      fontSize: 16,
      color: '#B0BEC5',
      marginTop: 4,
  },
  pinSection: {
      alignItems: 'center',
      marginBottom: 20,
  },
  pinPrompt: {
      fontSize: 16,
      color: '#FFFFFF',
      marginBottom: 16,
      letterSpacing: 1,
  },
  pinDisplay: {
    flexDirection: 'row',
    gap: 24,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#FFFFFF',
  },
  keypad: {
    width: '80%',
    marginBottom: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  keyButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hiddenKey: {
      backgroundColor: 'transparent',
  },
  keyText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  endCallButton: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: '#FF3B30',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
  },
});
