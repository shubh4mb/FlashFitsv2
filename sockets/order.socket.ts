import { getSocket, initSocket } from '@/config/socket';

let activeOrders: string[] = [];

// ── T&B Order Sockets ──

export const joinOrderRoom = async (orderId: string) => {
    const socket = await initSocket();

    if (!socket.connected) {
        return new Promise<void>((resolve) => {
            socket.once('connect', () => {
                if (!activeOrders.includes(orderId)) activeOrders.push(orderId);
                socket.emit('joinOrderRoom', orderId);
                resolve();
            });
            socket.connect();
        });
    }

    if (!activeOrders.includes(orderId)) activeOrders.push(orderId);
    socket.emit('joinOrderRoom', orderId);
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
