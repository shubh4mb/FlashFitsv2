import { addToRecentlyViewedApi, getRecentlyViewedApi } from '../api/recentlyViewed';

export interface Product {
  id?: string;
  _id?: string;
  name: string;
  price: number;
  mrp?: number;
  images?: { url: string }[];
  ratings?: number | string;
  isTriable?: boolean;
  variants?: any[];
  variantId?: string;
}

/**
 * Adds a product to the recently viewed list in the backend.
 */
export const addToRecentlyViewed = async (product: Product) => {
  try {
    const productId = product._id || product.id;
    const variantId = product.variantId;

    if (!productId || !variantId) {
      console.warn('Cannot add to recently viewed: missing productId or variantId');
      return;
    }

    await addToRecentlyViewedApi(productId, variantId);
  } catch (e) {
    console.error('Error saving recently viewed product to backend:', e);
  }
};

/**
 * Retrieves the list of recently viewed products from the backend.
 */
export const getRecentlyViewed = async (): Promise<Product[]> => {
  try {
    const response = await getRecentlyViewedApi();
    // The backend already returns the mapped product format from the controller
    return response || [];
  } catch (e) {
    console.error('Error reading recently viewed products from backend:', e);
    return [];
  }
};

/**
 * Clears all recently viewed products (Optional/Placeholder for now as backend might need an endpoint)
 */
export const clearRecentlyViewed = async () => {
  // This would require a backend endpoint to clear. 
  // For now, we can just leave it or implement it if needed later.
  console.log('clearRecentlyViewed called - backend implementation pending');
};
