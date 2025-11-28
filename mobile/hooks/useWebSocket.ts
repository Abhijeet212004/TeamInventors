import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useWebSocket = (onSOSAlert?: (data: any) => void) => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Monitor AsyncStorage for userId changes
    useEffect(() => {
        const checkUserId = async () => {
            try {
                // Try getting 'userId' first
                let id = await AsyncStorage.getItem('userId');
                
                // If not found, try getting 'user' object
                if (!id) {
                    const userStr = await AsyncStorage.getItem('user');
                    if (userStr) {
                        const user = JSON.parse(userStr);
                        id = user.id;
                    }
                }

                if (id && id !== userId) {
                    console.log('📝 UserId detected:', id);
                    setUserId(id);
                }
            } catch (error) {
                console.error('Error checking user ID:', error);
            }
        };

        // Check immediately
        checkUserId();

        // Check periodically (every 2 seconds) for userId
        const interval = setInterval(checkUserId, 2000);

        return () => clearInterval(interval);
    }, [userId]);

    // Initialize WebSocket
    useEffect(() => {
        let socket: Socket | null = null;

        const initSocket = () => {
            if (socketRef.current?.connected) {
                console.log('⚠️  Socket already connected');
                return;
            }

            console.log('🔌 Initializing WebSocket connection to:', SOCKET_URL);

            socket = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 10,
                timeout: 20000
            });

            socket.on('connect', () => {
                console.log('✅ WebSocket connected! Socket ID:', socket?.id);
                setIsConnected(true);
            });

            socket.on('disconnect', (reason) => {
                console.log('❌ WebSocket disconnected. Reason:', reason);
                setIsConnected(false);
            });

            socket.on('sos_alert', (data) => {
                console.log('🚨🚨🚨 SOS ALERT RECEIVED VIA WEBSOCKET! 🚨🚨🚨');
                console.log('Alert data:', JSON.stringify(data, null, 2));
                if (onSOSAlert) {
                    onSOSAlert(data);
                } else {
                    console.warn('⚠️  onSOSAlert callback not provided!');
                }
            });

            socket.on('crowd_alert', (data) => {
                console.log('🛡️🛡️🛡️ CROWD ALERT RECEIVED VIA WEBSOCKET! 🛡️🛡️🛡️');
                console.log('Alert data:', JSON.stringify(data, null, 2));
                if (onSOSAlert) {
                    onSOSAlert(data);
                } else {
                    console.warn('⚠️  onSOSAlert callback not provided!');
                }
            });

            socket.on('help_accepted', (data) => {
                console.log('🤝 HELP ACCEPTED RECEIVED VIA WEBSOCKET! 🤝');
                console.log('Data:', JSON.stringify(data, null, 2));
                if (onSOSAlert) {
                    // Ensure type is present for _layout.tsx handling
                    onSOSAlert({ ...data, type: 'help_accepted' });
                }
            });

            socket.on('connect_error', (error) => {
                console.error('❌ WebSocket connection error:', error.message);
            });

            socket.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
            });

            socketRef.current = socket;
            console.log('✅ WebSocket initialization complete');
        };

        initSocket();

        return () => {
            if (socketRef.current) {
                console.log('🔌 Cleaning up WebSocket connection');
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
        };
    }, []);

    // Re-register when userId becomes available or connection is established
    useEffect(() => {
        if (userId && isConnected && socketRef.current) {
            console.log(`🔄 Registering user ${userId} with WebSocket (Connected: ${isConnected})`);
            socketRef.current.emit('register', userId);
            console.log(`✅ User ${userId} registration event sent`);
        }
    }, [userId, isConnected]);

    return socketRef.current;
};
