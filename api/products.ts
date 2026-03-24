import api from './axiosConfig';

export const fetchnewArrivalsProductsData = async (gender?: string) => {
    try {
        const res = await api.get('user/products/newArrivals', {
            params: { gender }
        });
        return res.data;
    } catch (error) {
        console.error('Axios error in new arrivals:', error);
        throw error;
    }
};

export const fetchTrendingProductsData = async (gender?: string) => {
    try {
        const res = await api.get('user/products/trending', {
            params: { gender }
        });
        return res.data;
    } catch (error) {
        console.error('Axios error in trending:', error);
        throw error;
    }
};

export const fetchRecommendedProductsData = async (gender?: string) => {
    try {
        const res = await api.get('user/products/recommended', {
            params: { gender }
        });
        return res.data;
    } catch (error) {
        console.error('Axios error in recommended:', error);
        throw error;
    }
};

export const fetchBanners = async () => {
    try {
        const res = await api.get('user/banners');
        return res.data;
    } catch (error) {
        console.error('Axios error in banners:', error);
        throw error;
    }
};

export const productDetailPage = async (id: string) => {
    try {
        const response = await api.get(`user/products/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching product:', error);
        throw error;
    }
};

export const fetchFilteredProducts = async (filters: {
    search?: string;
    priceRange?: number[];
    selectedCategoryIds?: string[];
    selectedColors?: string[];
    selectedStores?: string[];
    sortBy?: string;
}) => {
    try {
        const res = await api.post('user/products/filtered', filters);
        return res.data;
    } catch (error) {
        console.error('Axios error in filtered products:', error);
        throw error;
    }
};

