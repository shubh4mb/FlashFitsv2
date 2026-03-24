import api from './axiosConfig';

/**
 * Adds a product to the backend recently viewed list.
 */
export const addToRecentlyViewedApi = async (productId: string, variantId: string) => {
  try {
    const res = await api.post('user/recently-viewed/add', { productId, variantId });
    return res.data;
  } catch (error) {
    console.error('Axios error in addToRecentlyViewedApi:', error);
    throw error;
  }
};

/**
 * Retrieves the user's recently viewed products from the backend.
 */
export const getRecentlyViewedApi = async () => {
  try {
    const res = await api.get('user/recently-viewed/my');
    return res.data;
  } catch (error) {
    console.error('Axios error in getRecentlyViewedApi:', error);
    throw error;
  }
};
