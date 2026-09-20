import api from './axiosConfig';

/**
 * Fetches all active categories from the backend.
 * Although the route is under /admin/, it is currently used by the 
 * user-facing app to retrieve the category hierarchy.
 */
export const fetchCategories = async (params?: { onlyWithProducts?: boolean; includeProductInfo?: boolean; gender?: string }) => {
    try {
        const res = await api.get('admin/getCategories', { params });
        // Backend returns ApiResponse(200, { categories }, "Categories retrieved")
        // which gives { statusCode: 200, data: { categories: [...] }, message: "...", success: true }
        return res.data?.data || res.data;
    } catch (error) {
    // Auth errors are ignored gracefully
        throw error;
    }
};

export const fetchCategoryById = async (id: string) => {
    try {
        const res = await api.get(`admin/getCategoryById/${id}`);
        return res.data?.data || res.data;
    } catch (error) {
        console.error(`Axios error in fetchCategoryById (${id}):`, error);
        throw error;
    }
};
