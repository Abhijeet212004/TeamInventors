import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHAR_UUID_TX = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'; // Receive from ESP32
const CHAR_UUID_RX = 'beb5483e-36e1-4688-b7f5-ea07361b26a9'; // Send to ESP32

class LoRaService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private onMessageCallback: ((message: string) => void) | null = null;

  constructor() {
    this.manager = new BleManager();
  }

  /**
   * Request Bluetooth permissions (Android)
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        return Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true; // iOS handles permissions automatically
  }

  /**
   * Scan for AlertMate LoRa devices
   */
  async scanForDevice(role: 'USER' | 'GUARDIAN'): Promise<Device | null> {
    console.log(`🔍 Scanning for AlertMate_${role} device...`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.manager.stopDeviceScan();
        reject(new Error('Device not found after 10 seconds'));
      }, 10000);

      this.manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          clearTimeout(timeout);
          this.manager.stopDeviceScan();
          reject(error);
          return;
        }

        if (device?.name === `AlertMate_${role}`) {
          clearTimeout(timeout);
          this.manager.stopDeviceScan();
          console.log(`✅ Found device: ${device.name}`);
          resolve(device);
        }
      });
    });
  }

  /**
   * Connect to LoRa device
   */
  async connect(role: 'USER' | 'GUARDIAN'): Promise<boolean> {
    try {
      // Check permissions
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions not granted');
      }

      // Scan for device
      const device = await this.scanForDevice(role);
      if (!device) {
        throw new Error('Device not found');
      }

      // Connect
      console.log('🔗 Connecting to device...');
      this.connectedDevice = await device.connect();

      // Discover services and characteristics
      await this.connectedDevice.discoverAllServicesAndCharacteristics();
      console.log('✅ Connected and services discovered');

      // Setup notification listener
      await this.setupNotifications();

      return true;
    } catch (error) {
      console.error('❌ Connection error:', error);
      throw error;
    }
  }

  /**
   * Setup notifications from ESP32
   */
  private async setupNotifications() {
    if (!this.connectedDevice) return;

    this.connectedDevice.monitorCharacteristicForService(
      SERVICE_UUID,
      CHAR_UUID_TX,
      (error, characteristic) => {
        if (error) {
          console.error('❌ Notification error:', error);
          return;
        }

        if (characteristic?.value) {
          const message = this.base64Decode(characteristic.value);
          console.log('📨 Received from ESP32:', message);

          if (this.onMessageCallback) {
            this.onMessageCallback(message);
          }
        }
      }
    );

    console.log('✅ Notifications setup');
  }

  /**
   * Send SOS via LoRa
   */
  async sendSOS(userId: string, lat: number, lon: number): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('Device not connected');
    }

    const message = `SOS:${userId},${lat.toFixed(6)},${lon.toFixed(6)}`;
    console.log('📤 Sending SOS:', message);

    await this.connectedDevice.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHAR_UUID_RX,
      this.base64Encode(message)
    );

    console.log('✅ SOS sent via LoRa');
  }

  /**
   * Check if device is connected
   */
  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  /**
   * Disconnect from device
   */
  async disconnect() {
    if (this.connectedDevice) {
      await this.connectedDevice.cancelConnection();
      this.connectedDevice = null;
      console.log('🔌 Disconnected from device');
    }
  }

  /**
   * Set callback for incoming messages
   */
  onMessage(callback: (message: string) => void) {
    this.onMessageCallback = callback;
  }

  /**
   * Helper: Base64 encode
   */
  private base64Encode(str: string): string {
    return Buffer.from(str, 'utf-8').toString('base64');
  }

  /**
   * Helper: Base64 decode
   */
  private base64Decode(base64: string): string {
    return Buffer.from(base64, 'base64').toString('utf-8');
  }
}

export const loraService = new LoRaService();
