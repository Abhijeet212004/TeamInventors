import axios from 'axios';
import * as Location from 'expo-location';

const LORA_GATEWAY_IP = 'http://192.168.4.1'; // ESP32 default IP when in AP mode

export class LoRaService {
  
  /**
   * Check if we're connected to the ESP32 WiFi hotspot
   * This is a simple HTTP GET request - works 100% in Expo
   */
  static async isConnectedToLoRa(): Promise<boolean> {
    try {
      const response = await axios.get(`${LORA_GATEWAY_IP}/status`, {
        timeout: 2000 // 2 second timeout
      });
      
      console.log('✅ Connected to LoRa gateway:', response.data);
      return response.data.status === 'online';
      
    } catch (error) {
      console.log('❌ Not connected to LoRa gateway');
      return false;
    }
  }
  
  /**
   * Send SOS via LoRa network (HTTP POST to ESP32)
   * 100% compatible with Expo - just axios!
   */
  static async sendSOS(userId: string, phoneNumber: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Get current location (Expo built-in)
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        return {
          success: false,
          message: 'Location permission denied'
        };
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      // Prepare SOS data
      const sosData = {
        userId: userId,
        phone: phoneNumber,
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        timestamp: new Date().toISOString(),
        accuracy: location.coords.accuracy
      };
      
      console.log('📡 Sending SOS via LoRa:', sosData);
      
      // Send to ESP32 via HTTP POST
      // This is just a normal axios call - 100% Expo compatible!
      const response = await axios.post(
        `${LORA_GATEWAY_IP}/sos`,
        sosData,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ LoRa response:', response.data);
      
      return {
        success: true,
        message: response.data.message || 'SOS sent via LoRa'
      };
      
    } catch (error: any) {
      console.error('❌ LoRa error:', error.message);
      
      // User friendly error messages
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return {
          success: false,
          message: 'Not connected to AlertMate WiFi. Connect to "AlertMate_SOS" network first.'
        };
      }
      
      if (error.message.includes('Network request failed')) {
        return {
          success: false,
          message: 'No network connection. Please connect to AlertMate_SOS WiFi.'
        };
      }
      
      return {
        success: false,
        message: 'Failed to send SOS. Please try again.'
      };
    }
  }
  
  /**
   * Test connection to ESP32
   * Call this to verify setup
   */
  static async testConnection(): Promise<string> {
    try {
      const response = await axios.get(`${LORA_GATEWAY_IP}/`, {
        timeout: 3000
      });
      return `Connected! ESP32 says: ${response.data}`;
    } catch (error: any) {
      return `Not connected: ${error.message}`;
    }
  }
}
