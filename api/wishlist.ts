import api from './axiosConfig';

/**
 * Adds a product variant to the wishlist.
 */
export const addToWishlist = async (productId: string, variantId: string) => {
    try {
        const res = await api.post('user/wishlist/add', { productId, variantId });
        return res.data;
    } catch (error) {
        console.error('Axios error in addToWishlist:', error);
        throw error;
    }
};

export const removeFromWishlist = async (wishlistItemId: string) => {
    try {
        const res = await api.delete(`user/wishlist/delete/${wishlistItemId}`);
        return res.data;
    } catch (error) {
        console.error('Axios error in removeFromWishlist:', error);
        throw error;
    }
};

export const getMyWishlist = async () => {
    try {
        const res = await api.get('user/wishlist/my');
        return res.data;
    } catch (error) {
        console.error('Axios error in getMyWishlist:', error);
        throw error;
    }
};

export const getMyWishlistIds = async () => {
    try {
        const res = await api.get('user/wishlist/ids');
        return res.data;
    } catch (error) {
        console.error('Axios error in getMyWishlistIds:', error);
        throw error;
    }
};
