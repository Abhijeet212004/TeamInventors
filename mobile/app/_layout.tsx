import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
// Change started
import { useShake } from '@/hooks/useShake';
import { SafetyCheckProvider } from '@/contexts/SafetyCheckContext';
import { ContextRiskProvider } from '@/contexts/ContextRiskContext';
import SafetyCallModal from '@/components/SafetyCallModal';
// Change ended

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'auth',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Vibration } from 'react-native';
import api from '@/services/api';
import { API_BASE_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface SosNotificationData {
  type: string;
  latitude: number;
  longitude: number;
  userId: string;
  userName: string;
}

export default function RootLayout() {
  const router = useRouter();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Change started
  // Shake to SOS
  useShake(() => {
    console.log('📳 Shake detected! Triggering SOS...');
    Vibration.vibrate([0, 500, 200, 500]); // Vibrate to confirm
    router.push('/sos-countdown');
  });
  // Change ended

  // WebSocket connection for real-time SOS alerts
  useWebSocket((data) => {
    console.log('📱 Received WebSocket Data:', data);

    if (data.type === 'SOS_ALERT') {
      // Vibrate for 3 seconds
      Vibration.vibrate([0, 1000, 500, 1000, 500, 1000]);

      // Show toast notification
      Toast.show({
        type: 'error',
        text1: '🚨 SOS ALERT!',
        text2: `${data.userName} needs help! Tap to view location.`,
        position: 'top',
        visibilityTime: 8000,
        autoHide: true,
        topOffset: 50,
        onPress: () => {
          router.push({
            pathname: '/share-tracking',
            params: {
              sosLatitude: data.latitude,
              sosLongitude: data.longitude,
              sosUserId: data.userId,
              sosUserName: data.userName
            }
          });
        }
      });
    } else if (data.type === 'CROWD_ALERT') {
      // Vibrate for 3 seconds
      Vibration.vibrate([0, 1000, 500, 1000, 500, 1000]);

      // Show toast notification for Crowd Shield
      Toast.show({
        type: 'error',
        text1: '🛡️ CROWD SHIELD ALERT!',
        text2: `Emergency nearby (${data.distance ? data.distance.toFixed(1) : '?'}km). Tap to respond.`,
        position: 'top',
        visibilityTime: 10000,
        autoHide: true,
        topOffset: 50,
        onPress: () => {
          router.push({
            pathname: '/shield',
            params: {
              alertData: JSON.stringify(data)
            }
          });
        }
      });
    } else if (data.type === 'help_accepted') {
      // Notification for Victim that help is coming
      Vibration.vibrate([0, 500, 200, 500]);

      Toast.show({
        type: 'success',
        text1: 'HELP IS ON THE WAY!',
        text2: `${data.helperName} is coming to help you! Tap to track.`,
        position: 'top',
        visibilityTime: 10000,
        autoHide: true,
        topOffset: 50,
        onPress: () => {
          router.push({
            pathname: '/shield',
            params: {
              alertData: JSON.stringify(data)
            }
          });
        }
      });
    }
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      registerForPushNotificationsAsync();
    }
  }, [loaded]);

  useEffect(() => {
    // Handle notification tap (when app is in background/closed)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as unknown as SosNotificationData;
      if (data.type === 'SOS_ALERT') {
        // Navigate to map with user location
        router.push({
          pathname: '/share-tracking',
          params: {
            sosLatitude: data.latitude,
            sosLongitude: data.longitude,
            sosUserId: data.userId,
            sosUserName: data.userName
          }
        });
      }
    });

    // Handle notification received (when app is in foreground)
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data as unknown as SosNotificationData;
      if (data.type === 'SOS_ALERT') {
        // Vibrate for 3 seconds (3000ms)
        Vibration.vibrate([0, 1000, 500, 1000, 500, 1000]); // Pattern: wait, vibrate, pause, vibrate, pause, vibrate

        // Show toast notification
        Toast.show({
          type: 'error',
          text1: '🚨 SOS ALERT!',
          text2: `${data.userName} needs help! Tap to view location.`,
          position: 'top',
          visibilityTime: 8000,
          autoHide: true,
          topOffset: 50,
          onPress: () => {
            router.push({
              pathname: '/share-tracking',
              params: {
                sosLatitude: data.latitude,
                sosLongitude: data.longitude,
                sosUserId: data.userId,
                sosUserName: data.userName
              }
            });
          }
        });
      }
    });

    return () => {
      subscription.remove();
      foregroundSubscription.remove();
    };
  }, []);

  async function registerForPushNotificationsAsync() {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      if (Device.isDevice) {
        // Request permissions explicitly
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          console.log('Requesting notification permissions...');
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
          console.log('Permission status:', status);
        }

        if (finalStatus !== 'granted') {
          console.log('⚠️ Notification permissions denied!');
          alert('Please enable notifications to receive SOS alerts from your contacts.');
          return;
        }

        console.log('✅ Notification permissions granted');

        // Get the push token (without requiring project ID)
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          const token = tokenData.data;
          console.log('✅ Expo Push Token obtained:', token);

          // Send to backend
          const authToken = await AsyncStorage.getItem('authToken');
          if (authToken) {
            console.log('📤 Sending push token to backend...');
            await api.post('/auth/push-token', { pushToken: token });
            console.log('✅ Push token registered with backend');
          } else {
            console.log('⚠️ No auth token found, will register push token after login');
          }
        } catch (tokenError: any) {
          console.error('❌ Error getting push token:', tokenError);

          // For Expo Go - use a placeholder token since push notifications don't work anyway
          // The SOS feature will still work via local notifications when app is open
          if (tokenError.message?.includes('projectId')) {
            console.log('📱 Running in Expo Go - using local notifications only');
            const authToken = await AsyncStorage.getItem('authToken');
            if (authToken) {
              // Register a placeholder token so backend knows the user exists
              let userId = await AsyncStorage.getItem('userId');
              if (!userId) {
                const userStr = await AsyncStorage.getItem('user');
                if (userStr) {
                  const user = JSON.parse(userStr);
                  userId = user.id;
                }
              }

              if (userId) {
                await api.post('/auth/push-token', {
                  pushToken: 'EXPO_GO_LOCAL_' + userId
                }).catch((err: any) => console.log('Could not register placeholder token:', err));
              }
            }
          }
        }
      } else {
        console.log('⚠️ Must use physical device for Push Notifications');
        alert('Push notifications only work on physical devices, not simulators.');
      }
    } catch (error) {
      console.error('❌ Error in registerForPushNotificationsAsync:', error);
    }
  }

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <SafetyCheckProvider>
        <ContextRiskProvider>
          <RootLayoutNav />
          <SafetyCallModal />
          <Toast />
        </ContextRiskProvider>
      </SafetyCheckProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const isAuth = segments[0] === 'auth';
    const isCreatingBubble = segments[0] === 'create-bubble';
    const isSharingTracking = segments[0] === 'share-tracking';
    const isMapTracking = segments[0] === 'map-tracking';
    const isCollectingName = segments[0] === 'collect-name';
    const isJoiningBubble = segments[0] === 'join-bubble';
    const isStartTrip = segments[0] === 'start-trip';
    const isTripTracking = segments[0] === 'trip-tracking';
    const isConnectedUsers = segments[0] === 'connected-users';
    const isTripHistory = segments[0] === 'trip-history';
    const isTripAnalytics = segments[0] === 'trip-analytics';
    const isSosCountdown = segments[0] === 'sos-countdown';
    const isShield = segments[0] === 'shield';

    const isOfflineChat = segments[0] === 'offline-chat';
    const isOfflineMap = segments[0] === 'offline-map';
    const isMedicalProfile = segments[0] === 'medical-profile';
    const isDoctorScanner = segments[0] === 'doctor-scanner';
    const isDoctorDashboard = segments[0] === 'doctor-dashboard';

    if (!user && inAuthGroup) {
      // Redirect to auth if not authenticated
      router.replace('/auth');
    } else if (user && !inAuthGroup && !isAuth && !isCreatingBubble && !isSharingTracking && !isMapTracking && !isCollectingName && !isJoiningBubble && !isStartTrip && !isTripTracking && !isConnectedUsers && !isTripHistory && !isTripAnalytics && !isSosCountdown && !isShield && !isOfflineChat && !isOfflineMap && !isMedicalProfile && !isDoctorScanner && !isDoctorDashboard) {
      // Redirect to tabs if authenticated (but allow specific screens)
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="collect-name" options={{ headerShown: false }} />
        <Stack.Screen name="create-bubble" options={{ headerShown: false }} />
        <Stack.Screen name="join-bubble" options={{ headerShown: false }} />
        <Stack.Screen name="share-tracking" options={{ headerShown: false }} />
        <Stack.Screen name="map-tracking" options={{ headerShown: false }} />
        <Stack.Screen name="start-trip" options={{ headerShown: false }} />
        <Stack.Screen name="trip-tracking" options={{ headerShown: false }} />
        <Stack.Screen name="connected-users" options={{ headerShown: false }} />
        <Stack.Screen name="trip-history" options={{ headerShown: false }} />
        <Stack.Screen name="trip-analytics" options={{ headerShown: false }} />
        <Stack.Screen name="sos-countdown" options={{ headerShown: false }} />
        <Stack.Screen name="shield" options={{ headerShown: false }} />
        <Stack.Screen name="offline-chat" options={{ headerShown: false }} />
        <Stack.Screen name="offline-map" options={{ headerShown: false }} />
        <Stack.Screen name="medical-profile" options={{ headerShown: false }} />
        <Stack.Screen name="doctor-scanner" options={{ headerShown: false }} />
        <Stack.Screen name="doctor-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
