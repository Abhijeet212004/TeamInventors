import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configuration for API endpoints
// Change this to your ngrok URL when testing on physical device
// or use your local network IP (e.g., 192.168.1.x:3000)

// Replace with your actual machine's IP address or ngrok URL
export const API_BASE_URL = 'https://undemure-parasitically-nevada.ngrok-free.dev/api';
export const SOCKET_URL = 'https://undemure-parasitically-nevada.ngrok-free.dev';
export const ML_API_URL = 'http://10.203.160.205:8000'; // Local IP for ML Model

// Check if running on physical device or simulator/emulator
// Use multiple methods to detect physical device
const isDevice =
  Constants.isDevice === true ||
  (Constants.platform?.ios?.model && !Constants.platform.ios.model.includes('Simulator')) ||
  (Constants.platform?.android?.model && Constants.platform.android.model !== 'sdk_gphone');

// For safer detection, also check if localhost would work
// If running through Expo Go on physical device, definitely need remote API
const isExpoGo = Constants.appOwnership === 'expo';

console.log('🌐 API Configuration:');
console.log('  - Is Physical Device:', isDevice);
console.log('  - Constants.isDevice:', Constants.isDevice);
console.log('  - Is Expo Go:', isExpoGo);
console.log('  - Platform:', Platform.OS);
console.log('  - Using API:', API_BASE_URL);

export default {
  API_BASE_URL,
};
