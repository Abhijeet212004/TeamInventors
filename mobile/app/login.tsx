import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/Theme';
import { router } from 'expo-router';

export default function LoginScreen() {
  const { login, sendOTP, loading } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOTP] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);
    try {
      await sendOTP(phone);
      setStep('otp');
      Alert.alert('Success', 'OTP sent to your phone number');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      await login(phone, otp);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AlertMate</Text>
          <Text style={styles.subtitle}>Your Safety Companion</Text>
        </View>

        {/* Phone Input Step */}
        {step === 'phone' && (
          <View style={styles.form}>
            <Text style={styles.label}>Enter your phone number</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor={Colors.placeholder}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.secondary} />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* OTP Input Step */}
        {step === 'otp' && (
          <View style={styles.form}>
            <Text style={styles.label}>Enter OTP</Text>
            <Text style={styles.otpHint}>Sent to +91 {phone}</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="000000"
              placeholderTextColor={Colors.placeholder}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOTP}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.secondary} />
              ) : (
                <Text style={styles.buttonText}>Verify & Login</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setStep('phone');
                setOTP('');
              }}
            >
              <Text style={styles.backButtonText}>Change Number</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.xxl * 2,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
  },
  form: {
    marginBottom: Spacing.xxl,
  },
  label: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.secondary,
  },
  countryCode: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.primary,
    paddingHorizontal: Spacing.md,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  input: {
    flex: 1,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  otpHint: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.secondary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  backButton: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: Spacing.xl,
  },
  footerText: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
});
