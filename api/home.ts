import api from './axiosConfig';

export const fetchHomeFeedData = async (gender?: string, lat?: number, lng?: number) => {
    try {
        const res = await api.get('user/home-feed', {
            params: { gender, lat, lng }
        });
        return res.data;
    } catch (error) {
        // Auth errors are handled gracefully by axios interceptors
        throw error;
    }
};
