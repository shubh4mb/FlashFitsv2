import Constants from 'expo-constants';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL || 'https://ff-api-web-2.onrender.com';

let socket: Socket | null = null;

export const initSocket = async (): Promise<Socket> => {
    const userId = await SecureStore.getItemAsync('userId');
    const role = 'user';

    if (!socket) {
        socket = io(BACKEND_URL, {
            transports: ['websocket'],
            query: { userId: userId || '', role },
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket?.id);
        });

        socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
        });

        socket.on('connect_error', (error: Error) => {
            console.error('Socket connection error:', error.message);
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('🔌 Socket disconnected manually');
    }
};

export const getSocket = () => socket;
