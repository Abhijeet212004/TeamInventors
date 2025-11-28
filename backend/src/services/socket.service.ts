import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';

export class SocketService {
    private io: Server | null = null;
    private userSockets: Map<string, string> = new Map(); // userId -> socketId

    initialize(httpServer: HTTPServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        this.io.on('connection', (socket) => {
            console.log(`🔌 Socket connected: ${socket.id}`);

            // Register user with their socket
            socket.on('register', (userId: string) => {
                this.userSockets.set(userId, socket.id);
                socket.join(`user:${userId}`);
                console.log(`✅ User ${userId} registered with socket ${socket.id}`);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                // Remove user from map
                for (const [userId, socketId] of this.userSockets.entries()) {
                    if (socketId === socket.id) {
                        this.userSockets.delete(userId);
                        console.log(`❌ User ${userId} disconnected`);
                        break;
                    }
                }
            });

            // Handle response to SOS (Helper -> Victim)
            socket.on('respond_to_sos', (data: { victimId: string, helperId: string, helperName: string, latitude: number, longitude: number }) => {
                console.log(`🚑 User ${data.helperId} is responding to Victim ${data.victimId}`);
                
                const victimSocketId = this.userSockets.get(data.victimId);
                if (victimSocketId) {
                    this.io!.to(victimSocketId).emit('help_accepted', data);
                    console.log(`  ✅ Notified victim ${data.victimId} that help is coming`);
                } else {
                    console.log(`  ⚠️ Victim ${data.victimId} not connected`);
                }
            });

            // Handle helper location update (Helper -> Victim)
            socket.on('update_helper_location', (data: { victimId: string, latitude: number, longitude: number }) => {
                const victimSocketId = this.userSockets.get(data.victimId);
                if (victimSocketId) {
                    this.io!.to(victimSocketId).emit('helper_location_update', data);
                }
            });
        });

        console.log('✅ WebSocket server initialized');
    }

    // Send SOS alert to specific users
    sendSOSAlert(userIds: string[], data: {
        type: string;
        latitude: number;
        longitude: number;
        userId: string;
        userName: string;
    }) {
        if (!this.io) {
            console.error('Socket.io not initialized');
            return;
        }

        console.log(`📡 Broadcasting SOS to ${userIds.length} users`);

        userIds.forEach(userId => {
            const socketId = this.userSockets.get(userId);
            if (socketId) {
                this.io!.to(socketId).emit('sos_alert', data);
                console.log(`  ✅ Sent SOS to user ${userId} (socket: ${socketId})`);
            } else {
                console.log(`  ⚠️  User ${userId} not connected via WebSocket`);
            }
        });
    }

    // Send Crowd Shield alert to nearby users
    sendCrowdAlert(userIds: string[], data: {
        type: string;
        latitude: number;
        longitude: number;
        userId: string;
        distance: number; // Distance to the victim
    }) {
        if (!this.io) {
            console.error('Socket.io not initialized');
            return;
        }

        console.log(`🛡️ Broadcasting Crowd Shield Alert to ${userIds.length} nearby users`);

        userIds.forEach(userId => {
            const socketId = this.userSockets.get(userId);
            if (socketId) {
                this.io!.to(socketId).emit('crowd_alert', data);
                console.log(`  ✅ Sent Crowd Alert to user ${userId} (socket: ${socketId})`);
            } else {
                console.log(`  ⚠️  User ${userId} not connected via WebSocket`);
                console.log(`  ℹ️  Current connected users: ${Array.from(this.userSockets.keys()).join(', ')}`);
            }
        });
    }

    getIO() {
        return this.io;
    }
}

// Singleton instance
export const socketService = new SocketService();
