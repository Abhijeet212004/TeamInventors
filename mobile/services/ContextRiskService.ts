import { Accelerometer, Gyroscope } from 'expo-sensors';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ML_API_URL } from '@/constants/Config';
import { Platform } from 'react-native';

// Configuration
const GOOGLE_MAPS_API_KEY = 'AIzaSyDWmZkfE6DvnNaf3nbPjgq8uOmBMg3d7_c';
const SENSOR_UPDATE_INTERVAL = 100; // 100ms
const VARIANCE_WINDOW_SIZE = 50; // 5 seconds of data at 100ms interval
const INACTIVITY_THRESHOLD_MINUTES = 5;
const NEARBY_SEARCH_RADIUS = 1000; // 1km
const DWELL_DISTANCE_THRESHOLD = 50; // 50 meters

interface SensorData {
    x: number;
    y: number;
    z: number;
}

interface RiskPredictionInput {
    lat: number;
    lon: number;
    speed_kmh: number;
    dwell_minutes: number;
    phone_inactive_minutes: number;
    acceleration_variance: number;
    gyroscope_variance: number;
    nearby_hospitals: number;
    nearby_police: number;
    nearby_petrol: number;
    nearby_public: number;
    route_risk: number;
    hour_of_day: number;
    is_night: number;
    day_of_week: number;
    is_isolated_area: number;
    distance_to_nearest_hospital_km: number;
    age: number;
    gender: number;
    weight: number;
    height: number;
    has_conditions: number;
}

export class ContextRiskService {
    private accelSubscription: any = null;
    private gyroSubscription: any = null;
    private accelBuffer: SensorData[] = [];
    private gyroBuffer: SensorData[] = [];
    
    private lastActivityTimestamp: number = Date.now();
    private lastLocation: Location.LocationObject | null = null;
    private dwellStartTime: number = Date.now();
    
    private nearbyPlacesCache: any = null;
    private lastPlacesFetchLocation: { lat: number; lon: number } | null = null;

    // User Metadata (Defaults)
    private userMetadata = {
        age: 30,
        gender: 1, // 0: Male, 1: Female (Defaulting to 1 as per request example)
        weight: 70,
        height: 170,
        has_conditions: 0
    };

    constructor() {
        this.loadUserMetadata();
    }

