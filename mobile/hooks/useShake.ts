import { useState, useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import { Platform } from 'react-native';

export const useShake = (onShake: () => void, intensity = 2.5) => {
  const [subscription, setSubscription] = useState<any>(null);
  
  // Shake detection variables
  const lastShake = useRef(0);
  const shakeCount = useRef(0);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const lastZ = useRef(0);

  useEffect(() => {
    // Only enable on physical devices (simulators don't have accelerometers usually)
    // But we can't easily check isDevice here without importing expo-device. 
    // Accelerometer.isAvailableAsync() is better.

    const startListening = async () => {
        const isAvailable = await Accelerometer.isAvailableAsync();
        if (!isAvailable) return;

        setSubscription(
            Accelerometer.addListener(accelerometerData => {
            const { x, y, z } = accelerometerData;
            
            // Calculate total acceleration change
            // We use change from last reading to detect sudden movement
            const change = Math.abs(x - lastX.current) + Math.abs(y - lastY.current) + Math.abs(z - lastZ.current);
            
            if (change > intensity) {
                const now = Date.now();
                
                // Debounce: ignore shakes that are too close (e.g., < 250ms)
                if (now - lastShake.current > 250) {
                    // If time since last shake is too long (e.g. > 1.5s), reset count
                    if (now - lastShake.current > 1500) {
                        shakeCount.current = 1; // Start new sequence
                    } else {
                        shakeCount.current += 1;
                    }
                    
                    lastShake.current = now;
                    console.log(`📳 Shake detected! Count: ${shakeCount.current}`);

                    if (shakeCount.current >= 3) {
                        console.log('🚨 Shake SOS Triggered!');
                        onShake();
                        shakeCount.current = 0; // Reset after trigger
                    }
                }
            }
            
            lastX.current = x;
            lastY.current = y;
            lastZ.current = z;
            })
        );
        
        Accelerometer.setUpdateInterval(100); // Check every 100ms
    };

    startListening();

    return () => {
      subscription && subscription.remove();
    };
  }, []);
};
