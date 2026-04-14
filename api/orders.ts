import api from './axiosConfig';

// ── T&B Orders ──

export const getAllOrders = async () => {
    try {
        const res = await api.get("/user/order/getAllOrders");
        return res.data.orders;
    } catch (error) {
        console.log(error, "error");
        throw error;
    }
};

export const getOrderById = async (orderId: string) => {
    const response = await api.get(`/user/order/${orderId}`);
    return response.data;
};

/**
 * Create Razorpay order for T&B checkout
 * Returns razorpayOrderId, key_id, amount, orderId etc.
 */
export const createRazorpayOrder = async (addressId: string, deliveryTip: number = 0, couponCode?: string, merchantId?: string) => {
    try {
        const res = await api.post('/user/order/create', { addressId, deliveryTip, couponCode, merchantId });
        return res.data;
    } catch (error: any) {
        console.error('Create Razorpay order error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Verify T&B payment after Razorpay checkout
 */
export const verifyPayment = async (params: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    orderId: string;
}) => {
    try {
        const res = await api.post('/user/order/verifyPayment', params);
        return res.data;
    } catch (error: any) {
        console.error('Verify payment error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Cancel a T&B order
 */
export const cancelOrder = async (orderId: string) => {
    try {
        const res = await api.post(`/user/order/cancel/${orderId}`);
        return res.data;
    } catch (error: any) {
        console.error('Cancel order error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Confirm cloth selection (Keep/Return) — initiateReturn
 */
export const confirmClothSelection = async (payload: { orderId: string; items: any[] }) => {
    try {
        const res = await api.post(`/user/order/initiateReturn/${payload.orderId}`, payload);
        return res.data;
    } catch (error: any) {
        console.error('Confirm selection error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Create a final Razorpay order for kept items (T&B flow)
 * Sends items with tryStatus to backend, gets Razorpay order details back
 */
export const finalpaymentInitiate = async (payload: { orderId: string; items: any[] }) => {
    try {
        const { orderId, items } = payload;
        const res = await api.post(
            `/user/order/createFinalPaymentOrder/${orderId}`,
            { items }
        );
        return res.data;
    } catch (error: any) {
        console.error('Final payment initiate error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Verify Razorpay final payment for T&B order
 */
export const finalPaymentVerify = async (paymentData: any, internalOrderId: string) => {
    try {
        const response = await api.post('user/order/verifyFinalPayment', {
            razorpay_order_id: paymentData.razorpay_order_id,
            razorpay_payment_id: paymentData.razorpay_payment_id,
            razorpay_signature: paymentData.razorpay_signature,
            orderId: internalOrderId,
        });
        return response.data;
    } catch (error: any) {
        console.error('Final payment verify error:', error.response?.data || error.message);
        throw error;
    }
};

// ── Courier Orders ──

/**
 * Initiate a courier order (creates real Razorpay order)
 * Returns razorpayOrderId, key_id, amount, orderId, isFreeOrder etc.
 */
export const initiateCourierOrder = async (merchantId: string, addressId: string, deliveryTip: number = 0, couponCode?: string) => {
    try {
        const res = await api.post('/courier/orders/initiate', { merchantId, addressId, deliveryTip, couponCode });
        return res.data;
    } catch (error: any) {
        console.error('Initiate courier order error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Verify courier order payment — requires Razorpay signature
 */
export const verifyCourierOrderPayment = async (params: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    orderId: string;
}) => {
    try {
        const res = await api.post('/courier/orders/verify', params);
        return res.data;
    } catch (error: any) {
        console.error('Verify courier payment error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Get all courier orders for the user
 */
export const getCourierOrders = async () => {
    try {
        const res = await api.get('/courier/orders');
        return res.data.orders;
    } catch (error) {
        console.error('Get courier orders error:', error);
        throw error;
    }
};

/**
 * Get single courier order by ID
 */
export const getCourierOrderById = async (orderId: string) => {
    try {
        const res = await api.get(`/courier/orders/${orderId}`);
        return res.data;
    } catch (error) {
        console.error('Get courier order error:', error);
        throw error;
    }
};

/**
 * Cancel a courier order
 */
export const cancelCourierOrder = async (orderId: string) => {
    try {
        const res = await api.post(`/courier/orders/cancel/${orderId}`);
        return res.data;
    } catch (error: any) {
        console.error('Cancel courier order error:', error.response?.data || error.message);
        throw error;
    }
};
