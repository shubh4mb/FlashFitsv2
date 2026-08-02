import api from './axiosConfig';

/**
 * Fetches all active nearby merchants from the backend.
 */
export const fetchMerchants = async (lat?: number, lng?: number, gender?: string, strict: boolean = false) => {
    try {
        const res = await api.get('user/merchants/nearby', {
            params: { lat, lng, gender, strict }
        });
        // Expected response structure:
        // return res.status(200).json(new ApiResponse(200, { merchants }, "Merchants retrieved successfully"));
        return res.data;
    } catch (error) {
    // Auth errors are ignored gracefully
        throw error;
    }
};

export const fetchMerchantById = async (id: string, lat?: number, lng?: number) => {
    if (!id || id === 'flashmart' || id.includes('warehouse') || id.length !== 24) {
        return null;
    }
    try {
        // Backend route in admin.routes.js is /getMerchant/:id
        const res = await api.get(`admin/getMerchant/${id}`, {
            params: { lat, lng }
        });
        return res.data;
    } catch (error: any) {
        if (error?.response?.status !== 404) {
            console.error(`Axios error in fetchMerchantById (${id}):`, error);
        }
        throw error;
    }
};
