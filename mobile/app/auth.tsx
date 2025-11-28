import React, { useState, useRef } from 'react';
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
  StatusBar,
  Image,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

// Color theme from the logo
const AppColors = {
  primary: '#8B2E5A', // Deep pink/maroon from logo
  secondary: '#FFFFFF',
  accent: '#A84371',
  background: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
  inputBg: '#F9FAFB',
  buttonBg: '#8B2E5A',
};

export default function AuthScreen() {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(85); // 1:25 minutes
  const { login } = useAuth();

  const otpRefs = useRef<Array<TextInput | null>>([]);

  React.useEffect(() => {
    if (resendTimer > 0 && step === 'otp') {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer, step]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOTP = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      await authAPI.sendOTP(phone, email);
      setStep('otp');
      setResendTimer(85);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.verifyOTP(phone, otpString, email);

      // Check if user has a name before logging in
      if (!response.user.name || response.user.name.trim() === '') {
        // Set user first
        await login(response.user);
        // Then redirect to name collection screen
        setTimeout(() => {
          router.replace('/collect-name');
        }, 100);
      } else {
        // User has a name, log in
        await login(response.user);

        // --- DOCTOR CHECK ---
        try {
          // Import BACKEND_URL dynamically or use a hardcoded one for now if import fails
          // Assuming BACKEND_URL is available in Config
          const { BACKEND_URL } = require('../constants/Config');
          console.log('Checking doctor status for:', email);
          console.log('Backend URL:', BACKEND_URL);
          const docCheck = await fetch(`${BACKEND_URL}/api/medical/doctor/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const docData = await docCheck.json();
          console.log('Doctor check response:', docData);

          if (docData.isDoctor) {
            console.log('User is a doctor, redirecting...');
            setTimeout(() => {
              router.replace('/doctor-scanner');
            }, 100);
            return;
          }
        } catch (e) {
          console.error("Doctor check failed:", e);
          Alert.alert("Doctor Check Failed", "Could not verify doctor status. Proceeding as user.");
        }
        // --------------------

        setTimeout(() => {
          router.replace('/(tabs)');
        }, 100);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    try {
      await authAPI.sendOTP(phone, email);
      setResendTimer(85);
      Alert.alert('Success', 'OTP sent successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo Header */}
            <View style={styles.logoHeader}>
              <Image
                source={require('../assets/images/Alertnate_logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>ALERTMATE</Text>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
              {step === 'email' ? (
                <>
                  {/* Title */}
                  <Text style={styles.title}>SignUp / Login</Text>

                  {/* Illustration */}
                  <View style={styles.illustrationContainer}>
                    <View style={styles.illustrationCard}>
                      <View style={styles.iconLeft}>
                        <Ionicons name="person-outline" size={40} color="#FFFFFF" />
                      </View>
                      <View style={styles.illustrationLines}>
                        <View style={styles.line} />
                        <View style={styles.line} />
                        <View style={styles.line} />
                      </View>
                    </View>
                  </View>

                  {/* Heading */}
                  <Text style={styles.heading}>Enter Your Details</Text>
                  <Text style={styles.description}>
                    Your verified email and phone are crucial for{'\n'}
                    sending emergency alerts and{'\n'}
                    securing your account.
                  </Text>

                  {/* Email Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <TextInput
                      style={styles.emailInput}
                      placeholder="your@email.com"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                  </View>

                  {/* Phone Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <View style={styles.phoneContainer}>
                      <View style={styles.countryCodeBox}>
                        <Text style={styles.flag}>🇮🇳</Text>
                        <Text style={styles.countryCode}>+91</Text>
                      </View>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="9876543210"
                        placeholderTextColor="#999"
                        value={phone}
                        onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                        keyboardType="phone-pad"
                        maxLength={10}
                        editable={!loading}
                      />
                    </View>
                  </View>

                  {/* Continue Button */}
                  <TouchableOpacity
                    style={[styles.continueButton, loading && styles.buttonDisabled]}
                    onPress={handleSendOTP}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.continueButtonText}>Continue</Text>
                    )}
                  </TouchableOpacity>

                  {/* Doctor Login Button */}
                  <TouchableOpacity
                    style={styles.doctorLoginButton}
                    onPress={() => router.push('/doctor-login')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.doctorLoginText}>Login as Doctor</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Back Button */}
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setStep('email')}
                    disabled={loading}
                  >
                    <Ionicons name="chevron-back" size={28} color="#000" />
                  </TouchableOpacity>

                  {/* Title */}
                  <Text style={styles.verifyTitle}>Verify Email Address</Text>

                  {/* Illustration */}
                  <View style={styles.illustrationContainer}>
                    <View style={[styles.illustrationCard, styles.mailCard]}>
                      <Ionicons name="mail" size={48} color="#FFFFFF" />
                    </View>
                  </View>

                  {/* Heading */}
                  <Text style={styles.heading}>Check Your Email</Text>
                  <Text style={styles.description}>
                    We've sent a 6-digit verification code to{'\n'}
                    <Text style={styles.phoneNumber}>{email}</Text>
                    {'\n'}and{' '}
                    <Text style={styles.phoneNumber}>+91 {phone}</Text>
                  </Text>

                  {/* OTP Inputs */}
                  <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => { otpRefs.current[index] = ref; }}
                        style={styles.otpBox}
                        value={digit}
                        onChangeText={(value) => handleOtpChange(value.replace(/[^0-9]/g, ''), index)}
                        onKeyPress={(e) => handleOtpKeyPress(e, index)}
                        keyboardType="number-pad"
                        maxLength={1}
                        editable={!loading}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  {/* Verify Button */}
                  <TouchableOpacity
                    style={[styles.verifyButton, loading && styles.buttonDisabled]}
                    onPress={handleVerifyOTP}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.verifyButtonText}>Verify Code</Text>
                    )}
                  </TouchableOpacity>

                  {/* Resend */}
                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResendOTP}
                    disabled={resendTimer > 0 || loading}
                  >
                    <Text style={[styles.resendText, resendTimer > 0 && styles.resendDisabled]}>
                      Resend code in {formatTime(resendTimer)}
                    </Text>
                  </TouchableOpacity>

                  {/* Info Box */}
                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={24} color="#666" />
                    <Text style={styles.infoText}>
                      The code will expire in 15 minutes. Make{'\n'}
                      sure to check your SMS inbox.
                    </Text>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  logoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logoImage: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.primary,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 30,
  },
  verifyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginVertical: 25,
  },
  illustrationCard: {
    width: 140,
    height: 100,
    backgroundColor: '#7B9FE8',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  iconLeft: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationLines: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  mailCard: {
    flexDirection: 'column',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  line: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 3,
    marginVertical: 4,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  phoneNumber: {
    fontWeight: '600',
    color: '#000',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginLeft: 4,
  },
  emailContainer: {
    marginBottom: 20,
  },
  emailInput: {
    backgroundColor: AppColors.inputBg,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000',
  },
  phoneContainer: {
    flexDirection: 'row',
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.inputBg,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginRight: 12,
  },
  flag: {
    fontSize: 20,
    marginRight: 6,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 6,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: AppColors.inputBg,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000',
  },
  continueButton: {
    backgroundColor: AppColors.buttonBg,
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 5,
  },
  otpBox: {
    width: 50,
    height: 60,
    backgroundColor: AppColors.inputBg,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: AppColors.buttonBg,
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 30,
  },
  resendText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  resendDisabled: {
    color: '#999',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginLeft: 12,
  },
  doctorLoginButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  doctorLoginText: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
