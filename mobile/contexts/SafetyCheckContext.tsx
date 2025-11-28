import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { Alert, AppState } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import api from '../services/api';

interface SafetyCheckContextType {
  isActive: boolean;
  callState: 'idle' | 'ringing' | 'active';
  nextCheckTime: number | null;
  startMonitoring: (intervalMinutes: number) => void;
  stopMonitoring: () => void;
  answerCall: () => void;
  submitPin: (pin: string) => Promise<boolean>;
  triggerSOS: (reason: string, stealth?: boolean) => void;
}

const SafetyCheckContext = createContext<SafetyCheckContextType | undefined>(undefined);

export const SafetyCheckProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [callState, setCallState] = useState<'idle' | 'ringing' | 'active'>('idle');
  const [checkInterval, setCheckInterval] = useState<number>(1 * 60 * 1000); // Default 15 mins
  const [nextCheckTime, setNextCheckTime] = useState<number | null>(null);
  
  const timerRef = useRef<any>(null);
  const ringtoneRef = useRef<Audio.Sound | null>(null);
  const missedCallTimerRef = useRef<any>(null);
  const appState = useRef(AppState.currentState);
  const notificationId = useRef<string | null>(null);

  // Keep screen awake when monitoring is active
  useKeepAwake();

  // Handle App State Changes (Background -> Foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        // Check if we missed a check-in or if one is pending very soon
        if (isActive && nextCheckTime && Date.now() >= nextCheckTime) {
             console.log('📱 App foregrounded: Triggering missed/due check-in');
             triggerIncomingCall();
        }
      }
      appState.current = nextAppState;
    });

    // Handle Notification Response (User tapped the notification)
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data.type === 'SAFETY_CHECK') {
        console.log('🔔 Notification tapped: Triggering Safety Check');
        triggerIncomingCall();
      }
    });

    return () => {
      subscription.remove();
      notificationSubscription.remove();
    };
  }, [isActive, nextCheckTime]);

  const startMonitoring = (intervalMinutes: number) => {
    console.log(`🛡️ Safety Monitoring Started. Interval: ${intervalMinutes} mins`);
    setIsActive(true);
    const intervalMs = intervalMinutes * 60 * 1000;
    setCheckInterval(intervalMs);
    scheduleNextCheck(intervalMs);
    preloadRingtone();
  };

  const stopMonitoring = async () => {
    console.log('🛡️ Safety Monitoring Stopped');
    setIsActive(false);
    setCallState('idle');
    setNextCheckTime(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (missedCallTimerRef.current) clearTimeout(missedCallTimerRef.current);
    
    if (notificationId.current) {
      await Notifications.cancelScheduledNotificationAsync(notificationId.current);
      notificationId.current = null;
    }
    
    unloadRingtone();
  };

  const scheduleNextCheck = async (delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    const nextTime = Date.now() + delay;
    setNextCheckTime(nextTime);

    // Schedule local notification for background handling
    if (notificationId.current) {
      await Notifications.cancelScheduledNotificationAsync(notificationId.current);
    }

    const seconds = Math.ceil(delay / 1000);
    if (seconds > 0) {
      try {
        notificationId.current = await Notifications.scheduleNotificationAsync({
          content: {
            title: "🛡️ Safety Check",
            body: "It's time to verify your safety. Tap to check in.",
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { type: 'SAFETY_CHECK' }
          },
          trigger: { 
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: seconds,
            repeats: false
          },
        });
        console.log(`🔔 Notification scheduled in ${seconds}s`);
      } catch (error) {
        console.log('Error scheduling notification:', error);
      }
    }

    timerRef.current = setTimeout(() => {
      triggerIncomingCall();
    }, delay);
  };

  const triggerIncomingCall = async () => {
    console.log('📞 Incoming Safety Check Call...');
    
    // Cancel pending notification if we are handling it now
    if (notificationId.current) {
      await Notifications.cancelScheduledNotificationAsync(notificationId.current);
      notificationId.current = null;
    }

    setCallState('ringing');
    setNextCheckTime(null);
    
    playRingtone();

    // Set 60s timeout for missed call
    missedCallTimerRef.current = setTimeout(() => {
      if (callState === 'ringing') {
        handleMissedCall();
      }
    }, 60000);
  };

  const handleMissedCall = () => {
    console.log('❌ Missed Safety Call - Triggering SOS');
    stopRingtone();
    setCallState('idle');
    triggerSOS('Missed Safety Check-in');
  };

  const answerCall = () => {
    console.log('📞 Call Answered');
    stopRingtone();
    if (missedCallTimerRef.current) clearTimeout(missedCallTimerRef.current);
    setCallState('active');
    
    // AI Voice Prompt
    Speech.speak("This is your Safety Check. Please enter your 4-digit PIN to confirm you are safe.", {
      language: 'en',
      pitch: 1.0,
      rate: 0.9
    });
  };

  const preloadRingtone = async () => {
    try {
      // Configure audio to play even in silent mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/ringtone.mp3'),
        { shouldPlay: false, isLooping: true }
      );
      ringtoneRef.current = sound;
      console.log('🎵 Ringtone preloaded successfully');
    } catch (error) {
      console.log('Error preloading ringtone:', error);
    }
  };

  const playRingtone = async () => {
    if (ringtoneRef.current) {
      try {
        await ringtoneRef.current.playAsync();
      } catch (error) {
        console.log('Error playing preloaded ringtone:', error);
      }
    } else {
      // Fallback if not preloaded
      console.log('Ringtone not preloaded, loading now...');
      preloadRingtone().then(() => {
        if (ringtoneRef.current) ringtoneRef.current.playAsync();
      });
    }
  };

  const stopRingtone = async () => {
    if (ringtoneRef.current) {
      try {
        await ringtoneRef.current.stopAsync();
        // Do not unload here, keep it ready for next check
      } catch (e) {
        console.log('Error stopping ringtone:', e);
      }
    }
  };

  const unloadRingtone = async () => {
    if (ringtoneRef.current) {
      try {
        await ringtoneRef.current.stopAsync();
        await ringtoneRef.current.unloadAsync();
      } catch (e) {
        console.log('Error unloading ringtone:', e);
      }
      ringtoneRef.current = null;
    }
  };

  const submitPin = async (pin: string): Promise<boolean> => {
    if (pin === '1768') {
      // Correct PIN
      Speech.speak("Thank you. Next check in scheduled.", { rate: 1.1 });
      setCallState('idle');
      scheduleNextCheck(checkInterval);
      return true;
    } else if (pin === '9999') {
      // Duress PIN
      Speech.speak("Thank you. Verified.", { rate: 1.1 }); // Fake success
      setCallState('idle');
      triggerSOS('Duress PIN Entered', true);
      return true;
    } else {
      // Wrong PIN
      Speech.speak("Incorrect PIN. Please try again.");
      return false;
    }
  };

  const triggerSOS = async (reason: string, stealth: boolean = false) => {
    console.log(`🚨 TRIGGERING SOS: ${reason} (Stealth: ${stealth})`);
    stopMonitoring();

    if (stealth) {
      // Stealth Mode: Send SOS silently without navigating
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          await api.post('/sos/alert', {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            reason: reason
          });
          console.log('✅ Stealth SOS sent successfully');
        }
      } catch (error) {
        console.error('❌ Error sending stealth SOS:', error);
      }
    } else {
      // Normal Mode: Navigate to SOS countdown
      router.push('/sos-countdown');
    }
  };

  return (
    <SafetyCheckContext.Provider value={{
      isActive,
      callState,
      nextCheckTime,
      startMonitoring,
      stopMonitoring,
      answerCall,
      submitPin,
      triggerSOS
    }}>
      {children}
    </SafetyCheckContext.Provider>
  );
};

export const useSafetyCheck = () => {
  const context = useContext(SafetyCheckContext);
  if (context === undefined) {
    throw new Error('useSafetyCheck must be used within a SafetyCheckProvider');
  }
  return context;
};
