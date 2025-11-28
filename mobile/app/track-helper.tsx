import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useWebSocket } from '@/hooks/useWebSocket';

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_API_KEY = 'AIzaSyDWmZkfE6DvnNaf3nbPjgq8uOmBMg3d7_c';

export default function TrackHelperScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  
  const [helperLocation, setHelperLocation] = useState({
    latitude: parseFloat(params.helperLatitude as string),
    longitude: parseFloat(params.helperLongitude as string),
  });
  const [myLocation, setMyLocation] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');

  const helperName = params.helperName as string || 'Helper';

  // Get own location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      setMyLocation(location.coords);
    })();
  }, []);

  // Listen for helper updates
  useWebSocket((data) => {
    if (data.type === 'helper_location_update') {
      setHelperLocation({
        latitude: data.latitude,
        longitude: data.longitude,
      });
    }
  });

  // Calculate Route
  useEffect(() => {
    const fetchRoute = async () => {
      if (!myLocation || !helperLocation) return;

      try {
        const origin = `${helperLocation.latitude},${helperLocation.longitude}`;
        const destination = `${myLocation.latitude},${myLocation.longitude}`;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_MAPS_API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes.length > 0) {
          const points = decodePolyline(data.routes[0].overview_polyline.points);
          setRouteCoordinates(points);
          setDistance(data.routes[0].legs[0].distance.text);
          setDuration(data.routes[0].legs[0].duration.text);

          // Fit map
          mapRef.current?.fitToCoordinates([
            { latitude: helperLocation.latitude, longitude: helperLocation.longitude },
            { latitude: myLocation.latitude, longitude: myLocation.longitude }
          ], {
            edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
            animated: true
          });
        }
      } catch (error) {
        console.error('Error fetching route:', error);
      }
    };

    fetchRoute();
  }, [helperLocation, myLocation]);

  const decodePolyline = (encoded: string) => {
    const points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({ latitude: (lat / 1E5), longitude: (lng / 1E5) });
    }
    return points;
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
      >
        {/* Helper Marker */}
        <Marker
          coordinate={helperLocation}
          title={helperName}
          description="Coming to help you"
        >
          <View style={styles.helperMarker}>
            <Ionicons name="bicycle" size={24} color="#FFF" />
          </View>
        </Marker>

        {/* Route */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#8B2E5A"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      {/* Info Card */}
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={24} color="#FFF" />
          </View>
          <View>
            <Text style={styles.title}>Help is on the way!</Text>
            <Text style={styles.subtitle}>{helperName} is coming</Text>
          </View>
        </View>
        
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{duration || '--'}</Text>
            <Text style={styles.statLabel}>ETA</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{distance || '--'}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  helperMarker: {
    backgroundColor: '#8B2E5A',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  card: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 12,
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B2E5A',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#DDD',
  },
});
