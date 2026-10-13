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

type OrderCallback = (data: any) => void;
const orderListeners = new Set<OrderCallback>();
let isSocketListening = false;

const dispatchToListeners = (data: any) => {
    orderListeners.forEach((cb) => {
        try {
            cb(data);
        } catch (err) {
            console.error('Error in order listener callback:', err);
        }
    });
};

/**
 * Dispatch an order update locally across the app (optimistic update without waiting for network/socket)
 */
export const notifyLocalOrderUpdate = (data: any) => {
    console.log('📣 Local order update dispatched:', data);
    dispatchToListeners(data);
};

const setupGlobalSocketListeners = (socket: any) => {
    if (isSocketListening) return;
    isSocketListening = true;

    socket.on('orderUpdate', (updateData: any) => {
        console.log('📦 Order update received via socket:', updateData);
        dispatchToListeners(updateData);
    });

    socket.on('orderCancelled', (cancelData: any) => {
        console.log('🚫 Order cancelled received via socket:', cancelData);
        const enriched = {
            ...cancelData,
            orderStatus: 'cancelled',
            customerDeliveryStatus: 'cancelled',
            deliveryRiderStatus: 'cancelled',
            isCancelled: true,
            _id: cancelData?.orderId || cancelData?._id,
        };
        dispatchToListeners(enriched);
    });

    socket.on('trialPhaseStart', (data: any) => {
        dispatchToListeners(data);
    });
    socket.on('trialPhaseEnded', (data: any) => {
        dispatchToListeners(data);
    });
    socket.on('cashCollected', (data: any) => {
        dispatchToListeners(data);
    });
    socket.on('photoVerified', (data: any) => {
        dispatchToListeners(data);
    });
};

export const listenOrderUpdates = async (callback: OrderCallback) => {
    orderListeners.add(callback);
    const socket = await initSocket();
    setupGlobalSocketListeners(socket);

    // Return unsubscribe function
    return () => {
        orderListeners.delete(callback);
    };
};

export const removeOrderListeners = (callback?: OrderCallback) => {
    if (callback) {
        orderListeners.delete(callback);
    } else {
        orderListeners.clear();
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
