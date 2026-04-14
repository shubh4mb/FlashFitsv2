import api from './axiosConfig';

export const fetchnewArrivalsProductsData = async (gender?: string, lat?: number, lng?: number) => {
    try {
        const res = await api.get('user/products/newArrivals', {
            params: { gender, lat, lng }
        });
        return res.data;
    } catch (error) {
    // Auth errors are ignored gracefully
        throw error;
    }
};

export const fetchTrendingProductsData = async (gender?: string, lat?: number, lng?: number) => {
    try {
        const res = await api.get('user/products/trending', {
            params: { gender, lat, lng }
        });
        return res.data;
    } catch (error) {
    // Auth errors are ignored gracefully
        throw error;
    }
};

export const fetchRecommendedProductsData = async (gender?: string, lat?: number, lng?: number) => {
    try {
        const res = await api.get('user/products/recommended', {
            params: { gender, lat, lng }
        });
        return res.data;
    } catch (error) {
    // Auth errors are ignored gracefully
        throw error;
    }
};

export const fetchBanners = async () => {
    try {
        const res = await api.get('user/banners');
        return res.data;
    } catch (error) {
    // Auth errors are ignored gracefully
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
    page?: number;
    limit?: number;
    gender?: string;
    deliveryMode?: 'tryAndBuy' | 'courier' | null;
    priceRange?: number[];
    selectedCategoryIds?: string[];
    subCategoryIds?: string[];
    selectedColors?: string[];
    selectedStores?: string[];
    sortBy?: string;
    collectionId?: string;
    lat?: number;
    lng?: number;
}) => {
    try {
        const res = await api.post('user/products/filtered', filters);
        return res.data;
    } catch (error) {
    // Auth errors are ignored gracefully
        throw error;
    }
};

/**
 * Fetch search suggestions (autocomplete) from backend.
 * Returns { suggestions: [{ text, type }] }
 */
export const fetchSearchSuggestions = async (query: string) => {
    try {
        const res = await api.get('user/products/search-suggestions', {
            params: { q: query }
        });
        return res.data;
    } catch (error) {
    // Auth errors are ignored gracefully
        throw error;
    }
};

/**
 * Fetch products from courier-enabled merchants (no distance limit)
 */
export const fetchCourierProducts = async (gender?: string, page: number = 1, lat?: number, lng?: number) => {
    try {
        const res = await api.get('user/products/courier', {
            params: { gender, page, limit: 20, lat, lng },
        });
        return res.data;
    } catch (error) {
    // Auth errors are ignored gracefully
        throw error;
    }
};

export const fetchRelatedProducts = async (id: string, lat?: number, lng?: number) => {
    try {
        const res = await api.get(`user/products/${id}/related`, {
            params: { lat, lng }
        });
        return res.data;
    } catch (error) {
    // Auth errors are ignored gracefully
        throw error;
    }
};

export const fetchProductsByCollection = async (merchantId: string, collectionId: string) => {
    try {
        const res = await api.get('user/products/collection', {
            params: { merchantId, collectionId }
        });
        return res.data;
    } catch (error) {
    // Auth errors are ignored gracefully
        throw error;
    }
};
export const fetchProductsByMerchant = async (merchantId: string) => {
    try {
        const res = await api.get(`user/products/merchant/${merchantId}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching merchant products:', error);
        throw error;
    }
};
