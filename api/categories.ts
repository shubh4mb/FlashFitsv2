import api from './axiosConfig';

/**
 * Fetches all active categories from the backend.
 * Although the route is under /admin/, it is currently used by the 
 * user-facing app to retrieve the category hierarchy.
 */
export const fetchCategories = async () => {
    try {
        const res = await api.get('admin/getCategories');
        // Based on backend response structure: 
        // return res.status(200).json(new ApiResponse(200, { categories }, "Categories retrieved"));
        return res.data;
    } catch (error) {
    // Auth errors are ignored gracefully
        throw error;
    }
};

export const fetchCategoryById = async (id: string) => {
    try {
        const res = await api.get(`admin/getCategoryById/${id}`);
        return res.data;
    } catch (error) {
        console.error(`Axios error in fetchCategoryById (${id}):`, error);
        throw error;
    }
};
