import api from './axiosConfig';

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
    const response = await api.get(`/user/orders/${orderId}`);
    return response.data;
};