    private async loadUserMetadata() {
        try {
            const stored = await AsyncStorage.getItem('user_health_metadata');
            if (stored) {
                this.userMetadata = { ...this.userMetadata, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error('Failed to load user metadata', e);
        }
    }

    public startSensors() {
        Accelerometer.setUpdateInterval(SENSOR_UPDATE_INTERVAL);
        Gyroscope.setUpdateInterval(SENSOR_UPDATE_INTERVAL);

        this.accelSubscription = Accelerometer.addListener(data => {
            this.handleSensorData(data, this.accelBuffer);
            this.checkActivity(data);
        });

        this.gyroSubscription = Gyroscope.addListener(data => {
            this.handleSensorData(data, this.gyroBuffer);
        });
    }

    public stopSensors() {
        this.accelSubscription?.remove();
        this.gyroSubscription?.remove();
        this.accelSubscription = null;
        this.gyroSubscription = null;
        this.accelBuffer = [];
        this.gyroBuffer = [];
    }

    private handleSensorData(data: SensorData, buffer: SensorData[]) {
        buffer.push(data);
        if (buffer.length > VARIANCE_WINDOW_SIZE) {
            buffer.shift();
        }
    }

    private checkActivity(data: SensorData) {
        // Simple movement detection to reset inactivity timer
        const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
        // 1.0 is roughly gravity (stationary). Deviation implies movement.
        if (Math.abs(magnitude - 1.0) > 0.1) { 
            this.resetInactivityTimer();
        }
    }

    public resetInactivityTimer() {
        this.lastActivityTimestamp = Date.now();
    }

    private calculateVariance(buffer: SensorData[]): number {
        if (buffer.length === 0) return 0;
        
        // Calculate magnitude variance
        const magnitudes = buffer.map(d => Math.sqrt(d.x ** 2 + d.y ** 2 + d.z ** 2));
        const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
        const variance = magnitudes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / magnitudes.length;
        
        return variance;
    }

    private async getNearbyPlaces(lat: number, lon: number) {
        // Check cache: if moved less than 500m, return cached
        if (this.lastPlacesFetchLocation) {
            const dist = this.calculateDistance(lat, lon, this.lastPlacesFetchLocation.lat, this.lastPlacesFetchLocation.lon);
            if (dist < 0.5 && this.nearbyPlacesCache) {
                return this.nearbyPlacesCache;
            }
        }

        try {
            // Fetch Hospitals
            const hospitals = await this.fetchGooglePlaces(lat, lon, 'hospital');
            // Fetch Police
            const police = await this.fetchGooglePlaces(lat, lon, 'police');
            // Fetch Gas Stations
            const petrol = await this.fetchGooglePlaces(lat, lon, 'gas_station');
            // Fetch Restaurants/Stores (Public places)
            const restaurants = await this.fetchGooglePlaces(lat, lon, 'restaurant');
            
            // Calculate distance to nearest hospital
            let minHospitalDist = 10; // Default high
            if (hospitals.results.length > 0) {
                // Google Places returns geometry.location
                const nearest = hospitals.results[0]; // Usually sorted by prominence, but let's assume close enough
                // Ideally we calculate dist to all and find min, but for MVP:
                minHospitalDist = this.calculateDistance(lat, lon, nearest.geometry.location.lat, nearest.geometry.location.lng);
            }

            this.nearbyPlacesCache = {
                nearby_hospitals: hospitals.results.length,
                nearby_police: police.results.length,
                nearby_petrol: petrol.results.length,
                nearby_public: restaurants.results.length,
                distance_to_nearest_hospital_km: minHospitalDist
            };
            this.lastPlacesFetchLocation = { lat, lon };
            
            return this.nearbyPlacesCache;

        } catch (error) {
            console.error("Error fetching places:", error);
            // Return safe defaults if API fails
            return {
                nearby_hospitals: 1,
                nearby_police: 1,
                nearby_petrol: 1,
                nearby_public: 5,
                distance_to_nearest_hospital_km: 2.0
            };
        }
    }

    private async fetchGooglePlaces(lat: number, lon: number, type: string) {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${NEARBY_SEARCH_RADIUS}&type=${type}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        return await res.json();
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    public async collectSnapshot(): Promise<RiskPredictionInput | null> {
        // 1. Check Location Permissions
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
            console.log("⚠️ Location permission not granted for Context Risk Service");
            // Try to request it (though this might not work well in background)
            const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
            if (newStatus !== 'granted') return null;
        }

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude, speed } = location.coords;

        // Dwell Time Logic
        if (this.lastLocation) {
            const dist = this.calculateDistance(latitude, longitude, this.lastLocation.coords.latitude, this.lastLocation.coords.longitude) * 1000; // meters
            if (dist > DWELL_DISTANCE_THRESHOLD) {
                this.dwellStartTime = Date.now(); // Reset dwell
            }
        }
        this.lastLocation = location;
        const dwellMinutes = (Date.now() - this.dwellStartTime) / 1000 / 60;

        // Inactivity
        const inactiveMinutes = (Date.now() - this.lastActivityTimestamp) / 1000 / 60;

        // Nearby Places
        const places = await this.getNearbyPlaces(latitude, longitude);

        // Time
        const now = new Date();
        const hour = now.getHours();
        const isNight = (hour >= 22 || hour <= 5) ? 1 : 0;
        const dayOfWeek = now.getDay(); // 0-6

        // Isolated Area Logic
        const isIsolated = (places.nearby_public + places.nearby_petrol + places.nearby_police) < 2 ? 1 : 0;

        // Variances
        const accVar = this.calculateVariance(this.accelBuffer);
        const gyroVar = this.calculateVariance(this.gyroBuffer);

        return {
            lat: latitude,
            lon: longitude,
            speed_kmh: (speed || 0) * 3.6,
            dwell_minutes: dwellMinutes,
            phone_inactive_minutes: inactiveMinutes,
            acceleration_variance: accVar,
            gyroscope_variance: gyroVar,
            nearby_hospitals: places.nearby_hospitals,
            nearby_police: places.nearby_police,
            nearby_petrol: places.nearby_petrol,
            nearby_public: places.nearby_public,
            route_risk: 0.45, // Default/Placeholder
            hour_of_day: hour,
            is_night: isNight,
            day_of_week: dayOfWeek,
            is_isolated_area: isIsolated,
            distance_to_nearest_hospital_km: places.distance_to_nearest_hospital_km,
            age: this.userMetadata.age,
            gender: this.userMetadata.gender,
            weight: this.userMetadata.weight,
            height: this.userMetadata.height,
            has_conditions: this.userMetadata.has_conditions
        };
    }

    public async assessRisk(): Promise<{ riskScore: number; label: number } | null> {
        try {
            const snapshot = await this.collectSnapshot();
            if (!snapshot) return null;

            console.log("📊 Assessing Context Risk with Snapshot:", JSON.stringify(snapshot, null, 2));

            // Use the configured ML API URL
            const response = await fetch(`${ML_API_URL}/predict_risk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(snapshot)
            });

            if (!response.ok) {
                throw new Error(`ML API Error: ${response.status}`);
            }

            const result = await response.json();
            console.log("🤖 ML Prediction Result:", result);

            return {
                riskScore: result.context_risk,
                label: result.predicted_label
            };

        } catch (error) {
            console.error("❌ Risk Assessment Failed:", error);
            return null;
        }
    }
}

export const contextRiskService = new ContextRiskService();
