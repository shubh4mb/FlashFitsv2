import api from './axiosConfig';

/**
 * Fetches all active merchants from the backend.
 */
export const fetchMerchants = async () => {
    try {
        const res = await api.get('admin/getMerchants');
        // Expected response structure:
        // return res.status(200).json(new ApiResponse(200, { merchants }, "Merchants retrieved successfully"));
        return res.data;
    } catch (error) {
        console.error('Axios error in fetchMerchants:', error);
        throw error;
    }
};

export const fetchMerchantById = async (id: string) => {
    try {
        // Backend route in admin.routes.js is /getMerchant/:id
        const res = await api.get(`admin/getMerchant/${id}`);
        return res.data;
    } catch (error) {
        console.error(`Axios error in fetchMerchantById (${id}):`, error);
        throw error;
    }
};
