import { getSocket, initSocket } from '@/config/socket';

let activeOrders: string[] = [];

// ── T&B Order Sockets ──

export const joinOrderRoom = async (orderId: string) => {
    if (!orderId) return;
    const cleanId = String(orderId).replace(/^["']|["']$/g, '').trim();
    const socket = await initSocket();

    if (!socket.connected) {
        return new Promise<void>((resolve) => {
            socket.once('connect', () => {
                if (!activeOrders.includes(cleanId)) activeOrders.push(cleanId);
                socket.emit('joinOrderRoom', cleanId);
                if (orderId !== cleanId) socket.emit('joinOrderRoom', orderId);
                resolve();
            });
            socket.connect();
        });
    }

    if (!activeOrders.includes(cleanId)) activeOrders.push(cleanId);
    socket.emit('joinOrderRoom', cleanId);
    if (orderId !== cleanId) socket.emit('joinOrderRoom', orderId);
};

export const leaveOrderRoom = async (orderId: string) => {
    if (!orderId) return;
    const cleanId = String(orderId).replace(/^["']|["']$/g, '').trim();
    const socket = getSocket();
    if (socket) {
        socket.emit('leaveOrderRoom', cleanId);
        if (orderId !== cleanId) socket.emit('leaveOrderRoom', orderId);
    }
    activeOrders = activeOrders.filter((id) => id !== cleanId && id !== orderId);
};

export const listenOrderUpdates = async (callback: (data: any) => void) => {
    const socket = await initSocket();
    socket.off('orderUpdate');
    socket.off('trialPhaseStart');

    socket.on('orderUpdate', (updateData: any) => {
        console.log('📦 Order update:', updateData);
        callback(updateData);
    });
};

export const removeOrderListeners = () => {
    const socket = getSocket();
    if (socket) {
        socket.off('orderUpdate');
        socket.off('trialPhaseStart');
    }
};

export const setupRejoinOnReconnect = async () => {
    const socket = await initSocket();
    socket.on('reconnect', () => {
        activeOrders.forEach((orderId) => {
            socket.emit('joinOrderRoom', orderId);
        });
    });
};

export const listenRiderLocation = async (callback: (data: { riderId: string; lat: number; lng: number; ts: number }) => void) => {
    const socket = await initSocket();
    socket.off('riderLocationUpdate');
    socket.on('riderLocationUpdate', (data: any) => {
        callback(data);
    });
};

export const removeRiderLocationListener = () => {
    const socket = getSocket();
    if (socket) {
        socket.off('riderLocationUpdate');
    }
};
